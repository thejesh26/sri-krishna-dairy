import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

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
    .select('*, products(*)')
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
    const dailyAmount = sub.products.price * sub.quantity
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
      failed.push({
        subscriptionId: sub.id,
        userId: sub.user_id,
        product: `${sub.products.size} x${sub.quantity}`,
        balance,
        required: dailyAmount,
      })
      continue
    }

    // Deduct balance
    if (wallet) {
      await supabase
        .from('wallet')
        .update({ balance: balance - dailyAmount })
        .eq('user_id', sub.user_id)
    } else {
      await supabase
        .from('wallet')
        .insert({ user_id: sub.user_id, balance: 0 - dailyAmount })
    }

    // Record transaction
    await supabase.from('wallet_transactions').insert({
      user_id: sub.user_id,
      amount: dailyAmount,
      type: 'debit',
      description,
    })

    deducted.push({
      subscriptionId: sub.id,
      userId: sub.user_id,
      amount: dailyAmount,
    })
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
