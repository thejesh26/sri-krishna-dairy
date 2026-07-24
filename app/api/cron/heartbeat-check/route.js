import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireCron } from '../../../lib/auth'
import { getISTDate, getScheduledQuantity } from '../../../lib/pricing'
import { notifyAdmin } from '../../../lib/whatsapp'

// Called daily at 19:30 UTC (1AM IST) — 1 hour after the midnight deduction cron.
// Verifies that deduct-subscriptions ran by checking pending_delivery flags it sets.
export async function GET(request) {
  const { error } = requireCron(request)
  if (error) return error

  const today = getISTDate()

  const [{ data: pendingSubs }, { count: activeCount }] = await Promise.all([
    supabaseAdmin.from('subscriptions').select('id').eq('pending_delivery', true).limit(1),
    supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  // No active subscriptions — cron has nothing to do, all good
  if (!activeCount) {
    return NextResponse.json({ date: today, status: 'OK', message: 'No active subscriptions.' })
  }

  // Cron set at least one pending_delivery flag — it ran successfully
  if (pendingSubs?.length) {
    return NextResponse.json({ date: today, status: 'OK', pending: pendingSubs.length })
  }

  // pending_delivery count is 0 even though active subs exist.
  // Check if the cron genuinely ran but found nothing scheduled today
  // (all paused, or weekly_schedule has 0 for today's day-of-week).
  try {
    const { data: candidates } = await supabaseAdmin
      .from('subscriptions')
      .select('id, weekly_schedule, quantity, paused_dates')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)

    const expectedCount = (candidates || []).filter(sub => {
      if ((sub.paused_dates || []).includes(today)) return false
      return getScheduledQuantity(sub, today) > 0
    }).length

    if (expectedCount === 0) {
      // Cron ran correctly — no deliveries scheduled today (all paused or off-day)
      return NextResponse.json({ date: today, status: 'OK', message: 'No deliveries scheduled today.' })
    }
  } catch (err) {
    console.error('[heartbeat] candidate check failed:', err)
  }

  // Active subs exist, deliveries were expected, but pending_delivery is 0 — cron missed
  await notifyAdmin(
    '⚠️ Cron Alert — Deduction Did Not Run',
    `The daily cron did NOT run on ${today}. Delivery pipeline not set up. Please check Vercel logs and trigger manually if needed.`
  ).catch(() => {})

  return NextResponse.json({ date: today, status: 'MISSED' })
}
