import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireCron } from '../../../lib/auth'
import { getScheduledQuantity } from '../../../lib/pricing'
import { createAdminNotification } from '../../../lib/notify'

// Called daily at 01:00 UTC (6:30 AM IST) — after all deliveries should be done for the previous day.
// Reconciles expected deliveries against actual subscription_deliveries rows for yesterday.
// Complements check-undelivered (which clears pending flags at 10AM IST for today).
export async function GET(request) {
  const { error } = requireCron(request)
  if (error) return error

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  console.log(`[cron/check-missed-deliveries] checking ${yesterdayStr}`)

  // All subscriptions that were active yesterday
  const { data: candidates, error: subErr } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, weekly_schedule, quantity, paused_dates')
    .eq('is_active', true)
    .lte('start_date', yesterdayStr)
    .or(`end_date.is.null,end_date.gte.${yesterdayStr}`)

  if (subErr) {
    console.error('[check-missed-deliveries] subscription fetch failed:', subErr)
    return NextResponse.json({ error: 'subscription fetch failed' }, { status: 500 })
  }

  // Filter to subscriptions that should have received a delivery yesterday
  const expectedSubs = (candidates || []).filter(sub => {
    if ((sub.paused_dates || []).includes(yesterdayStr)) return false
    return getScheduledQuantity(sub, yesterdayStr) > 0
  })

  if (!expectedSubs.length) {
    console.log(`[check-missed-deliveries] no deliveries expected on ${yesterdayStr}`)
    return NextResponse.json({ date: yesterdayStr, expected: 0, missed: 0 })
  }

  // Fetch actual confirmed deliveries for yesterday
  const expectedIds = expectedSubs.map(s => s.id)
  const { data: confirmedRows } = await supabaseAdmin
    .from('subscription_deliveries')
    .select('subscription_id')
    .eq('delivery_date', yesterdayStr)
    .in('subscription_id', expectedIds)

  const confirmedSet = new Set((confirmedRows || []).map(r => r.subscription_id))
  const missedSubs = expectedSubs.filter(s => !confirmedSet.has(s.id))

  console.log(`[check-missed-deliveries] expected=${expectedSubs.length}, confirmed=${confirmedSet.size}, missed=${missedSubs.length}`)

  if (!missedSubs.length) {
    return NextResponse.json({ date: yesterdayStr, expected: expectedSubs.length, missed: 0 })
  }

  // Fetch names for missed customers
  const missedUserIds = [...new Set(missedSubs.map(s => s.user_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', missedUserIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
  const missedNames = missedSubs
    .map(s => {
      const p = profileMap[s.user_id]
      return p?.full_name || p?.phone || s.user_id
    })
    .join(', ')

  await createAdminNotification({
    type: 'missed_delivery',
    title: `${missedSubs.length} missed delivery${missedSubs.length > 1 ? 'ies' : ''} — ${yesterdayStr}`,
    body: `No confirmation recorded for: ${missedNames}`,
    link_tab: 'reports',
  })

  return NextResponse.json({
    date: yesterdayStr,
    expected: expectedSubs.length,
    confirmed: confirmedSet.size,
    missed: missedSubs.length,
  })
}
