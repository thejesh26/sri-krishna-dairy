import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { calcDailyAmount, getISTDate } from '../../../lib/pricing'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { subscription_id } = await request.json()
    if (!subscription_id) {
      return NextResponse.json({ error: 'Missing subscription_id.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced by user_id filter)
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*, products(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', false)
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found or already active.' }, { status: 404 })
    }

    const dailyAmount = calcDailyAmount(sub.products.price, sub.quantity, sub.discount_percent || 0)

    // Check wallet balance
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()

    const balance = wallet?.balance || 0
    if (balance < dailyAmount) {
      return NextResponse.json({
        error: `Insufficient wallet balance. Need at least ₹${dailyAmount} to reactivate. Current balance: ₹${balance}.`
      }, { status: 400 })
    }

    // Check if end_date has already passed
    if (sub.end_date) {
      const today = getISTDate()
      if (sub.end_date < today) {
        return NextResponse.json({
          error: 'This subscription has expired. Please create a new subscription.'
        }, { status: 400 })
      }
    }

    await supabaseAdmin
      .from('subscriptions')
      .update({ is_active: true })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
