import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

const VALID_DELIVERY_SLOTS = ['morning', 'evening']

/**
 * POST /api/admin/place-addon-order
 * Admin override — places one or more addon orders for a customer without
 * requiring an active subscription or wallet balance.
 */
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { target_user_id, product_id, quantity, dates, delivery_slot } = await request.json()

    if (!target_user_id || !product_id || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'target_user_id, product_id, and at least one date are required.' }, { status: 400 })
    }
    if (dates.length > 60) {
      return NextResponse.json({ error: 'Maximum 60 dates per request.' }, { status: 400 })
    }

    const qty = parseInt(quantity, 10)
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ error: 'Quantity must be 1–20.' }, { status: 400 })
    }

    const slot = VALID_DELIVERY_SLOTS.includes(delivery_slot) ? delivery_slot : 'morning'

    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return NextResponse.json({ error: `Invalid date format: ${d}` }, { status: 400 })
      }
    }

    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, price, size, is_available')
      .eq('id', product_id)
      .single()

    if (!product?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable.' }, { status: 404 })
    }

    const pricePerDay = Math.round(product.price * qty)

    const insertRows = dates.map(d => ({
      user_id: target_user_id,
      product_id: product.id,
      quantity: qty,
      delivery_date: d,
      delivery_slot: slot,
      total_price: pricePerDay,
      status: 'pending',
    }))

    const { data: created, error: insertError } = await supabaseAdmin
      .from('addon_orders')
      .insert(insertRows)
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      order_count: created.length,
      total_amount: pricePerDay * dates.length,
    })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
