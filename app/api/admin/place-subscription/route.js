import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { calcDailyAmount } from '../../../lib/pricing'
import { notifySubscriptionActivated } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const {
      target_user_id, product_id, quantity, delivery_slot,
      delivery_frequency, subscription_type, start_date, end_date,
      discount_percent,
    } = await request.json()

    if (!target_user_id || !product_id || !start_date) {
      return NextResponse.json({ error: 'target_user_id, product_id, and start_date are required' }, { status: 400 })
    }

    const qty = parseInt(quantity, 10) || 1

    // Check for existing active subscription
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', target_user_id)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Customer already has an active subscription' }, { status: 409 })
    }

    const { data: product } = await supabaseAdmin
      .from('products').select('id, name, size, price, is_available').eq('id', product_id).single()
    if (!product?.is_available) {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 404 })
    }

    const discountPct = Math.min(Math.max(0, Number(discount_percent) || 0), 100)
    const dailyAmount = calcDailyAmount(product.price, qty, discountPct)

    const insertData = {
      user_id: target_user_id,
      product_id: product.id,
      quantity: qty,
      delivery_slot: delivery_slot || 'morning',
      delivery_frequency: delivery_frequency || 'daily',
      subscription_type: subscription_type || 'ongoing',
      discount_percent: discountPct,
      start_date,
      is_active: true,
    }
    if (subscription_type === 'fixed' && end_date) {
      insertData.end_date = end_date
    }

    const { data: subscription, error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert(insertData)
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Notify customer — non-blocking
    try {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles').select('full_name, phone').eq('id', target_user_id).single()
      if (customerProfile?.phone) {
        await notifySubscriptionActivated({
          phone: customerProfile.phone,
          name: customerProfile.full_name || 'Customer',
          size: product.size || product.name,
          quantity: qty,
          startDate: start_date,
          slot: delivery_slot || 'morning',
          dailyAmount,
          frequency: delivery_frequency || 'daily',
        })
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, subscription_id: subscription.id })
  } catch (err) {
    console.error('[AdminPlaceSubscription] Error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
