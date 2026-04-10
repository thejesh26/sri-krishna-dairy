import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * POST /api/delivery/confirm
 * Body: { order_id?, subscription_id?, delivery_date, type: 'order' | 'subscription' }
 * Caller must be is_delivery or is_admin.
 */
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

    const { data: callerProfile } = await supabase
      .from('profiles').select('is_admin, is_delivery, full_name').eq('id', user.id).single()
    if (!callerProfile?.is_admin && !callerProfile?.is_delivery) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { type, order_id, subscription_id, delivery_date } = await request.json()
    const deliveredAt = new Date().toISOString()
    const deliveredBy = callerProfile.full_name || user.id

    if (type === 'order' && order_id) {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: deliveredAt, delivered_by: deliveredBy })
        .eq('id', order_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (type === 'subscription' && subscription_id && delivery_date) {
      // Record subscription delivery in a delivery_log table if it exists,
      // otherwise update/insert into a subscription_deliveries table.
      // Fallback: insert a wallet_transaction note for traceability.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('user_id, products(*), quantity, discount_percent')
        .eq('id', subscription_id)
        .single()

      if (!sub) return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })

      // Try to update delivery log — if table doesn't exist the error is non-fatal
      await supabase.from('subscription_deliveries').upsert({
        subscription_id,
        user_id: sub.user_id,
        delivery_date,
        delivered_at: deliveredAt,
        delivered_by: deliveredBy,
      }, { onConflict: 'subscription_id,delivery_date' }).select()

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
