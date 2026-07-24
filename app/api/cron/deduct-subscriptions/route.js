import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { getISTDate, getScheduledQuantity, avgScheduledQuantity } from '../../../lib/pricing'
import { requireCron } from '../../../lib/auth'
import { sendLowBalanceEmail, sendSubscriptionExpiryReminderEmail, sendReferralCompletedEmail, sendPointsExpiryEmail } from '../../../lib/email'
import { sendSubscriptionExpiry, notifyReferralCompleted, notifyPointsExpiring, notifyAdmin } from '../../../lib/whatsapp'

// Called daily by Vercel Cron at 18:30 UTC (midnight IST)
export const maxDuration = 300

export async function GET(request) {
  const { error } = requireCron(request)
  if (error) return error
  return runDeductions()
}

// Also accepts POST so the admin panel can trigger it manually
export async function POST(request) {
  const { error } = requireCron(request)
  if (error) return error
  return runDeductions()
}

async function runDeductions() {
  const today = getISTDate()
  console.log(`[cron/deduct-subscriptions] start — ${today}`)
  const results = { date: today }

  // ── 0. Mark today's scheduled subscriptions as pending_delivery ──────────────
  // Reset leftover flags from the previous day, then set today's expected deliveries.
  // delivery/confirm clears flags when agents confirm; check-undelivered clears at 10AM IST.
  try {
    await supabaseAdmin
      .from('subscriptions')
      .update({ pending_delivery: false })
      .eq('pending_delivery', true)

    const { data: candidates } = await supabaseAdmin
      .from('subscriptions')
      .select('id, weekly_schedule, quantity, paused_dates')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)

    const idsToMark = (candidates || [])
      .filter(sub => {
        if ((sub.paused_dates || []).includes(today)) return false
        return getScheduledQuantity(sub, today) > 0
      })
      .map(sub => sub.id)

    if (idsToMark.length) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ pending_delivery: true })
        .in('id', idsToMark)
    }

    results.pending_delivery_count = idsToMark.length
    console.log(`[cron] step 0: marked ${idsToMark.length} subscriptions as pending_delivery`)
  } catch (err) {
    console.error('[cron] step 0 failed:', err)
  }

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
    results.expired_subs = (expiredSubs || []).length
    console.log(`[cron] step 1: deactivated ${results.expired_subs} expired fixed subs`)
  } catch (err) {
    console.error('[cron] step 1 failed:', err)
  }

  // ── 2. Low balance alerts (batched) ─────────────────────────────────────────
  try {
    const { data: activeSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, products(price), quantity, weekly_schedule, discount_percent')
      .eq('is_active', true)
      .eq('subscription_type', 'ongoing')
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)

    const userSubMap = {}
    for (const sub of activeSubs || []) {
      if (!userSubMap[sub.user_id]) userSubMap[sub.user_id] = sub
    }
    const userIds = Object.keys(userSubMap)

    let alertCount = 0
    if (userIds.length) {
      const [{ data: wallets }, { data: profiles }] = await Promise.all([
        supabaseAdmin.from('wallet').select('user_id, balance').in('user_id', userIds),
        supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds),
      ])
      const walletMap = Object.fromEntries((wallets || []).map(w => [w.user_id, w]))
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      for (const userId of userIds) {
        const sub = userSubMap[userId]
        const dailyAmount = Math.round((sub.products?.price || 0) * avgScheduledQuantity(sub) * (1 - (sub.discount_percent || 0) / 100))
        if (!dailyAmount) continue
        const balance = walletMap[userId]?.balance || 0
        if (balance > 0 && balance < dailyAmount * 7) {
          const profile = profileMap[userId]
          if (profile?.email) {
            await sendLowBalanceEmail({ to: profile.email, name: profile.full_name || 'Customer', balance }).catch(() => {})
            alertCount++
          }
        }
      }
    }
    results.low_balance_alerts = alertCount
    console.log(`[cron] step 2: sent ${alertCount} low-balance alerts`)
  } catch (err) {
    console.error('[cron] step 2 failed:', err)
  }

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
    console.log(`[cron] step 3: yesterday deliveries=${deliveryCount}, active subs=${activeCount}`)
  } catch (err) {
    console.error('[cron] step 3 failed:', err)
  }

  // ── 4. Reset pause_days_used_this_month on the 1st of each month ────────────
  try {
    if (today.endsWith('-01')) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ pause_days_used_this_month: 0 })
        .eq('is_active', true)
      console.log('[cron] step 4: reset monthly pause counters')
    }
  } catch (err) {
    console.error('[cron] step 4 failed:', err)
  }

  // ── 5. Referral completion check: award 100 pts after 30 subscription days ──
  try {
    const { data: pendingReferrals } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_id, referred_id, subscription_days_count, profiles!referrals_referred_id_fkey(full_name)')
      .eq('status', 'pending')

    if ((pendingReferrals || []).length) {
      // Batch-check which referred users have an active subscription (1 query vs N)
      const referredIds = pendingReferrals.map(r => r.referred_id)
      const { data: activeSubs } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('is_active', true)
        .in('user_id', referredIds)
      const activeReferredSet = new Set((activeSubs || []).map(s => s.user_id))

      let completedCount = 0
      for (const ref of pendingReferrals) {
        if (!activeReferredSet.has(ref.referred_id)) continue

        const newCount = (ref.subscription_days_count || 0) + 1

        if (newCount >= 30) {
          const REFERRAL_POINTS = 100
          const referredName = ref.profiles?.full_name || 'Your referral'

          const [{ data: referrerProf }, { data: referredProf }] = await Promise.all([
            supabaseAdmin.from('profiles').select('loyalty_points, full_name, phone, email').eq('id', ref.referrer_id).single(),
            supabaseAdmin.from('profiles').select('loyalty_points, full_name, phone, email').eq('id', ref.referred_id).single(),
          ])

          await Promise.all([
            supabaseAdmin.from('profiles').update({ loyalty_points: (referrerProf?.loyalty_points || 0) + REFERRAL_POINTS }).eq('id', ref.referrer_id),
            supabaseAdmin.from('profiles').update({ loyalty_points: (referredProf?.loyalty_points || 0) + REFERRAL_POINTS }).eq('id', ref.referred_id),
            supabaseAdmin.from('referrals').update({ status: 'completed', referral_activated_at: new Date().toISOString(), subscription_days_count: newCount }).eq('id', ref.id),
          ])

          await Promise.allSettled([
            referrerProf?.email && sendReferralCompletedEmail({ to: referrerProf.email, name: referrerProf.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referredName }),
            referredProf?.email && sendReferralCompletedEmail({ to: referredProf.email, name: referredProf.full_name || 'Customer', points: REFERRAL_POINTS, friendName: referrerProf?.full_name || 'Your referrer' }),
            referrerProf?.phone && notifyReferralCompleted({ phone: referrerProf.phone, name: referrerProf.full_name || 'Customer', points: REFERRAL_POINTS }),
            referredProf?.phone && notifyReferralCompleted({ phone: referredProf.phone, name: referredProf.full_name || 'Customer', points: REFERRAL_POINTS }),
          ])
          completedCount++
        } else {
          await supabaseAdmin.from('referrals').update({ subscription_days_count: newCount }).eq('id', ref.id)
        }
      }
      results.referrals_completed = completedCount
      console.log(`[cron] step 5: ${completedCount} referrals completed, ${pendingReferrals.length} checked`)
    }
  } catch (err) {
    console.error('[cron] step 5 failed:', err)
  }

  // ── 6. Loyalty points expiry check ──────────────────────────────────────────
  try {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const in30DaysStr = in30Days.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const [{ data: expiredProfiles }, { data: expiringProfiles }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id').not('loyalty_points_expiry', 'is', null).lt('loyalty_points_expiry', today).gt('loyalty_points', 0),
      supabaseAdmin.from('profiles').select('id, full_name, phone, loyalty_points, loyalty_points_expiry, email').eq('loyalty_points_expiry', in30DaysStr).gt('loyalty_points', 0),
    ])

    for (const prof of expiredProfiles || []) {
      await supabaseAdmin.from('profiles').update({ loyalty_points: 0, loyalty_points_expiry: null }).eq('id', prof.id)
    }

    for (const prof of expiringProfiles || []) {
      await Promise.allSettled([
        prof.email && sendPointsExpiryEmail({ to: prof.email, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry }),
        prof.phone && notifyPointsExpiring({ phone: prof.phone, name: prof.full_name || 'Customer', points: prof.loyalty_points, expiryDate: prof.loyalty_points_expiry }),
      ])
    }
    results.points_expired = (expiredProfiles || []).length
    console.log(`[cron] step 6: ${results.points_expired} expired, ${(expiringProfiles || []).length} expiry warnings sent`)
  } catch (err) {
    console.error('[cron] step 6 failed:', err)
  }

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

    let remindersCount = 0
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
        remindersCount++
      } catch (err) {
        console.error('[cron] step 7 sub reminder failed:', err)
      }
    }
    results.expiry_reminders = remindersCount
    console.log(`[cron] step 7: sent ${remindersCount} expiry reminders`)
  } catch (err) {
    console.error('[cron] step 7 failed:', err)
  }

  console.log('[cron/deduct-subscriptions] done:', JSON.stringify(results))
  return NextResponse.json(results)
}
