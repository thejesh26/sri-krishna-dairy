import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmin } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Called by Vercel Cron at 19:30 UTC (1AM IST) — 1 hour after the main deduction cron.
 * Checks whether the deduction cron ran today by looking for any subscription deduction
 * transaction with today's date in the description.
 * If none found, alerts admin via WhatsApp.
 *
 * GET /api/cron/heartbeat-check
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Check if cron marked any subscriptions as pending_delivery today
  const { data: todayRun } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('pending_delivery', true)
    .limit(1)

  // Also check if any active subscriptions exist — if none, cron has nothing to do
  const { data: activeSubs } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('is_active', true)
    .limit(1)

  // If no active subscriptions exist, cron ran successfully (nothing to do)
  if (!activeSubs?.length) {
    return NextResponse.json({ date: today, status: 'OK', message: 'No active subscriptions.' })
  }

  // If active subs exist and none are pending — cron may not have run
  if (!todayRun?.length) {
    // Check wallet_transactions as fallback
    const { data: txCheck } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .like('description', `%[${today}]%`)
      .limit(1)

    if (!txCheck?.length) {
      await notifyAdmin(
        '⚠️ Cron Alert — Deduction Did Not Run',
        `The daily cron did NOT run on ${today}. Please check Vercel logs.`
      )
      return NextResponse.json({ date: today, status: 'MISSED' })
    }
  }

  return NextResponse.json({ date: today, status: 'OK' })
}
