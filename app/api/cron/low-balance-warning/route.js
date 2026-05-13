import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendLowBalanceAlert } from '../../../lib/whatsapp'
import { sendLowBalanceEmail } from '../../../lib/email'

// Called daily at 15:00 UTC (8:30 PM IST) by Vercel Cron
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('user_id, quantity, discount_percent, delivery_frequency, products(price)')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let warned = 0
  let skipped = 0

  for (const sub of subscriptions || []) {
    if (!sub.products?.price) { skipped++; continue }

    const dailyAmount = Math.round(
      sub.products.price * sub.quantity * (1 - (sub.discount_percent || 0) / 100)
    )
    if (dailyAmount <= 0) { skipped++; continue }

    const { data: wallet } = await supabase
      .from('wallet')
      .select('balance')
      .eq('user_id', sub.user_id)
      .maybeSingle()

    const balance = wallet?.balance ?? 0
    const freq = sub.delivery_frequency || 'daily'

    // Days until balance runs out, accounting for delivery frequency
    const deliveriesRemaining = Math.floor(balance / dailyAmount)
    let daysLeft
    if (freq === 'alternate') daysLeft = deliveriesRemaining * 2
    else if (freq === 'weekly') daysLeft = deliveriesRemaining * 7
    else daysLeft = deliveriesRemaining

    if (daysLeft > 3 || daysLeft <= 0) { skipped++; continue }

    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', sub.user_id)
        .single()

      const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id)
      const email = authUser?.user?.email
      const name = prof?.full_name || 'Customer'

      if (prof?.phone) await sendLowBalanceAlert(prof.phone, name, balance)
      if (email) await sendLowBalanceEmail({ to: email, name, balance })

      console.log(`[LowBalanceWarning] Warned ${name} — balance ₹${balance}, days left: ${daysLeft}`)
      warned++
    } catch (err) {
      console.error('[LowBalanceWarning] Notify failed for user', sub.user_id, err?.message)
      skipped++
    }
  }

  return NextResponse.json({ warned, skipped })
}
