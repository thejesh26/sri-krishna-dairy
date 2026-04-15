import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendSubscriptionConfirmationEmail } from '../../../lib/email'
import { notifySubscriptionActivated } from '../../../lib/whatsapp'

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
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
      // wallet_only: true  → activate immediately from wallet, no Razorpay
      // wallet_only: false → create pending subscription, Razorpay will activate
      wallet_only = false,
      // additional_deposit: only the incremental deposit this user needs to pay
      // (full deposit minus any deposit_balance they already have)
      additional_deposit = 0,
    } = body

    if (!product_id || (typeof product_id !== 'string' && typeof product_id !== 'number')) {
      return NextResponse.json({ error: 'Invalid product.' }, { status: 400 })
    }
    const qty = parseInt(quantity, 10)
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 20.' }, { status: 400 })
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

    const startMs = new Date(start_date).getTime()
    if ((startMs - Date.now()) / (1000 * 60 * 60) < 12) {
      return NextResponse.json({ error: 'Subscription must start at least 12 hours from now.' }, { status: 400 })
    }

    let resolvedEndDate = null
    if (subscription_type === 'oneday') {
      resolvedEndDate = start_date
    } else if (subscription_type === 'fixed') {
      if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return NextResponse.json({ error: 'End date is required for fixed subscriptions.' }, { status: 400 })
      }
      if (new Date(end_date) <= new Date(start_date)) {
        return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 })
      }
      resolvedEndDate = end_date
    }

    // ── 3. Verify product ────────────────────────────────────────────────────
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

    // ── 5. Compute bottle deposit ────────────────────────────────────────────
    // Full deposit for this subscription (used for record-keeping on the row)
    const bottleDeposit = delivery_mode === 'keep_bottle' ? BOTTLE_DEPOSIT_PER_UNIT * qty : 0
    // Incremental deposit: validated server-side — must not exceed full bottleDeposit
    const addlDeposit = Math.min(Math.max(0, Number(additional_deposit) || 0), bottleDeposit)

    // ── 6. Check for existing active subscription ────────────────────────────
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingSub) {
      return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 })
    }

    // ── 7a. WALLET-ONLY PATH ─────────────────────────────────────────────────
    // Customer has enough wallet balance — no Razorpay needed.
    if (wallet_only) {
      const dailyAmount = Math.round(product.price * qty * (1 - discountPercent / 100))
      const totalDays = subscription_type === 'oneday' ? 1
        : subscription_type === 'fixed' && resolvedEndDate
          ? Math.max(1, Math.ceil((new Date(resolvedEndDate) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1)
          : 30

      // Wallet must cover: milk buffer for totalDays + additional deposit
      const totalNeeded = dailyAmount * totalDays + addlDeposit

      const { data: wallet } = await supabase
        .from('wallet')
        .select('id, balance, deposit_balance')
        .eq('user_id', user.id)
        .maybeSingle()

      const walletBalance = wallet?.balance || 0

      if (walletBalance < totalNeeded) {
        return NextResponse.json(
          { error: `Insufficient wallet balance. Need ₹${totalNeeded}, have ₹${walletBalance}.` },
          { status: 400 }
        )
      }

      // Transfer additional deposit from spendable balance → deposit_balance
      if (addlDeposit > 0 && wallet) {
        await supabase.from('wallet').update({
          deposit_balance: (wallet.deposit_balance || 0) + addlDeposit,
        }).eq('user_id', user.id)
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          amount: addlDeposit,
          type: 'debit',
          description: 'Bottle deposit for subscription activation',
        })
      }

      // Create subscription — active immediately
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

      // Notifications (non-blocking)
      try {
        const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
        const name = profile?.full_name || user.email
        await sendSubscriptionConfirmationEmail({
          to: user.email, name, product: product.size, quantity: qty,
          startDate: start_date, deliverySlot: delivery_slot, dailyAmount,
        })
        await notifySubscriptionActivated({
          phone: profile?.phone, name, size: product.size, quantity: qty,
          startDate: start_date, slot: delivery_slot, dailyAmount,
        })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, subscription_id: sub.id })
    }

    // ── 7b. RAZORPAY PATH — create pending subscription ──────────────────────
    // Payment hasn't happened yet. Create with is_active = false.
    // verify-payment will set is_active = true after payment succeeds.

    // Clean up stale pending subscriptions for this user (idempotency / cleanup)
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('is_active', false)

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
        is_active: false,   // ← pending; verify-payment activates this
        paused_dates: [],
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Notifications are sent after activation (in verify-payment path)
    // We return the subscription_id so the client can pass it to verify-payment
    return NextResponse.json({ success: true, subscription_id: sub.id })

  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
