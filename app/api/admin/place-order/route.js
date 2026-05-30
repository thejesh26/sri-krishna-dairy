import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { notifyOrderPlaced } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { target_user_id, product_id, quantity, delivery_date, delivery_slot } = await request.json()
    if (!target_user_id || !product_id || !delivery_date) {
      return NextResponse.json({ error: 'target_user_id, product_id, and delivery_date are required' }, { status: 400 })
    }

    const qty = parseInt(quantity, 10) || 1

    const { data: product } = await supabaseAdmin
      .from('products').select('id, name, size, price, is_available').eq('id', product_id).single()
    if (!product?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 404 })
    }

    const totalAmount = Math.round(product.price * qty)

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: target_user_id,
        product_id: product.id,
        quantity: qty,
        delivery_date,
        delivery_slot: delivery_slot || 'morning',
        payment_method: 'COD',
        status: 'pending',
        total_price: totalAmount,
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Notify customer — non-blocking
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
          slot: delivery_slot || 'morning',
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
