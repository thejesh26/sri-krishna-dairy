import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

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

    const { subscription_id, new_product_id } = await request.json()
    if (!subscription_id || !new_product_id) {
      return NextResponse.json({ error: 'subscription_id and new_product_id are required.' }, { status: 400 })
    }

    // Verify ownership and active status
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, product_id, quantity, products(size, price)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    // Verify new product exists and is available
    const { data: newProduct } = await supabase
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
    await supabase
      .from('subscriptions')
      .update({ product_id: newProduct.id })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    const newDailyAmount = Math.round(newProduct.price * sub.quantity)

    return NextResponse.json({
      success: true,
      new_product: newProduct.size,
      new_daily_cost: newDailyAmount,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
