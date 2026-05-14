import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { notifyAdmin } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id
      const amountInRupees = Math.round(payment.amount / 100)

      // Find pending subscription by matching Razorpay order_id
      // We store razorpay_order_id in subscriptions table
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, user_id, is_active')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()

      if (sub && !sub.is_active) {
        // Activate subscription
        await supabaseAdmin
          .from('subscriptions')
          .update({ is_active: true })
          .eq('id', sub.id)

        // Credit wallet
        const { data: wallet } = await supabaseAdmin
          .from('wallet').select('balance').eq('user_id', sub.user_id).maybeSingle()

        const newBalance = (wallet?.balance || 0) + amountInRupees
        await supabaseAdmin.from('wallet').upsert({
          user_id: sub.user_id,
          balance: newBalance,
          deposit_balance: wallet?.deposit_balance || 0,
        }, { onConflict: 'user_id' })

        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: sub.user_id,
          amount: amountInRupees,
          type: 'credit',
          description: `Subscription payment webhook [${payment.id}]`,
        })

        await notifyAdmin(
          'Webhook: Subscription Activated',
          `✅ Subscription activated via webhook\nUser: ${sub.user_id}\nAmount: ₹${amountInRupees}\nPayment: ${payment.id}`
        )
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[Webhook] Error:', err)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
