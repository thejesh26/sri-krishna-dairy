import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { getISTDate } from '../../../lib/pricing'
import { sendLowBalanceEmail, sendSubscriptionExpiryReminderEmail, sendReferralCompletedEmail, sendPointsExpiryEmail } from '../../../lib/email'
import { sendSubscriptionExpiry, notifyReferralCompleted, notifyPointsExpiring, notifyAdmin } from '../../../lib/whatsapp'

// Called daily by Vercel Cron at 18:30 UTC (midnight IST)
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runDeductions()
}

// Also accepts POST so the admin panel can trigger it manually
export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runDeductions()
}

async function runDeductions() {
  const today = getISTDate()

  // ── 1. Auto-deactivate expired fixed subscriptions ───────────────────────────
  try {
    const { data: expiredSubs } = await supabaseAdmin
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

  // ── 2. Low balance alerts (batched — 2 queries instead of N×2) ──────────────
  try {
    const { data: activeSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, products(price), quantity, discount_percent')
      .eq('is_active', true)
      .eq('subscription_type', 'ongoing')
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)

    // One sub per user (first match wins)
    const userSubMap = {}
    for (const sub of activeSubs || []) {
      if (!userSubMap[sub.user_id]) userSubMap[sub.user_id] = sub
    }
    const userIds = Object.keys(userSubMap)

    if (userIds.length) {
      const [{ data: wallets }, { data: profiles }] = await Promise.all([
        supabaseAdmin.from('wallet').select('user_id, balance').in('user_id', userIds),
        supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds),
      ])
      const walletMap = Object.fromEntries((wallets || []).map(w => [w.user_id, w]))
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      for (const userId of userIds) {
        const sub = userSubMap[userId]
        const dailyAmount = Math.round((sub.products?.price || 0) * sub.quantity * (1 - (sub.discount_percent || 0) / 100))
        if (!dailyAmount) continue
        const balance = walletMap[userId]?.balance || 0
        if (balance > 0 && balance < dailyAmount * 7) {
          const profile = profileMap[userId]
          if (profile?.email) {
            await sendLowBalanceEmail({ to: profile.email, name: profile.full_name || 'Customer', balance }).catch(() => {})
          }
        }
      }
    }
  } catch { /* must not block cron */ }

  // ── 3. Admin alert if no deliveries confirmed yesterday ─────────────────────
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const [{ count: activeCount }, { count: deliveryCount }] = await Promise.all([
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('wallet_transactions').select('*', { count: 'exact', head: true }).eq('type', 'debit').like('description', `%[${yesterdayStr}]`),
    ])

    if ((activeCount || 0) > 0 && (deliveryCount || 0) === 0) {
      await notifyAdmin(
        'No Deliveries Yesterday',
        `⚠️ No deliveries were confirmed on ${yesterdayStr}. Please check if deliveries are being marked in the admin panel.`
      ).catch(() => {})
    }
  } catch { /* must not block cron */ }

  // ── 4. Reset pause_days_used_this_month on the 1st of each month ────────────
  try {
    if (today.endsWith('-01')) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ pause_days_used_this_month: 0 })
        .eq('is_active', true)
    }
  } catch { /* non-blocking */ }

  // ── 5. Referral completion check: award 100 pts after 30 subscription days ──
  try {
    const { data: pendingReferrals } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_id, referred_id, subscription_days_count, profiles!referrals_referred_id_fkey(full_name)')
      .eq('status', 'pending')

    for (const ref of pendingReferrals || []) {
      const { data: activeSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', ref.referred_id)
        .eq('is_active', true)
        .maybeSingle()
      if (!activeSub) continue

      const newCount = (ref.subscription_days_count || 0) + 1

      if (newCount >= 30) {
        const REFERRAL_POINTS = 100
        const referredName = ref.profiles?.full_name || 'Your referral'

        const [{ data: referrerProf }, { data: referrerAuth }, { data: referredProf }, { data: referredAuth }] = await Promise.all([
          supabaseAdmin.from('profiles').select('loyalty_points, full_name, phone, email').eq('id', ref.referrer_id).single(),
          supabaseAdmin.auth.admin.getUserById(ref.referrer_id),
          supabaseAdmin.from('profiles').select('loyalty_points, full_name, phone, email').eq('id', ref.referred_id).single(),
          supabaseAdmin.auth.admin.getUserById(ref.referred_id),
        ])

        await Promise.all([
          supabaseAdmin.from('profiles').update({ loyalty_points: (referrerProf?.loyalty_points || 0) + REFERRAL_POINTS }).eq('id', ref.referrer_id),
          supabaseAdmin.from('profiles').update({ loyalty_points: (referredProf?.loyalty_points || 0) + REFERRAL_POINTS }).eq('id', ref.referred_id),
          supabaseAdmin.from('referrals').update({ status: 'completed', referral_activated_at: new Date().toISOString(), subscription_days_count: newCount }).eq('id', ref.id),
        ])

        try {
          const referrerEmail = referrerAuth?.user?.email || referrerProf?.email
          const referredEmail = referredAuth?.user?.email || referredProf?.email
          await Promise.allSettled([
            referrerEmail && sendReferralCompletedEmail({ to: referrerEmail, name: referrerProf?.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referredName }),
            referredEmail && sendReferralCompletedEmail({ to: referredEmail, name: referredProf?.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referrerProf?.full_name || 'Your referrer' }),
            referrerProf?.phone && notifyReferralCompleted({ phone: referrerProf.phone, name: referrerProf.full_name || 'Customer', points: REFERRAL_POINTS }),
            referredProf?.phone && notifyReferralCompleted({ phone: referredProf.phone, name: referredProf.full_name || 'Customer', points: REFERRAL_POINTS }),
          ])
        } catch { /* non-blocking */ }
      } else {
        await supabaseAdmin.from('referrals').update({ subscription_days_count: newCount }).eq('id', ref.id)
      }
    }
  } catch { /* referral check must not block cron */ }

  // ── 6. Loyalty points expiry check ──────────────────────────────────────────
  try {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const in30DaysStr = in30Days.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const [{ data: expiredProfiles }, { data: expiringProfiles }] = await Promise.all([
      // lt (strictly before today) so points remain valid through the full expiry date
      supabaseAdmin.from('profiles').select('id').not('loyalty_points_expiry', 'is', null).lt('loyalty_points_expiry', today).gt('loyalty_points', 0),
      supabaseAdmin.from('profiles').select('id, full_name, phone, loyalty_points, loyalty_points_expiry, email').eq('loyalty_points_expiry', in30DaysStr).gt('loyalty_points', 0),
    ])

    for (const prof of expiredProfiles || []) {
      await supabaseAdmin.from('profiles').update({ loyalty_points: 0, loyalty_points_expiry: null }).eq('id', prof.id)
    }

    for (const prof of expiringProfiles || []) {
      try {
        if (prof.email) await sendPointsExpiryEmail({ to: prof.email, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry })
        if (prof.phone) await notifyPointsExpiring({ phone: prof.phone, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry })
      } catch { /* non-blocking */ }
    }
  } catch { /* expiry check must not block cron */ }

  // ── 7. Subscription expiry reminders (3-day warning for fixed subs) ──────────
  try {
    const in3Days = new Date()
    in3Days.setDate(in3Days.getDate() + 3)
    const in3DaysStr = in3Days.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { data: expiringSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, products(size), end_date')
      .eq('is_active', true)
      .eq('end_date', in3DaysStr)

    for (const sub of expiringSubs || []) {
      try {
        const { data: expiryProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', sub.user_id)
          .single()
        const email = expiryProfile?.email
        const name = expiryProfile?.full_name || email || 'Customer'
        const product = sub.products?.size || 'Milk'
        const endDateLabel = new Date(sub.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        if (email) await sendSubscriptionExpiryReminderEmail({ to: email, name, product, endDate: endDateLabel, daysLeft: 3 })
        if (expiryProfile?.phone) await sendSubscriptionExpiry(expiryProfile.phone, name, endDateLabel, product)
      } catch { /* non-blocking per sub */ }
    }
  } catch { /* must not block cron */ }

  return NextResponse.json({ date: today, summary: 'daily cron complete' })
}
