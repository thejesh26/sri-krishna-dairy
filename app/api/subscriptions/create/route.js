import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendSubscriptionConfirmationEmail } from '../../../lib/email'
import { notifySubscriptionActivated } from '../../../lib/whatsapp'

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
const BOTTLE_DEPOSIT_PER_UNIT = 200

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

    if (!product_id || (typeof product_id !== 'string' && typeof product_id !== 'number')) {
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

    // ── 5. Compute authoritative bottle deposit ──────────────────────────────
    // Note: daily charge is always recomputed by the cron job from products.price
    // so discountPercent here is informational only (stored for reference if needed)
    // Deposit applies to all products on subscriptions (subscribe page is for committed customers)
    const bottleDeposit =
      delivery_mode === 'keep_bottle'
        ? BOTTLE_DEPOSIT_PER_UNIT * qty
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

    // ── 8. Track bottle deposit in wallet.deposit_balance ───────────────────
    if (bottleDeposit > 0) {
      try {
        const { data: walletRow } = await supabase
          .from('wallet')
          .select('id, deposit_balance')
          .eq('user_id', user.id)
          .maybeSingle()

        if (walletRow) {
          await supabase
            .from('wallet')
            .update({ deposit_balance: (walletRow.deposit_balance || 0) + bottleDeposit })
            .eq('user_id', user.id)
        } else {
          await supabase
            .from('wallet')
            .insert({ user_id: user.id, balance: 0, deposit_balance: bottleDeposit })
        }
      } catch {
        // Deposit tracking failure must not block subscription creation
      }
    }

    // ── 9. Send confirmation email + WhatsApp (non-blocking) ────────────────
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      const name = profile?.full_name || user.email
      const dailyAmount = Math.round(product.price * qty * (1 - discountPercent / 100))

      await sendSubscriptionConfirmationEmail({
        to: user.email,
        name,
        product: product.size,
        quantity: qty,
        startDate: start_date,
        deliverySlot: delivery_slot,
        dailyAmount,
      })

      await notifySubscriptionActivated({
        phone: profile?.phone,
        name,
        size: product.size,
        quantity: qty,
        startDate: start_date,
        slot: delivery_slot,
        dailyAmount,
      })
    } catch {
      // Notification failure must not block subscription creation
    }

    return NextResponse.json({ success: true, subscription_id: sub.id })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
