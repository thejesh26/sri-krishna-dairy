import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendSubscriptionConfirmationEmail } from '../../../lib/email'
import { notifySubscriptionActivated } from '../../../lib/whatsapp'

const VALID_DELIVERY_SLOTS = ['morning', 'evening']
const VALID_DELIVERY_MODES = ['keep_bottle', 'direct']
const VALID_SUBSCRIPTION_TYPES = ['ongoing', 'fixed', 'oneday']
const VALID_FREQUENCIES = ['daily', 'alternate', 'weekly']
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
    // Parse body early to get delivery_slot for the slot check below
    const body = await request.json()
    const delivery_slot_check = body.delivery_slot
    // Check delivery slot is enabled
    const slotKey = delivery_slot_check === 'morning' ? 'morning_slot_enabled' : 'evening_slot_enabled'
    const { data: slotSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', slotKey)
      .maybeSingle()
    if (slotSetting?.value === 'false') {
      return NextResponse.json({ error: `${delivery_slot_check} slot is currently unavailable.` }, { status: 403 })
    }

    const {
      items,
      start_date,
      end_date,
      delivery_slot,
      subscription_type,
      delivery_mode,
      discount_code,
      wallet_only = false,
      additional_deposit = 0,
      delivery_frequency = 'daily',
    } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one product item is required.' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.product_id) return NextResponse.json({ error: 'Each item requires a product_id.' }, { status: 400 })
      const qty = parseInt(item.quantity, 10)
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        return NextResponse.json({ error: 'Each item quantity must be between 1 and 20.' }, { status: 400 })
      }
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
    const freq = VALID_FREQUENCIES.includes(delivery_frequency) ? delivery_frequency : 'daily'

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

    // ── 3. Verify all products ───────────────────────────────────────────────
    const productIds = items.map(i => i.product_id)
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, price, size, is_available')
      .in('id', productIds)

    if (productError || !products?.length) {
      return NextResponse.json({ error: 'Products not found.' }, { status: 404 })
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))

    for (const item of items) {
      const p = productMap[item.product_id]
      if (!p) return NextResponse.json({ error: `Product ${item.product_id} not found.` }, { status: 404 })
      if (!p.is_available) return NextResponse.json({ error: `Product ${p.size} is currently unavailable.` }, { status: 400 })
    }

    // ── 4. Validate discount code ────────────────────────────────────────────
    let discountPercent = 0
    let usedDbCode = null
    if (discount_code && typeof discount_code === 'string') {
      const code = discount_code.trim().toUpperCase()
      const { data: dbCode } = await supabase
        .from('discount_codes')
        .select('id, percent, one_time_per_customer')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()
      if (dbCode) {
        discountPercent = dbCode.percent
        usedDbCode = dbCode
      } else {
        discountPercent = DISCOUNT_CODES[code] ?? 0
      }
    }

    // ── 5. Compute totals ────────────────────────────────────────────────────
    const parsedItems = items.map(item => ({
      ...item,
      quantity: parseInt(item.quantity, 10),
      product: productMap[item.product_id],
    }))

    const totalQty = parsedItems.reduce((s, i) => s + i.quantity, 0)
    const bottleDeposit = delivery_mode === 'keep_bottle' ? BOTTLE_DEPOSIT_PER_UNIT * totalQty : 0
    const addlDeposit = Math.min(Math.max(0, Number(additional_deposit) || 0), bottleDeposit)

    const dailyAmount = parsedItems.reduce((sum, i) =>
      sum + Math.round(i.product.price * i.quantity * (1 - discountPercent / 100)), 0)

    // ── 6. WALLET-ONLY PATH ──────────────────────────────────────────────────
    if (wallet_only) {
      const calendarDays = subscription_type === 'oneday' ? 1
        : subscription_type === 'fixed' && resolvedEndDate
          ? Math.max(1, Math.round((new Date(resolvedEndDate) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1)
          : 30

      const deliveryCount = (() => {
        if (freq === 'alternate') return Math.floor(calendarDays / 2) + (calendarDays % 2 === 1 ? 1 : 0)
        if (freq === 'weekly') return Math.floor(calendarDays / 7) + 1
        return calendarDays
      })()

      const totalNeeded = dailyAmount * deliveryCount + addlDeposit

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

      const insertRows = parsedItems.map(item => ({
        user_id: user.id,
        product_id: item.product_id,
        quantity: item.quantity,
        start_date,
        end_date: resolvedEndDate,
        delivery_slot,
        subscription_type,
        delivery_mode,
        delivery_frequency: freq,
        bottle_deposit: delivery_mode === 'keep_bottle' ? BOTTLE_DEPOSIT_PER_UNIT * item.quantity : 0,
        discount_percent: discountPercent,
        is_active: true,
        paused_dates: [],
      }))

      const { data: subs, error: insertError } = await supabase
        .from('subscriptions')
        .insert(insertRows)
        .select('id')

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      if (usedDbCode?.one_time_per_customer) {
        await supabase.from('discount_code_usage').upsert(
          { code_id: usedDbCode.id, user_id: user.id },
          { onConflict: 'code_id,user_id' }
        ).catch(() => {})
      }

      // Notifications (non-blocking)
      try {
        const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
        const name = profile?.full_name || user.email
        const firstItem = parsedItems[0]
        await sendSubscriptionConfirmationEmail({
          to: user.email, name, product: firstItem.product.size, quantity: firstItem.quantity,
          startDate: start_date, deliverySlot: delivery_slot, dailyAmount,
        })
        await notifySubscriptionActivated({
          phone: profile?.phone, name, size: firstItem.product.size, quantity: firstItem.quantity,
          startDate: start_date, slot: delivery_slot, dailyAmount, frequency: freq,
        })
      } catch { /* non-blocking */ }

      return NextResponse.json({ success: true, subscription_ids: subs.map(s => s.id) })
    }

    // ── 7. RAZORPAY PATH — create pending subscriptions ──────────────────────
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('is_active', false)

    const insertRows = parsedItems.map(item => ({
      user_id: user.id,
      product_id: item.product_id,
      quantity: item.quantity,
      start_date,
      end_date: resolvedEndDate,
      delivery_slot,
      subscription_type,
      delivery_mode,
      delivery_frequency: freq,
      bottle_deposit: delivery_mode === 'keep_bottle' ? BOTTLE_DEPOSIT_PER_UNIT * item.quantity : 0,
      discount_percent: discountPercent,
      is_active: false,
      paused_dates: [],
    }))

    const { data: subs, error: insertError } = await supabase
      .from('subscriptions')
      .insert(insertRows)
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, subscription_ids: subs.map(s => s.id) })

  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
