import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLowBalanceEmail, sendSubscriptionExpiryReminderEmail, sendReferralCompletedEmail, sendPointsExpiryEmail } from '../../../lib/email'
import { sendSubscriptionExpiry, notifyReferralCompleted, notifyPointsExpiring, notifyAdmin } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Called daily by Vercel Cron at 18:30 UTC (midnight IST)
// GET /api/cron/deduct-subscriptions
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runDeductions()
}

// Also accepts POST so the admin panel can trigger it manually via fetch
export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runDeductions()
}

async function runDeductions() {
  // Always use IST for the daily date so it matches subscription dates stored by users in IST
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Auto-deactivate expired fixed subscriptions
  try {
    const { data: expiredSubs } = await supabase
      .from('subscriptions')
      .select('id, user_id, end_date')
      .eq('is_active', true)
      .eq('subscription_type', 'fixed')
      .lt('end_date', today)

    for (const sub of expiredSubs || []) {
      await supabaseAdmin.from('subscriptions').update({ is_active: false }).eq('id', sub.id)
      await notifyAdmin(
        'Subscription Expired',
        `📅 Fixed subscription #${sub.id} has expired (end date: ${sub.end_date}). Auto-deactivated.`
      ).catch(() => {})
    }
  } catch { /* must not block cron */ }

  // Low balance alerts for active ongoing subscribers
  try {
    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('user_id, products(price), quantity, discount_percent, subscription_type')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)

    const userAlerted = new Set()
    for (const sub of activeSubs || []) {
      if (userAlerted.has(sub.user_id) || sub.subscription_type === 'fixed') continue
      userAlerted.add(sub.user_id)
      const dailyAmount = Math.round((sub.products?.price || 0) * sub.quantity * (1 - (sub.discount_percent || 0) / 100))
      if (!dailyAmount) continue
      const threshold = dailyAmount * 7
      const { data: wallet } = await supabaseAdmin.from('wallet').select('balance').eq('user_id', sub.user_id).maybeSingle()
      const balance = wallet?.balance || 0
      if (balance > 0 && balance < threshold) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
        const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', sub.user_id).single()
        const email = authUser?.user?.email
        if (email) await sendLowBalanceEmail({ to: email, name: profile?.full_name || 'Customer', balance }).catch(() => {})
      }
    }
  } catch { /* must not block cron */ }

  // Admin notification if no deliveries were confirmed yesterday
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { count: activeCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: deliveryCount } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'debit')
      .like('description', `%[${yesterdayStr}]`)

    if ((activeCount || 0) > 0 && (deliveryCount || 0) === 0) {
      await notifyAdmin(
        'No Deliveries Yesterday',
        `⚠️ No deliveries were confirmed on ${yesterdayStr}. Please check if deliveries are being marked in the admin panel.`
      ).catch(() => {})
    }
  } catch { /* must not block cron */ }

  // ── Reset pause_days_used_this_month on the 1st of each month ────────────────
  try {
    const dayOfMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).split('-')[2]
    if (dayOfMonth === '01') {
      await supabase
        .from('subscriptions')
        .update({ pause_days_used_this_month: 0 })
        .eq('is_active', true)
    }
  } catch { /* non-blocking */ }

  // ── Referral completion check: award 100 pts to both after 30 subscription days ──
  try {
    const { data: pendingReferrals } = await supabase
      .from('referrals')
      .select('id, referrer_id, referred_id, subscription_days_count, profiles!referrals_referred_id_fkey(full_name)')
      .eq('status', 'pending')

    for (const ref of pendingReferrals || []) {
      // Check if referred user has an active subscription today
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', ref.referred_id)
        .eq('is_active', true)
        .maybeSingle()

      if (!activeSub) continue

      const newCount = (ref.subscription_days_count || 0) + 1

      if (newCount >= 30) {
        // Award 100 points to both
        const REFERRAL_POINTS = 100
        const referredName = ref.profiles?.full_name || 'Your referral'

        // Award referrer
        const { data: referrerProf } = await supabase
          .from('profiles')
          .select('loyalty_points, full_name, phone, email')
          .eq('id', ref.referrer_id)
          .single()
        const { data: referrerAuth } = await supabaseAdmin.auth.admin.getUserById(ref.referrer_id)
        await supabaseAdmin.from('profiles').update({
          loyalty_points: (referrerProf?.loyalty_points || 0) + REFERRAL_POINTS,
        }).eq('id', ref.referrer_id)

        // Award referee
        const { data: referredProf } = await supabase
          .from('profiles')
          .select('loyalty_points, full_name, phone, email')
          .eq('id', ref.referred_id)
          .single()
        const { data: referredAuth } = await supabaseAdmin.auth.admin.getUserById(ref.referred_id)
        await supabaseAdmin.from('profiles').update({
          loyalty_points: (referredProf?.loyalty_points || 0) + REFERRAL_POINTS,
        }).eq('id', ref.referred_id)

        // Mark referral completed
        await supabaseAdmin.from('referrals').update({
          status: 'completed',
          referral_activated_at: new Date().toISOString(),
          subscription_days_count: newCount,
        }).eq('id', ref.id)

        // Notify both — non-blocking
        try {
          const referrerEmail = referrerAuth?.user?.email || referrerProf?.email
          const referredEmail = referredAuth?.user?.email || referredProf?.email
          if (referrerEmail) await sendReferralCompletedEmail({ to: referrerEmail, name: referrerProf?.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referredName })
          if (referredEmail) await sendReferralCompletedEmail({ to: referredEmail, name: referredProf?.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referrerProf?.full_name || 'Your referrer' })
          if (referrerProf?.phone) await notifyReferralCompleted({ phone: referrerProf.phone, name: referrerProf.full_name || 'Customer', points: REFERRAL_POINTS })
          if (referredProf?.phone) await notifyReferralCompleted({ phone: referredProf.phone, name: referredProf.full_name || 'Customer', points: REFERRAL_POINTS })
        } catch { /* non-blocking */ }
      } else {
        // Increment counter
        await supabaseAdmin.from('referrals').update({ subscription_days_count: newCount }).eq('id', ref.id)
      }
    }
  } catch { /* referral check must not block cron */ }

  // ── Loyalty points expiry check ───────────────────────────────────────────────
  try {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const in30DaysStr = in30Days.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    // Expire any points whose expiry date has passed
    const { data: expiredProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, loyalty_points_expiry')
      .not('loyalty_points_expiry', 'is', null)
      .lte('loyalty_points_expiry', today)
      .gt('loyalty_points', 0)

    for (const prof of expiredProfiles || []) {
      await supabaseAdmin.from('profiles').update({ loyalty_points: 0, loyalty_points_expiry: null }).eq('id', prof.id)
    }

    // Notify customers whose points expire in exactly 30 days
    const { data: expiringProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, loyalty_points, loyalty_points_expiry')
      .eq('loyalty_points_expiry', in30DaysStr)
      .gt('loyalty_points', 0)

    for (const prof of expiringProfiles || []) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prof.id)
        const email = authUser?.user?.email
        if (email) await sendPointsExpiryEmail({ to: email, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry })
        if (prof.phone) await notifyPointsExpiring({ phone: prof.phone, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry })
      } catch { /* non-blocking */ }
    }
  } catch { /* expiry check must not block cron */ }

  // ── Subscription expiry reminders (3-day warning for fixed subs) ──────────
  try {
    const in3Days = new Date()
    in3Days.setDate(in3Days.getDate() + 3)
    const in3DaysStr = in3Days.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { data: expiringSubs } = await supabase
      .from('subscriptions')
      .select('id, user_id, products(size), end_date')
      .eq('is_active', true)
      .eq('end_date', in3DaysStr)

    for (const sub of expiringSubs || []) {
      try {
        const { data: expiryProfile } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', sub.user_id)
          .single()
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
        const email = authUser?.user?.email || expiryProfile?.email
        const name = expiryProfile?.full_name || email || 'Customer'
        const product = sub.products?.size || 'Milk'
        const endDateLabel = new Date(sub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

        if (email) {
          await sendSubscriptionExpiryReminderEmail({ to: email, name, product, endDate: endDateLabel, daysLeft: 3 })
        }
        if (expiryProfile?.phone) {
          await sendSubscriptionExpiry(expiryProfile.phone, name, endDateLabel, product)
        }
      } catch {
        // Expiry notification failure must not block cron
      }
    }
  } catch {
    // Expiry check failure must not block cron
  }

  return NextResponse.json({ date: today, summary: 'daily cron complete' })
}
