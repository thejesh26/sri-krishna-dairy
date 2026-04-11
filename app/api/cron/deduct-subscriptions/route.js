import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendLowBalanceEmail, sendCronFailureAlert, sendSubscriptionExpiryReminderEmail } from '../../../lib/email'
import { notifyLowBalance, notifySubscriptionStopped, notifySubscriptionExpiryReminder } from '../../../lib/whatsapp'

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

  const deducted = []
  const failed = []
  let skipped = 0

  for (const sub of eligible) {
    const dailyAmount = Math.round(
      sub.products.price * sub.quantity * (1 - (sub.discount_percent || 0) / 100)
    )
    // Embed sub.id + date in description — acts as a natural idempotency key
    const description = `Daily subscription ${sub.id} [${today}]`

    // Skip if already processed today (prevents double-deduction on retry)
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

    // Get current wallet balance
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
        .update({ is_active: false })
        .eq('id', sub.id)

      // WhatsApp: subscription stopped notification (non-blocking)
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
      } catch {
        // WhatsApp failure must not block cron
      }

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

    // Deduct balance — skip entirely if no wallet row exists (should not happen)
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

    const newBalance = balance - dailyAmount

    // Only update `balance` — deposit_balance is never deducted by the cron
    await supabase
      .from('wallet')
      .update({ balance: newBalance })
      .eq('user_id', sub.user_id)

    // Record transaction
    await supabase.from('wallet_transactions').insert({
      user_id: sub.user_id,
      amount: dailyAmount,
      type: 'debit',
      description,
    })

    // Send low balance alert if balance drops below Rs.300
    if (newBalance < 300) {
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, phone, email')
          .eq('id', sub.user_id)
          .single()

        const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
        const userEmail = authUser?.user?.email || userProfile?.email
        const name = userProfile?.full_name || userEmail

        if (userEmail) {
          await sendLowBalanceEmail({
            to: userEmail,
            name,
            balance: newBalance,
          })
        }

        if (userProfile?.phone) {
          await notifyLowBalance({
            phone: userProfile.phone,
            name,
            balance: newBalance,
          })
        }
      } catch {
        // Notification failure must not block deduction
      }
    }

    // Award loyalty points: 1 point per Rs.100 spent
    const pointsEarned = Math.floor(dailyAmount / 100)
    if (pointsEarned > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('loyalty_points, streak_count, last_delivery_date, badges')
        .eq('id', sub.user_id)
        .single()

      if (profileData) {
        const newPoints = (profileData.loyalty_points || 0) + pointsEarned
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        const isConsecutive = profileData.last_delivery_date === yesterdayStr || profileData.last_delivery_date === today
        const newStreak = isConsecutive ? (profileData.streak_count || 0) + 1 : 1
        const currentBadges = profileData.badges || []
        const newBadges = [...currentBadges]
        if (newStreak >= 7 && !newBadges.includes('fresh_start')) newBadges.push('fresh_start')
        if (newStreak >= 30 && !newBadges.includes('milk_lover')) newBadges.push('milk_lover')
        if (newStreak >= 90 && !newBadges.includes('health_champion')) newBadges.push('health_champion')
        if (newStreak >= 365 && !newBadges.includes('dairy_legend')) newBadges.push('dairy_legend')
        await supabase.from('profiles').update({
          loyalty_points: newPoints,
          streak_count: newStreak,
          last_delivery_date: today,
          badges: newBadges,
        }).eq('id', sub.user_id)
      }
    }

    deducted.push({
      subscriptionId: sub.id,
      userId: sub.user_id,
      amount: dailyAmount,
    })
  }

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
      deducted: deducted.length,
      skipped,
      failed: failed.length,
    },
    failed,
  })
}
