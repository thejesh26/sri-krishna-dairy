import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { calcDailyAmount, getISTDate } from '../../../lib/pricing'
import { notifyAdmin } from '../../../lib/whatsapp'
import { createAdminNotification } from '../../../lib/notify'

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

    // Notify admin of the reactivation (non-blocking)
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || user.email
      const product = `${sub.products?.size || 'Milk'} × ${sub.quantity}`
      await notifyAdmin(
        `Subscription Reactivated — ${name}`,
        `▶️ Subscription reactivated\nCustomer: ${name}\nProduct: ${product}\nPhone: ${profile?.phone || 'N/A'}`
      )
      await createAdminNotification({
        type: 'reactivation',
        title: `Subscription reactivated — ${name}`,
        body: `${product} | Phone: ${profile?.phone || 'N/A'}`,
        link_tab: 'customers',
      })
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
