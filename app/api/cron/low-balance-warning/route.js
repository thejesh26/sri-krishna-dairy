import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireCron } from '../../../lib/auth'
import { calcDailyAmount, getISTDate } from '../../../lib/pricing'
import { sendLowBalanceAlert } from '../../../lib/whatsapp'
import { sendLowBalanceEmail } from '../../../lib/email'

// Called daily at 15:00 UTC (8:30 PM IST) by Vercel Cron
export async function GET(request) {
  const { error: cronError } = requireCron(request)
  if (cronError) return cronError

  const today = getISTDate()

  const { data: subscriptions, error } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, quantity, discount_percent, subscription_type, products(price)')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let warned = 0
  let skipped = 0

  for (const sub of subscriptions || []) {
    if (!sub.products?.price) { skipped++; continue }
    if (sub.subscription_type === 'fixed') { skipped++; continue }

    const dailyAmount = calcDailyAmount(sub.products.price, sub.quantity, sub.discount_percent || 0)
    if (dailyAmount <= 0) { skipped++; continue }

    const threshold = dailyAmount * 7

    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('balance')
      .eq('user_id', sub.user_id)
      .maybeSingle()

    if (!wallet || wallet.balance <= 0 || wallet.balance >= threshold) { skipped++; continue }

    try {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', sub.user_id)
        .single()

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
      const email = authUser?.user?.email
      const name = prof?.full_name || 'Customer'

      if (prof?.phone) await sendLowBalanceAlert(prof.phone, name, wallet.balance)
      if (email) await sendLowBalanceEmail({ to: email, name, balance: wallet.balance })

      console.log(`[LowBalanceWarning] Warned ${name} — balance ₹${wallet.balance}, threshold ₹${threshold}`)
      warned++
    } catch (err) {
      console.error('[LowBalanceWarning] Notify failed for user', sub.user_id, err?.message)
      skipped++
    }
  }

  return NextResponse.json({ warned, skipped })
}
