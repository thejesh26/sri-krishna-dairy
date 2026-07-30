import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { calcDailyAmount } from '../../../lib/pricing'
import { notifyAdmin } from '../../../lib/whatsapp'
import { createAdminNotification } from '../../../lib/notify'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { subscription_id, new_product_id } = await request.json()
    if (!subscription_id || !new_product_id) {
      return NextResponse.json({ error: 'subscription_id and new_product_id are required.' }, { status: 400 })
    }

    // Verify ownership and active status
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, product_id, quantity, discount_percent, products(size, price)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    // Verify new product exists and is available
    const { data: newProduct } = await supabaseAdmin
      .from('products')
      .select('id, size, price, is_available')
      .eq('id', new_product_id)
      .single()

    if (!newProduct?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable.' }, { status: 404 })
    }

    if (newProduct.id === sub.product_id) {
      return NextResponse.json({ error: 'That is already your current product.' }, { status: 400 })
    }

    // Update subscription product_id — effective from next delivery
    await supabaseAdmin
      .from('subscriptions')
      .update({ product_id: newProduct.id })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    const newDailyAmount = calcDailyAmount(newProduct.price, sub.quantity, sub.discount_percent || 0)

    // Notify admin of the change (non-blocking)
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || user.email
      await notifyAdmin(
        `Subscription Product Changed — ${name}`,
        `🔄 Product updated\nCustomer: ${name}\nProduct: ${sub.products?.size || 'Milk'} → ${newProduct.size}\nQuantity: ${sub.quantity}\nPhone: ${profile?.phone || 'N/A'}`
      )
      await createAdminNotification({
        type: 'product_change',
        title: `Product changed — ${name}`,
        body: `${sub.products?.size || 'Milk'} → ${newProduct.size} (x${sub.quantity}) | Phone: ${profile?.phone || 'N/A'}`,
        link_tab: 'customers',
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      new_product: newProduct.size,
      new_daily_cost: newDailyAmount,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
