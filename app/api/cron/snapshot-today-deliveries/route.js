import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireCron } from '../../../lib/auth'
import { getISTDate, getScheduledQuantity } from '../../../lib/pricing'
import { withCronLog } from '../../../lib/cron'

// Called daily at 5:30 AM IST (00:00 UTC) by Vercel Cron.
// Freezes today's delivery list: writes one 'pending' subscription_deliveries row per
// eligible subscription with today's scheduled quantity locked in. delivery/today and
// the admin Today tab read these rows instead of recomputing live, so a pause/edit/
// cancellation made after this cron runs no longer changes what's already shown as
// scheduled for today.
export async function GET(request) {
  const { error } = requireCron(request)
  if (error) return error
  return withCronLog('snapshot-today-deliveries', runSnapshot)
}

export async function POST(request) {
  const { error } = requireCron(request)
  if (error) return error
  return withCronLog('snapshot-today-deliveries', runSnapshot)
}

function isDeliveryDay(sub, today) {
  const freq = sub.delivery_frequency || 'daily'
  if (freq === 'daily') return true
  const start = new Date(sub.start_date + 'T00:00:00+05:30')
  const check = new Date(today + 'T00:00:00+05:30')
  const daysDiff = Math.round((check - start) / (1000 * 60 * 60 * 24))
  if (freq === 'alternate') return daysDiff % 2 === 0
  if (freq === 'weekly') return daysDiff % 7 === 0
  return true
}

async function runSnapshot() {
  const today = getISTDate()

  const { data: allSubs, error: fetchError } = await supabaseAdmin
    .from('subscriptions')
    .select('id, user_id, quantity, weekly_schedule, delivery_frequency, start_date, paused_dates')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  if (fetchError) {
    console.error('[cron/snapshot-today-deliveries] subscription fetch failed:', fetchError)
    return NextResponse.json({ error: 'subscription fetch failed' }, { status: 500 })
  }

  const eligible = (allSubs || []).filter(sub =>
    !(sub.paused_dates || []).includes(today) &&
    isDeliveryDay(sub, today) &&
    getScheduledQuantity(sub, today) > 0
  )

  if (!eligible.length) {
    console.log(`[cron/snapshot-today-deliveries] no eligible subscriptions for ${today}`)
    return NextResponse.json({ date: today, snapshotted: 0 })
  }

  const rows = eligible.map(sub => ({
    subscription_id: sub.id,
    user_id: sub.user_id,
    delivery_date: today,
    quantity: getScheduledQuantity(sub, today),
    quantity_source: 'snapshot',
    status: 'pending',
    not_delivered: false,
  }))

  // ignoreDuplicates: never clobber a row that already exists — either a re-run of this
  // cron, or an unusually early delivery confirmation that beat the cron to it.
  const { error: upsertError, count } = await supabaseAdmin
    .from('subscription_deliveries')
    .upsert(rows, { onConflict: 'subscription_id,delivery_date', ignoreDuplicates: true, count: 'exact' })

  if (upsertError) {
    console.error('[cron/snapshot-today-deliveries] upsert failed:', upsertError)
    return NextResponse.json({ error: 'upsert failed' }, { status: 500 })
  }

  console.log(`[cron/snapshot-today-deliveries] snapshotted ${rows.length} subscriptions for ${today}`)
  return NextResponse.json({ date: today, eligible: rows.length, inserted: count ?? null })
}
