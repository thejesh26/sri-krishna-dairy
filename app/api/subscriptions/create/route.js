import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendSubscriptionConfirmationEmail } from '../../../lib/email'

/**
 * SECURITY: Server-side subscription creation.
 *
 * Closes the same injection classes as /api/orders/create:
 *  - VULN-06: bottle_deposit was client-supplied; set to 0 to skip deposit
 *  - VULN-13: quantity, dates, and enum fields had no server-side validation
 *
 * Also note: the daily deduction cron job computes the charge from
 * products.price * quantity (DB values) — so subscription pricing was not
 * directly injectable. However, bottle_deposit IS stored and referenced, and
 * all input should be validated server-side regardless.
 */

const VALID_DELIVERY_SLOTS = ['morning', 'evening']
const VALID_DELIVERY_MODES = ['keep_bottle', 'direct']
const VALID_SUBSCRIPTION_TYPES = ['ongoing', 'fixed', 'oneday']
const BOTTLE_DEPOSIT_PER_UNIT = 100
const MIN_BOTTLE_UNITS = 2

const DISCOUNT_CODES = {
  ...(process.env.DISCOUNT_CODE_1 ? { [process.env.DISCOUNT_CODE_1]: 10 } : {}),
  ...(process.env.DISCOUNT_CODE_2 ? { [process.env.DISCOUNT_CODE_2]: 20 } : {}),
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
      start_date,
      end_date,
      delivery_slot,
      subscription_type,
      delivery_mode,
      discount_code,
    } = body

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
    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return NextResponse.json({ error: 'Invalid start date.' }, { status: 400 })
    }
    if (!VALID_DELIVERY_SLOTS.includes(delivery_slot)) {
      return NextResponse.json({ error: 'Invalid delivery slot.' }, { status: 400 })
    }
    if (!VALID_SUBSCRIPTION_TYPES.includes(subscription_type)) {
      return NextResponse.json({ error: 'Invalid subscription type.' }, { status: 400 })
    }
    if (!VALID_DELIVERY_MODES.includes(delivery_mode)) {
      return NextResponse.json({ error: 'Invalid delivery mode.' }, { status: 400 })
    }

    // Must start at least 12 hours from now
    const startMs = new Date(start_date).getTime()
    if ((startMs - Date.now()) / (1000 * 60 * 60) < 12) {
      return NextResponse.json(
        { error: 'Subscription must start at least 12 hours from now.' },
        { status: 400 }
      )
    }

    // Validate end_date for fixed subscriptions
    let resolvedEndDate = null
    if (subscription_type === 'oneday') {
      resolvedEndDate = start_date
    } else if (subscription_type === 'fixed') {
      if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return NextResponse.json(
          { error: 'End date is required for fixed subscriptions.' },
          { status: 400 }
        )
      }
      if (new Date(end_date) <= new Date(start_date)) {
        return NextResponse.json(
          { error: 'End date must be after start date.' },
          { status: 400 }
        )
      }
      resolvedEndDate = end_date
    }

    // ── 3. Verify product exists and is available ────────────────────────────
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, price, size, is_available')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 })
    }
    if (!product.is_available) {
      return NextResponse.json({ error: 'Product is currently unavailable.' }, { status: 400 })
    }

    // ── 4. Validate discount code ────────────────────────────────────────────
    let discountPercent = 0
    if (discount_code && typeof discount_code === 'string') {
      discountPercent = DISCOUNT_CODES[discount_code.trim().toUpperCase()] ?? 0
    }

    // ── 5. Compute authoritative bottle deposit ──────────────────────────────
    // Note: daily charge is always recomputed by the cron job from products.price
    // so discountPercent here is informational only (stored for reference if needed)
    const bottleDeposit =
      delivery_mode === 'keep_bottle'
        ? BOTTLE_DEPOSIT_PER_UNIT * Math.max(MIN_BOTTLE_UNITS, qty)
        : 0

    // ── 6. Check for existing active subscription ────────────────────────────
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingSub) {
      return NextResponse.json(
        { error: 'You already have an active subscription.' },
        { status: 409 }
      )
    }

    // ── 7. Insert with server-computed values ────────────────────────────────
    const { data: sub, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        product_id: product.id,
        quantity: qty,
        start_date,
        end_date: resolvedEndDate,
        delivery_slot,
        subscription_type,
        delivery_mode,
        bottle_deposit: bottleDeposit,
        discount_percent: discountPercent,
        is_active: true,
        paused_dates: [],
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // ── 8. Send confirmation email (non-blocking) ────────────────────────────
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const dailyAmount = Math.round(product.price * qty * (1 - discountPercent / 100))

      await sendSubscriptionConfirmationEmail({
        to: user.email,
        name: profile?.full_name || user.email,
        product: product.size,
        quantity: qty,
        startDate: start_date,
        deliverySlot: delivery_slot,
        dailyAmount,
      })
    } catch {
      // Email failure must not block subscription creation
    }

    return NextResponse.json({ success: true, subscription_id: sub.id })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
