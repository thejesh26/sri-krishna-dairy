import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { sendOrderConfirmationEmail } from '../../../lib/email'
import { sendOrderConfirmed } from '../../../lib/whatsapp'

const VALID_DELIVERY_SLOTS = ['morning', 'evening']
const VALID_DELIVERY_MODES = ['keep_bottle', 'direct']

// Mirror of DISCOUNT_CODES in validate-discount/route.js — single source of truth
const DISCOUNT_CODES = {
  ...(process.env.DISCOUNT_CODE_1 ? { [process.env.DISCOUNT_CODE_1]: 10 } : {}),
  ...(process.env.DISCOUNT_CODE_2 ? { [process.env.DISCOUNT_CODE_2]: 20 } : {}),
}

export async function POST(request) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    // ── 2. Parse & validate input ────────────────────────────────────────────
    const body = await request.json()
    const { items, delivery_date, delivery_slot, delivery_mode, discount_code } = body

    // Check if trial orders are enabled
    const { data: trialSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'trial_order_enabled')
      .maybeSingle()
    if (trialSetting?.value === 'false') {
      return NextResponse.json({ error: 'Trial orders are currently disabled.' }, { status: 403 })
    }

    // Check delivery slot is enabled
    const slotKey = delivery_slot === 'morning' ? 'morning_slot_enabled' : 'evening_slot_enabled'
    const { data: slotSetting } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', slotKey)
      .maybeSingle()
    if (slotSetting?.value === 'false') {
      return NextResponse.json({ error: `${delivery_slot} slot is currently unavailable.` }, { status: 403 })
    }

    // Support both multi-item array and single-item (backward compat)
    const rawItems = items && Array.isArray(items)
      ? items
      : (body.product_id ? [{ product_id: body.product_id, quantity: body.quantity }] : null)

    if (!rawItems || rawItems.length === 0 || rawItems.length > 5) {
      return NextResponse.json({ error: 'Provide 1–5 items.' }, { status: 400 })
    }

    // Validate each item
    const validatedItems = []
    for (const item of rawItems) {
      if (!item.product_id || (typeof item.product_id !== 'string' && typeof item.product_id !== 'number')) {
        return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
      }
      const qty = parseInt(item.quantity, 10)
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        return NextResponse.json({ error: 'Quantity must be between 1 and 20.' }, { status: 400 })
      }
      validatedItems.push({ product_id: item.product_id, quantity: qty })
    }

    if (!delivery_date || !/^\d{4}-\d{2}-\d{2}$/.test(delivery_date)) {
      return NextResponse.json({ error: 'Invalid delivery date.' }, { status: 400 })
    }
    if (!VALID_DELIVERY_SLOTS.includes(delivery_slot)) {
      return NextResponse.json({ error: 'Invalid delivery slot.' }, { status: 400 })
    }
    if (!VALID_DELIVERY_MODES.includes(delivery_mode)) {
      return NextResponse.json({ error: 'Invalid delivery mode.' }, { status: 400 })
    }

    // Must be at least 12 hours in the future
    const deliveryMs = new Date(delivery_date).getTime()
    const nowMs = Date.now()
    if ((deliveryMs - nowMs) / (1000 * 60 * 60) < 12) {
      return NextResponse.json(
        { error: 'Delivery must be booked at least 12 hours in advance.' },
        { status: 400 }
      )
    }

    // ── 3. Check COD trial eligibility ─────────────────────────────────────
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('has_used_cod')
      .eq('id', user.id)
      .single()

    if (callerProfile?.has_used_cod) {
      return NextResponse.json(
        { error: 'Your free trial has been used. Please recharge your wallet and subscribe for continued delivery.' },
        { status: 403 }
      )
    }

    // ── 4. Fetch the real product prices from the DB (never trust client) ─────
    const productIds = validatedItems.map(i => i.product_id)
    const { data: fetchedProducts, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, price, size, is_available')
      .in('id', productIds)

    if (productError || !fetchedProducts || fetchedProducts.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products not found.' }, { status: 404 })
    }
    for (const p of fetchedProducts) {
      if (!p.is_available) return NextResponse.json({ error: `${p.size} is currently unavailable.` }, { status: 400 })
    }
    const productMap = Object.fromEntries(fetchedProducts.map(p => [p.id, p]))

    // ── 4. Validate discount code server-side ────────────────────────────────
    let discountPercent = 0
    if (discount_code && typeof discount_code === 'string') {
      const code = discount_code.trim().toUpperCase()
      // Check DB-managed codes first
      const { data: dbCode } = await supabase
        .from('discount_codes')
        .select('percent')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()
      if (dbCode) {
        discountPercent = dbCode.percent
      } else {
        discountPercent = DISCOUNT_CODES[code] ?? 0
      }
    }

    // ── 5. Compute authoritative price per item ──────────────────────────────
    // Trial orders (first COD order) have no deposit for any product
    const itemsWithPrice = validatedItems.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      product: productMap[item.product_id],
      linePrice: Math.round(productMap[item.product_id].price * item.quantity * (1 - discountPercent / 100)),
    }))
    const totalPrice = itemsWithPrice.reduce((sum, i) => sum + i.linePrice, 0)

    // ── 6. Check for duplicate orders on this date (per product) ─────────────
    for (const item of itemsWithPrice) {
      const { data: dup } = await supabase
        .from('orders').select('id')
        .eq('user_id', user.id)
        .eq('delivery_date', delivery_date)
        .eq('product_id', item.product_id)
        .maybeSingle()
      if (dup) {
        return NextResponse.json({ error: `You already have an order for ${item.product.size} on this date.` }, { status: 409 })
      }
    }

    // ── 7. Insert with server-computed values ────────────────────────────────
    const orderRows = itemsWithPrice.map(item => ({
      user_id: user.id,
      product_id: item.product_id,
      quantity: item.quantity,
      total_price: item.linePrice,
      delivery_date,
      delivery_slot,
      delivery_mode,
      bottle_deposit: 0,
      status: 'pending',
      payment_method: 'COD',
    }))
    const { data: orders, error: insertError } = await supabaseAdmin
      .from('orders').insert(orderRows).select('id')

    if (insertError) {
      console.error('[orders/create] Insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log('[orders/create] Created', orders.length, 'order(s) for user:', user.id, 'date:', delivery_date)

    // ── 8. Mark COD trial as used (one COD order allowed per customer) ───────
    await supabaseAdmin
      .from('profiles')
      .update({ has_used_cod: true })
      .eq('id', user.id)

    // ── 9. Send confirmation email + WhatsApp (non-blocking) ────────────────
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || user.email
      const orderSummary = itemsWithPrice.map(i => `${i.product.size} ×${i.quantity}`).join(', ')
      // Use first item for WA template (template only supports one product)
      const firstItem = itemsWithPrice[0]
      await sendOrderConfirmationEmail({
        to: user.email, name,
        product: itemsWithPrice.length === 1 ? firstItem.product.size : orderSummary,
        quantity: firstItem.quantity,
        deliveryDate: delivery_date, deliverySlot: delivery_slot, totalAmount: totalPrice,
      })
      await sendOrderConfirmed(
        profile?.phone, name,
        itemsWithPrice.length === 1 ? `${firstItem.product.size} x${firstItem.quantity}` : orderSummary,
        delivery_date,
        delivery_slot === 'morning' ? '7AM–9AM' : '5PM–7PM',
        totalPrice,
      )
    } catch { /* non-blocking */ }
    return NextResponse.json({ success: true, order_count: orders.length })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
