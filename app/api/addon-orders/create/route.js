import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendAddonOrderEmail } from '../../../lib/email'
import { notifyAddonOrderConfirmed } from '../../../lib/whatsapp'

const VALID_DELIVERY_SLOTS = ['morning', 'evening']

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must have an active subscription
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id, delivery_slot')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!activeSub) {
      return NextResponse.json({ error: 'Add-on orders require an active subscription.' }, { status: 403 })
    }

    const { product_id, quantity, dates, delivery_slot } = await request.json()

    if (!product_id || !dates?.length || dates.length > 30) {
      return NextResponse.json({ error: 'product_id and 1-30 dates are required.' }, { status: 400 })
    }
    const qty = parseInt(quantity, 10)
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 20.' }, { status: 400 })
    }
    const slot = VALID_DELIVERY_SLOTS.includes(delivery_slot) ? delivery_slot : activeSub.delivery_slot

    // Validate all dates are in the future
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= today) {
        return NextResponse.json({ error: `Invalid or past date: ${d}` }, { status: 400 })
      }
    }

    // Fetch product price
    const { data: product } = await supabase
      .from('products')
      .select('id, price, size, is_available')
      .eq('id', product_id)
      .single()

    if (!product?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable.' }, { status: 404 })
    }

    const pricePerDay = Math.round(product.price * qty)
    const totalAmount = pricePerDay * dates.length

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallet')
      .select('id, balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!wallet || (wallet.balance || 0) < totalAmount) {
      return NextResponse.json({
        error: `Insufficient wallet balance. Required: ₹${totalAmount}, Available: ₹${wallet?.balance || 0}`,
      }, { status: 400 })
    }

    // Create addon_orders for each date
    const insertRows = dates.map(d => ({
      user_id: user.id,
      subscription_id: activeSub.id,
      product_id: product.id,
      quantity: qty,
      delivery_date: d,
      delivery_slot: slot,
      total_price: pricePerDay,
      status: 'pending',
    }))

    const { data: addonOrders, error: insertError } = await supabase
      .from('addon_orders')
      .insert(insertRows)
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Deduct total from wallet
    await supabase
      .from('wallet')
      .update({ balance: (wallet.balance || 0) - totalAmount })
      .eq('user_id', user.id)

    // Record wallet transaction
    const dateRange = dates.length === 1
      ? dates[0]
      : `${dates[0]} to ${dates[dates.length - 1]}`
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount: totalAmount,
      type: 'debit',
      description: `Add-on order: ${product.size} x${qty} for ${dateRange} (${dates.length} day${dates.length !== 1 ? 's' : ''})`,
    })

    // Send notifications — non-blocking
    try {
      const { data: profile } = await supabase
        .from('profiles').select('full_name, phone').eq('id', user.id).single()
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
      const email = authUser?.user?.email
      const name = profile?.full_name || email || 'Customer'

      if (email) {
        await sendAddonOrderEmail({ to: email, name, dates, product: product.size, quantity: qty, totalAmount })
      }
      if (profile?.phone) {
        await notifyAddonOrderConfirmed({ phone: profile.phone, name, dates, product: product.size, quantity: qty, totalAmount })
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, order_count: addonOrders.length, total_amount: totalAmount })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
