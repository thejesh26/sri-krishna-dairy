import crypto from 'crypto'
import { createServerClient } from '../../lib/supabase-server'
import { sendSubscriptionConfirmationEmail } from '../../lib/email'
import { notifySubscriptionActivated } from '../../lib/whatsapp'

export async function POST(request) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type,
      subscriptionId,
      userId,
      amount,
      deposit
    } = await request.json()

    if (user.id !== userId) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return Response.json(
        { success: false, error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Get or create wallet
    const { data: wallet } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (type === 'subscription') {
      const walletAmount = amount - (deposit || 0)
      const depositAmount = deposit || 0

      if (wallet) {
        await supabase
          .from('wallet')
          .update({
            balance: (wallet.balance || 0) + walletAmount,
            deposit_balance: (wallet.deposit_balance || 0) + depositAmount
          })
          .eq('user_id', userId)
      } else {
        await supabase
          .from('wallet')
          .insert({
            user_id: userId,
            balance: walletAmount,
            deposit_balance: depositAmount
          })
      }

      // Activate subscription
      await supabase
        .from('subscriptions')
        .update({ is_active: true })
        .eq('id', subscriptionId)

      // Add wallet transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          type: 'credit',
          description: `Subscription payment [${razorpay_payment_id}]`
        })

      // Send activation notifications (non-blocking)
      try {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('start_date, delivery_slot, quantity, discount_percent, products(size, price)')
          .eq('id', subscriptionId)
          .single()
        const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', userId).single()
        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        const name = profile?.full_name || authUser?.user?.email || ''
        const email = authUser?.user?.email || ''
        const product = sub?.products
        const qty = sub?.quantity || 1
        const dailyAmount = product
          ? Math.round(product.price * qty * (1 - (sub.discount_percent || 0) / 100))
          : 0
        if (email) {
          await sendSubscriptionConfirmationEmail({
            to: email, name, product: product?.size, quantity: qty,
            startDate: sub?.start_date, deliverySlot: sub?.delivery_slot, dailyAmount,
          })
        }
        await notifySubscriptionActivated({
          phone: profile?.phone, name, size: product?.size, quantity: qty,
          startDate: sub?.start_date, slot: sub?.delivery_slot, dailyAmount,
        })
      } catch { /* non-blocking */ }

    } else if (type === 'wallet') {
      if (wallet) {
        await supabase
          .from('wallet')
          .update({
            balance: (wallet.balance || 0) + amount
          })
          .eq('user_id', userId)
      } else {
        await supabase
          .from('wallet')
          .insert({
            user_id: userId,
            balance: amount,
            deposit_balance: 0
          })
      }

      // Add wallet transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          type: 'credit',
          description: `Wallet recharge [${razorpay_payment_id}]`
        })
    }

    return Response.json({ success: true })

  } catch (error) {
    console.error('Verify payment error:', error)
    return Response.json(
      { success: false, error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}
