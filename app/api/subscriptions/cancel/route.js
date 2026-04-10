import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendSubscriptionCancelledEmail } from '../../../lib/email'

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

    const { subscription_id } = await request.json()
    if (!subscription_id) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced)
    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send cancellation email (non-blocking)
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      await sendSubscriptionCancelledEmail({
        to: user.email,
        name: profile?.full_name || user.email,
        product: sub.products?.size || 'Milk',
        quantity: sub.quantity,
      })
    } catch { /* email failure must not block response */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
