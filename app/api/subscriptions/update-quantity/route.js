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

    const { subscription_id, quantity } = await request.json()
    const qty = Number(quantity)

    if (!subscription_id || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return NextResponse.json({ error: 'Invalid input. Quantity must be 1–20.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'Active subscription not found.' }, { status: 404 })
    }

    const newDailyCost = Math.round(
      sub.products.price * qty * (1 - (sub.discount_percent || 0) / 100)
    )

    // Verify wallet can cover new amount
    const { data: wallet } = await supabase
      .from('wallet')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    const balance = wallet?.balance || 0
    if (balance < newDailyCost) {
      return NextResponse.json({
        error: `Insufficient wallet balance. New daily cost: ₹${newDailyCost}, your balance: ₹${balance}.`
      }, { status: 400 })
    }

    await supabase
      .from('subscriptions')
      .update({ quantity: qty })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, new_quantity: qty, new_daily_cost: newDailyCost })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
