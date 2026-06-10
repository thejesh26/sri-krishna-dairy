import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { sendOrderConfirmationEmail } from '../../../lib/email'
import { sendOrderConfirmed } from '../../../lib/whatsapp'

const VALID_DELIVERY_SLOTS = ['morning', 'evening']
const VALID_DELIVERY_MODES = ['keep_bottle', 'direct']
const VALID_PAYMENT_METHODS = ['COD', 'wallet', 'razorpay']

// Trial price caps — server-side validation; client must not exceed these
const TRIAL_PRICE_CAPS = { '1L': 60, '500ml': 35 }

// Mirror of DISCOUNT_CODES in validate-discount/route.js — single source of truth
const DISCOUNT_CODES = {
  ...(process.env.DISCOUNT_CODE_1 ? { [process.env.DISCOUNT_CODE_1]: 10 } : {}),
  ...(process.env.DISCOUNT_CODE_2 ? { [process.env.DISCOUNT_CODE_2]: 20 } : {}),
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00+05:30')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export async function POST(request) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────────────────────
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    // ── 2. Parse & validate input ────────────────────────────────────────────
    const body = await request.json()
    const {
      items, delivery_date, delivery_slot, delivery_mode, discount_code,
      payment_method = 'COD',
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
    } = body

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

    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return NextResponse.json({ error: 'Invalid payment method.' }, { status: 400 })
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
      const trialUnitPrice = item.trial_unit_price != null ? parseFloat(item.trial_unit_price) : null
      validatedItems.push({ product_id: item.product_id, quantity: qty, trialUnitPrice })
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

    const tomorrowIST = new Date()
    tomorrowIST.setDate(tomorrowIST.getDate() + 1)
    const tomorrowStr = tomorrowIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    if (delivery_date < tomorrowStr) {
      return NextResponse.json({ error: 'Orders must be placed by midnight for next day delivery.' }, { status: 400 })
    }

    // ── 3. Check trial eligibility ───────────────────────────────────────────
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

    // ── 4. Verify Razorpay signature (if Razorpay payment) ───────────────────
    if (payment_method === 'razorpay') {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Razorpay payment details required.' }, { status: 400 })
      }
      const sigBody = razorpay_order_id + '|' + razorpay_payment_id
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sigBody)
        .digest('hex')
      if (expectedSig !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature.' }, { status: 400 })
      }
      // Idempotency: prevent duplicate orders for the same Razorpay payment
      const { data: existingTx } = await supabaseAdmin
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('description', `Trial payment [${razorpay_payment_id}]`)
        .limit(1)
      if (existingTx?.length) {
        return NextResponse.json({ success: true, idempotent: true })
      }
    }

    // ── 5. Fetch the real product prices from the DB (never trust client) ─────
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

    // ── 6. Validate trial price caps and compute per-item prices ─────────────
    const itemsWithPrice = []
    for (const item of validatedItems) {
      const product = productMap[item.product_id]
      const cap = TRIAL_PRICE_CAPS[product.size]
      let unitPrice = item.trialUnitPrice ?? cap ?? product.price
      if (cap && unitPrice > cap) {
        return NextResponse.json({ error: 'Invalid trial price.' }, { status: 400 })
      }
      const linePrice = Math.round(unitPrice * item.quantity)
      itemsWithPrice.push({ product_id: item.product_id, quantity: item.quantity, product, unitPrice, linePrice })
    }

    const totalTrialPrice = itemsWithPrice.reduce((sum, i) => sum + i.linePrice * 3, 0)

    // ── 7. Check for duplicate orders on all 3 trial dates ───────────────────
    const deliveryDates = [delivery_date, addDays(delivery_date, 1), addDays(delivery_date, 2)]
    for (const item of itemsWithPrice) {
      for (const date of deliveryDates) {
        const { data: dup } = await supabaseAdmin
          .from('orders').select('id')
          .eq('user_id', user.id)
          .eq('delivery_date', date)
          .eq('product_id', item.product_id)
          .maybeSingle()
        if (dup) {
          return NextResponse.json({ error: `You already have an order for ${item.product.size} on ${date}.` }, { status: 409 })
        }
      }
    }

    // ── 8. Wallet deduction upfront (if wallet payment) ──────────────────────
    if (payment_method === 'wallet') {
      const { error: walletError } = await supabaseAdmin.rpc('deduct_wallet', {
        p_user_id: user.id,
        p_amount: totalTrialPrice,
        p_description: `3-day trial payment [${delivery_date}]`,
      })
      if (walletError) {
        return NextResponse.json({ error: 'Insufficient wallet balance for 3-day trial.' }, { status: 400 })
      }
    }

    // ── 9. Insert 3 order rows per item ──────────────────────────────────────
    const orderRows = []
    for (const item of itemsWithPrice) {
      for (const date of deliveryDates) {
        orderRows.push({
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          total_price: item.linePrice,
          delivery_date: date,
          delivery_slot,
          delivery_mode,
          bottle_deposit: 0,
          status: 'pending',
          payment_method,
        })
      }
    }

    const { data: orders, error: insertError } = await supabaseAdmin
      .from('orders').insert(orderRows).select('id')

    if (insertError) {
      console.error('[orders/create] Insert error:', insertError.message)
      // Rollback wallet deduction if wallet payment failed after deduction
      if (payment_method === 'wallet') {
        await supabaseAdmin.rpc('credit_wallet', {
          p_user_id: user.id,
          p_amount: totalTrialPrice,
          p_description: `3-day trial rollback [${delivery_date}]`,
        }).catch(() => {})
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const orderIds = orders.map(o => o.id)
    console.log('[orders/create] Created', orders.length, '3-day trial orders for user:', user.id)

    // ── 10. Record Razorpay idempotency marker ───────────────────────────────
    if (payment_method === 'razorpay') {
      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: user.id,
        amount: totalTrialPrice,
        type: 'debit',
        description: `Trial payment [${razorpay_payment_id}]`,
      }).catch(() => {})
    }

    // ── 11. Mark trial as used ───────────────────────────────────────────────
    await supabaseAdmin
      .from('profiles')
      .update({ has_used_cod: true })
      .eq('id', user.id)

    // ── 12. Send confirmation (non-blocking) ─────────────────────────────────
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || user.email
      const firstItem = itemsWithPrice[0]
      const orderSummary = itemsWithPrice.map(i => `${i.product.size} ×${i.quantity}`).join(', ')
      const dateLabel = new Date(delivery_date + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      await sendOrderConfirmationEmail({
        to: user.email, name,
        product: itemsWithPrice.length === 1 ? firstItem.product.size : orderSummary,
        quantity: firstItem.quantity,
        deliveryDate: `${dateLabel} (3-day trial)`, deliverySlot: delivery_slot, totalAmount: totalTrialPrice,
      })
      await sendOrderConfirmed(
        profile?.phone, name,
        itemsWithPrice.length === 1 ? `${firstItem.product.size} x${firstItem.quantity}` : orderSummary,
        `${delivery_date} (3-day trial)`,
        delivery_slot === 'morning' ? '7AM–9AM' : '5PM–7PM',
        totalTrialPrice,
      )
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, order_count: orders.length, order_ids: orderIds })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
