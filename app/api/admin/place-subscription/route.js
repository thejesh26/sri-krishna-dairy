import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { notifySubscriptionActivated } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      target_user_id, product_id, quantity, delivery_slot,
      delivery_frequency, subscription_type, start_date, end_date,
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

    const dailyAmount = Math.round(product.price * qty)

    const insertData = {
      user_id: target_user_id,
      product_id: product.id,
      quantity: qty,
      delivery_slot: delivery_slot || 'morning',
      delivery_frequency: delivery_frequency || 'daily',
      subscription_type: subscription_type || 'ongoing',
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
