import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendLowBalanceEmail, sendCronFailureAlert, sendSubscriptionExpiryReminderEmail, sendReferralCompletedEmail, sendPointsExpiryEmail } from '../../../lib/email'
import { notifyLowBalance, notifySubscriptionStopped, notifySubscriptionExpiryReminder, notifyReferralCompleted, notifyPointsExpiring } from '../../../lib/whatsapp'

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
  const supabase = createServerClient()

  // Always use IST for the daily date so it matches subscription dates stored by users in IST
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Fetch all active subscriptions that have started and not yet ended
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*, products(*), discount_percent')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter out subscriptions paused today or with missing product info
  const eligible = (subscriptions || []).filter(sub =>
    sub.products && !(sub.paused_dates || []).includes(today)
  )

  const pendingMarked = []
  const failed = []
  let skipped = 0

  // ── Mark eligible subscriptions as pending_delivery (deduction happens on confirm) ──
  for (const sub of eligible) {
    const dailyAmount = Math.round(
      sub.products.price * sub.quantity * (1 - (sub.discount_percent || 0) / 100)
    )

    // Check if already processed today (idempotency)
    const description = `Daily subscription ${sub.id} [${today}]`
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', sub.user_id)
      .eq('description', description)
      .limit(1)

    if (existing?.length > 0) {
      skipped++
      continue
    }

    // Check wallet has sufficient balance before marking pending
    const { data: wallet } = await supabase
      .from('wallet')
      .select('id, balance')
      .eq('user_id', sub.user_id)
      .maybeSingle()

    const balance = wallet?.balance || 0

    if (balance < dailyAmount) {
      // Auto-deactivate subscription — balance cannot cover today's delivery
      await supabase
        .from('subscriptions')
        .update({ is_active: false, pending_delivery: false })
        .eq('id', sub.id)

      try {
        const { data: stoppedProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', sub.user_id)
          .single()
        if (stoppedProfile?.phone) {
          await notifySubscriptionStopped({
            phone: stoppedProfile.phone,
            name: stoppedProfile.full_name || 'Customer',
            balance,
          })
        }
      } catch { /* non-blocking */ }

      failed.push({
        subscriptionId: sub.id,
        userId: sub.user_id,
        product: `${sub.products.size} x${sub.quantity}`,
        balance,
        required: dailyAmount,
        reason: 'Insufficient balance — subscription deactivated',
      })
      continue
    }

    if (!wallet) {
      failed.push({
        subscriptionId: sub.id,
        userId: sub.user_id,
        product: `${sub.products.size} x${sub.quantity}`,
        balance: 0,
        required: dailyAmount,
        reason: 'No wallet found',
      })
      continue
    }

    // Mark as pending delivery — deduction happens when delivery is confirmed
    await supabase
      .from('subscriptions')
      .update({ pending_delivery: true })
      .eq('id', sub.id)

    pendingMarked.push({ subscriptionId: sub.id, userId: sub.user_id, amount: dailyAmount })
  }

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
        const { data: referrerAuth } = await supabase.auth.admin.getUserById(ref.referrer_id)
        await supabase.from('profiles').update({
          loyalty_points: (referrerProf?.loyalty_points || 0) + REFERRAL_POINTS,
        }).eq('id', ref.referrer_id)

        // Award referee
        const { data: referredProf } = await supabase
          .from('profiles')
          .select('loyalty_points, full_name, phone, email')
          .eq('id', ref.referred_id)
          .single()
        const { data: referredAuth } = await supabase.auth.admin.getUserById(ref.referred_id)
        await supabase.from('profiles').update({
          loyalty_points: (referredProf?.loyalty_points || 0) + REFERRAL_POINTS,
        }).eq('id', ref.referred_id)

        // Mark referral completed
        await supabase.from('referrals').update({
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
        await supabase.from('referrals').update({ subscription_days_count: newCount }).eq('id', ref.id)
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
      await supabase.from('profiles').update({ loyalty_points: 0, loyalty_points_expiry: null }).eq('id', prof.id)
    }

    // Notify customers whose points expire in exactly 30 days
    const { data: expiringProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, loyalty_points, loyalty_points_expiry')
      .eq('loyalty_points_expiry', in30DaysStr)
      .gt('loyalty_points', 0)

    for (const prof of expiringProfiles || []) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(prof.id)
        const email = authUser?.user?.email
        if (email) await sendPointsExpiryEmail({ to: email, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry })
        if (prof.phone) await notifyPointsExpiring({ phone: prof.phone, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry })
      } catch { /* non-blocking */ }
    }
  } catch { /* expiry check must not block cron */ }

  const deducted = pendingMarked // keep field name for admin alert compat

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
        const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
        const email = authUser?.user?.email || expiryProfile?.email
        const name = expiryProfile?.full_name || email || 'Customer'
        const product = sub.products?.size || 'Milk'
        const endDateLabel = new Date(sub.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

        if (email) {
          await sendSubscriptionExpiryReminderEmail({ to: email, name, product, endDate: endDateLabel, daysLeft: 3 })
        }
        if (expiryProfile?.phone) {
          await notifySubscriptionExpiryReminder({ phone: expiryProfile.phone, name, product, endDate: endDateLabel, daysLeft: 3 })
        }
      } catch {
        // Expiry notification failure must not block cron
      }
    }
  } catch {
    // Expiry check failure must not block cron
  }

  // Send admin alert if any deductions failed
  if (failed.length > 0) {
    try {
      await sendCronFailureAlert({
        date: today,
        failed,
        skipped,
        deducted: deducted.length,
      })
    } catch {
      // Alert failure must not block the cron response
    }
  }

  return NextResponse.json({
    date: today,
    summary: {
      eligible: eligible.length,
      pendingMarked: pendingMarked.length,
      skipped,
      failed: failed.length,
    },
    failed,
  })
}
