import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendOrderCancelledEmail } from '../../../lib/email'
import { notifyOrderCancelled } from '../../../lib/whatsapp'

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

    const { order_id, reason } = await request.json()
    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 })
    }

    // Fetch and verify order belongs to user
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, delivery_date, status, total_price, payment_method, bottle_deposit')
      .eq('id', order_id)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be cancelled.' }, { status: 400 })
    }

    // Cancellation allowed only before 6AM IST on delivery date
    const deliveryDay6AM = new Date(`${order.delivery_date}T06:00:00+05:30`)
    if (new Date() >= deliveryDay6AM) {
      return NextResponse.json({ error: 'Cancellations are only allowed before 6AM on the delivery date.' }, { status: 400 })
    }

    // Update order status to cancelled
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order_id)

    // Process refund if wallet payment (COD = no charge yet, no refund needed)
    let refundAmount = 0
    if (order.payment_method !== 'COD') {
      refundAmount = order.total_price || 0
      if (refundAmount > 0) {
        const { data: wallet } = await supabase
          .from('wallet')
          .select('id, balance')
          .eq('user_id', user.id)
          .maybeSingle()

        if (wallet) {
          await supabase
            .from('wallet')
            .update({ balance: (wallet.balance || 0) + refundAmount })
            .eq('user_id', user.id)

          await supabase.from('wallet_transactions').insert({
            user_id: user.id,
            amount: refundAmount,
            type: 'credit',
            description: `Order cancellation refund — delivery ${order.delivery_date}${reason ? ` (${reason})` : ''}`,
          })
        }
      }
    }

    // Send notifications — non-blocking
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()

      const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
      const email = authUser?.user?.email
      const name = profile?.full_name || email || 'Customer'

      if (email) {
        await sendOrderCancelledEmail({ to: email, name, deliveryDate: order.delivery_date, refundAmount })
      }
      if (profile?.phone) {
        await notifyOrderCancelled({ phone: profile.phone, name, deliveryDate: order.delivery_date, refundAmount })
      }
    } catch {
      // Notification failure must not block cancellation
    }

    return NextResponse.json({ success: true, refund_amount: refundAmount })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
