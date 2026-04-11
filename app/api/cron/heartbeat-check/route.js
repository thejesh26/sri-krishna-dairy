import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppToAdmin } from '../../../lib/whatsapp'

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

  // Check if any subscription deduction ran today
  const { data: todayRun, error } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id')
    .like('description', `%[${today}]%`)
    .eq('type', 'debit')
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!todayRun || todayRun.length === 0) {
    // Cron did not run today — alert admin
    await sendWhatsAppToAdmin(
      `⚠️ *CRON ALERT*\nThe daily subscription deduction cron did NOT run on ${today}.\n\nPlease check Vercel logs and trigger manually if needed:\nhttps://srikrishnaadairy.in/api/cron/deduct-subscriptions`
    )

    return NextResponse.json({
      date: today,
      status: 'MISSED',
      message: 'Cron did not run today. Admin has been alerted.',
    })
  }

  return NextResponse.json({
    date: today,
    status: 'OK',
    message: 'Cron ran successfully today.',
  })
}
