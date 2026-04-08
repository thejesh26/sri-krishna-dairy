import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * POST /api/loyalty/redeem
 * Redeem 100 loyalty points for a free 1 litre milk order (delivered tomorrow).
 * Deducts 100 points from the user's profile and creates a zero-cost order.
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch profile to check points
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('loyalty_points')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
  }

  if ((profile.loyalty_points || 0) < 100) {
    return NextResponse.json({ error: 'Insufficient points. You need at least 100 points to redeem.' }, { status: 400 })
  }

  // Find the 1000ml product
  const { data: product } = await supabase
    .from('products')
    .select('id, size, price')
    .ilike('size', '%1000%')
    .eq('is_available', true)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Free milk product not available right now.' }, { status: 400 })
  }

  // Delivery date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const deliveryDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Check no existing order already for tomorrow (idempotency)
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('delivery_date', deliveryDate)
    .maybeSingle()

  if (existingOrder) {
    return NextResponse.json({ error: 'You already have an order for tomorrow. Try redeeming for a different date.' }, { status: 400 })
  }

  // Atomically deduct 100 points — only succeeds if loyalty_points is still >= 100.
  // The .gte() acts as an optimistic lock preventing race-condition double-spend.
  const { data: deducted } = await supabase
    .from('profiles')
    .update({ loyalty_points: profile.loyalty_points - 100 })
    .eq('id', user.id)
    .gte('loyalty_points', 100)
    .select('loyalty_points')
    .maybeSingle()

  if (!deducted) {
    return NextResponse.json({ error: 'Insufficient points.' }, { status: 400 })
  }

  // Create the free order (total_price = 0, bottle_deposit = 0)
  const { error: orderError } = await supabase.from('orders').insert({
    user_id: user.id,
    product_id: product.id,
    quantity: 1,
    delivery_date: deliveryDate,
    delivery_slot: 'morning',
    delivery_mode: 'direct',
    bottle_deposit: 0,
    total_price: 0,
    status: 'pending',
    payment_method: 'loyalty_redemption',
  })

  if (orderError) {
    // Rollback: restore the deducted points
    await supabase
      .from('profiles')
      .update({ loyalty_points: profile.loyalty_points })
      .eq('id', user.id)
    return NextResponse.json({ error: 'Could not place free order. ' + orderError.message }, { status: 500 })
  }

  // Record in wallet_transactions for history
  await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    amount: 0,
    type: 'credit',
    description: `Loyalty redemption: Free 1L milk on ${deliveryDate} (100 points)`,
  })

  return NextResponse.json({ success: true, deliveryDate })
}
