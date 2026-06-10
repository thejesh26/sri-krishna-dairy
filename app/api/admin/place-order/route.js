import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { notifyOrderPlaced } from '../../../lib/whatsapp'

const TRIAL_PRICE_CAPS = { '1L': 60, '500ml': 35 }

function addDaysIST(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00+05:30')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { target_user_id, product_id, quantity, delivery_date, delivery_slot, is_trial } = await request.json()
    if (!target_user_id || !product_id || !delivery_date) {
      return NextResponse.json({ error: 'target_user_id, product_id, and delivery_date are required' }, { status: 400 })
    }

    const qty = parseInt(quantity, 10) || 1

    const { data: product } = await supabaseAdmin
      .from('products').select('id, name, size, price, is_available').eq('id', product_id).single()
    if (!product?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 404 })
    }

    const slot = delivery_slot || 'morning'

    if (is_trial) {
      // Insert 3 rows for 3-day trial
      const unitPrice = TRIAL_PRICE_CAPS[product.size] ?? Math.round(product.price * 0.92)
      const linePrice = Math.round(unitPrice * qty)
      const deliveryDates = [delivery_date, addDaysIST(delivery_date, 1), addDaysIST(delivery_date, 2)]

      const rows = deliveryDates.map(date => ({
        user_id: target_user_id,
        product_id: product.id,
        quantity: qty,
        delivery_date: date,
        delivery_slot: slot,
        payment_method: 'COD',
        status: 'pending',
        total_price: linePrice,
        bottle_deposit: 0,
      }))

      const { data: orders, error: insertError } = await supabaseAdmin
        .from('orders').insert(rows).select('id')

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

     // Mark has_used_cod — non-blocking
try {
  await supabaseAdmin.from('profiles').update({ has_used_cod: true }).eq('id', target_user_id)
} catch {}


      try {
        const { data: customerProfile } = await supabaseAdmin
          .from('profiles').select('full_name, phone').eq('id', target_user_id).single()
        if (customerProfile?.phone) {
          await notifyOrderPlaced({
            phone: customerProfile.phone,
            name: customerProfile.full_name || 'Customer',
            size: product.size || product.name,
            quantity: qty,
            deliveryDate: `${delivery_date} (3-day trial)`,
            slot,
            amount: linePrice * 3,
          })
        }
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, order_count: orders.length, order_ids: orders.map(o => o.id) })
    }

    // Single order (non-trial)
    const totalAmount = Math.round(product.price * qty)

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: target_user_id,
        product_id: product.id,
        quantity: qty,
        delivery_date,
        delivery_slot: slot,
        payment_method: 'COD',
        status: 'pending',
        total_price: totalAmount,
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    try {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles').select('full_name, phone').eq('id', target_user_id).single()
      if (customerProfile?.phone) {
        await notifyOrderPlaced({
          phone: customerProfile.phone,
          name: customerProfile.full_name || 'Customer',
          size: product.size || product.name,
          quantity: qty,
          deliveryDate: delivery_date,
          slot,
          amount: totalAmount,
        })
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, order_id: order.id })
  } catch (err) {
    console.error('[AdminPlaceOrder] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
