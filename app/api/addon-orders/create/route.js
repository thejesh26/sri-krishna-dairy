import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { getISTDate } from '../../../lib/pricing'
import { sendAddonOrderEmail } from '../../../lib/email'
import { notifyAddonOrderConfirmed } from '../../../lib/whatsapp'

const VALID_DELIVERY_SLOTS = ['morning', 'evening']

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    // Must have an active subscription
    const { data: activeSub } = await supabaseAdmin
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
    const today = getISTDate()
    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d <= today) {
        return NextResponse.json({ error: `Invalid or past date: ${d}` }, { status: 400 })
      }
    }

    // Fetch product price
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, price, size, is_available')
      .eq('id', product_id)
      .single()

    if (!product?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable.' }, { status: 404 })
    }

    const pricePerDay = Math.round(product.price * qty)

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

    const { data: addonOrders, error: insertError } = await supabaseAdmin
      .from('addon_orders')
      .insert(insertRows)
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Send notifications — non-blocking
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('full_name, phone').eq('id', user.id).single()
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
      const email = authUser?.user?.email
      const name = profile?.full_name || email || 'Customer'

      if (email) {
        await sendAddonOrderEmail({ to: email, name, dates, product: product.size, quantity: qty, totalAmount: pricePerDay * dates.length })
      }
      if (profile?.phone) {
        await notifyAddonOrderConfirmed({
          phone: profile.phone,
          name,
          dates,
          product: product.size,
          quantity: qty,
          totalAmount: pricePerDay * dates.length,
          message: 'Payment will be deducted on delivery.',
        })
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, order_count: addonOrders.length })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
