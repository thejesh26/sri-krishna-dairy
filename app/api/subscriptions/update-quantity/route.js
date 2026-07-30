import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { calcDailyAmount } from '../../../lib/pricing'
import { notifyAdmin } from '../../../lib/whatsapp'
import { createAdminNotification } from '../../../lib/notify'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { subscription_id, quantity } = await request.json()
    const qty = Number(quantity)

    if (!subscription_id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ error: 'Invalid input. Quantity must be 1–20.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced)
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*, products(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'Active subscription not found.' }, { status: 404 })
    }

    const newDailyCost = calcDailyAmount(sub.products.price, qty, sub.discount_percent || 0)

    // Verify wallet can cover new amount
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    const balance = wallet?.balance || 0
    if (balance < newDailyCost) {
      return NextResponse.json({
        error: `Insufficient wallet balance. New daily cost: ₹${newDailyCost}, your balance: ₹${balance}.`
      }, { status: 400 })
    }

    await supabaseAdmin
      .from('subscriptions')
      .update({ quantity: qty })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    const oldQty = sub.quantity
    // Notify admin of the change (non-blocking)
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || user.email
      const product = sub.products?.size || 'Milk'
      await notifyAdmin(
        `Subscription Quantity Changed — ${name}`,
        `🔄 Quantity updated\nCustomer: ${name}\nProduct: ${product}\nQuantity: ${oldQty} → ${qty}\nPhone: ${profile?.phone || 'N/A'}`
      )
      await createAdminNotification({
        type: 'quantity_change',
        title: `Quantity changed — ${name}`,
        body: `${product}: ${oldQty} → ${qty} | Phone: ${profile?.phone || 'N/A'}`,
        link_tab: 'customers',
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, new_quantity: qty, new_daily_cost: newDailyCost })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
