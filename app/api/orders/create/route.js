import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * SECURITY: Server-side order creation.
 *
 * Vulnerabilities this closes:
 *  - VULN-01: Price injection — total_price was previously calculated client-side and
 *             sent raw to Supabase. An attacker could intercept the request in DevTools
 *             and set total_price: 0.
 *  - VULN-06: Bottle deposit injection — bottle_deposit was passed from the client.
 *             An attacker could send bottle_deposit: 0 to skip the deposit requirement.
 *  - VULN-13: Quantity/field injection — no server-side range checks existed.
 *
 * This route:
 *  1. Authenticates the user via JWT (bearer token)
 *  2. Validates all input fields (types, ranges, formats)
 *  3. Fetches the real product price from the database — never trusts client
 *  4. Validates the discount code server-side if provided
 *  5. Recalculates total_price and bottle_deposit authoritatively
 *  6. Inserts the order with the correct, server-computed price
 */

const VALID_DELIVERY_SLOTS = ['morning', 'evening']
const VALID_DELIVERY_MODES = ['keep_bottle', 'direct']
const BOTTLE_DEPOSIT_PER_UNIT = 100
const MIN_BOTTLE_UNITS = 2

// Mirror of DISCOUNT_CODES in validate-discount/route.js — single source of truth
const DISCOUNT_CODES = {
  [process.env.DISCOUNT_CODE_1 || 'NEWMILK10']: 10,
  [process.env.DISCOUNT_CODE_2 || 'KRISHNA20']: 20,
}

export async function POST(request) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.slice(7)
    )
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Parse & validate input ────────────────────────────────────────────
    const body = await request.json()
    const {
      product_id,
      quantity,
      delivery_date,
      delivery_slot,
      delivery_mode,
      discount_code,
    } = body

    // Type and range checks — never trust client values
    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
    }
    const qty = parseInt(quantity, 10)
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 20.' },
        { status: 400 }
      )
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

    // ── 3. Fetch the real product price from the DB (never trust client) ─────
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, price, is_available')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }
    if (!product.is_available) {
      return NextResponse.json({ error: 'Product is currently unavailable.' }, { status: 400 })
    }

    // ── 4. Validate discount code server-side ────────────────────────────────
    let discountPercent = 0
    if (discount_code && typeof discount_code === 'string') {
      discountPercent = DISCOUNT_CODES[discount_code.trim().toUpperCase()] ?? 0
    }

    // ── 5. Compute authoritative price ──────────────────────────────────────
    const milkPrice = Math.round(product.price * qty * (1 - discountPercent / 100))
    const bottleDeposit =
      delivery_mode === 'keep_bottle'
        ? BOTTLE_DEPOSIT_PER_UNIT * Math.max(MIN_BOTTLE_UNITS, qty)
        : 0
    const totalPrice = milkPrice + bottleDeposit

    // ── 6. Check for duplicate order on this date ────────────────────────────
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('delivery_date', delivery_date)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json(
        { error: 'You already have an order for this date.' },
        { status: 409 }
      )
    }

    // ── 7. Insert with server-computed values ────────────────────────────────
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,         // from JWT — cannot be forged by client
        product_id: product.id,   // re-confirmed from DB
        quantity: qty,             // validated integer
        total_price: totalPrice,   // server-computed
        delivery_date,
        delivery_slot,
        delivery_mode,
        bottle_deposit: bottleDeposit, // server-computed
        status: 'pending',
        payment_method: 'COD',
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, order_id: order.id })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
