import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { calcDailyAmount } from '../../../lib/pricing'
import { sendEmail, sendSubscriptionConfirmationEmail } from '../../../lib/email'
import { sendSubscriptionActivated } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type,
      subscriptionIds,
      userId,
      amount,
      deposit,
      discount_code,
    } = await request.json()

    if (user.id !== userId) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Verify signature
    const sigBody = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sigBody)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    // Idempotency: if this payment_id was already processed, return success without re-crediting
    const descriptionKey = type === 'subscription'
      ? `Subscription payment [${razorpay_payment_id}]`
      : `Wallet recharge [${razorpay_payment_id}]`

    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('description', descriptionKey)
      .limit(1)

    if (existingTx?.length) {
      console.log('[VerifyPayment] Idempotent: payment already processed:', razorpay_payment_id)
      return Response.json({ success: true, idempotent: true })
    }

    // Get or create wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (type === 'subscription') {
      const walletAmount = amount - (deposit || 0)
      const depositAmount = deposit || 0

      if (wallet) {
        await supabaseAdmin
          .from('wallet')
          .update({
            balance: (wallet.balance || 0) + walletAmount,
            deposit_balance: (wallet.deposit_balance || 0) + depositAmount,
          })
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('wallet')
          .insert({ user_id: userId, balance: walletAmount, deposit_balance: depositAmount })
      }

      // Activate all subscriptions (multi-product support)
      await supabaseAdmin
        .from('subscriptions')
        .update({ is_active: true })
        .in('id', subscriptionIds)

      // Record one-time discount code usage
      if (discount_code && typeof discount_code === 'string') {
        const { data: usedCode } = await supabaseAdmin
          .from('discount_codes')
          .select('id, one_time_per_customer')
          .eq('code', discount_code.trim().toUpperCase())
          .eq('is_active', true)
          .maybeSingle()
        if (usedCode?.one_time_per_customer) {
          await supabaseAdmin.from('discount_code_usage').upsert(
            { code_id: usedCode.id, user_id: userId },
            { onConflict: 'code_id,user_id' }
          ).catch(() => {})
        }
      }

      // Insert transaction — after idempotency check so this acts as the idempotency marker
      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: userId,
        amount,
        type: 'credit',
        description: descriptionKey,
      })

      // Send activation notifications (non-blocking)
      try {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('start_date, delivery_slot, quantity, discount_percent, delivery_frequency, products(size, price)')
          .eq('id', subscriptionIds[0])
          .single()
        const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', userId).single()
        const email = user.email || ''
        const name = profile?.full_name || email
        const product = sub?.products
        const qty = sub?.quantity || 1
        const dailyAmount = product ? calcDailyAmount(product.price, qty, sub.discount_percent || 0) : 0
        if (email) {
          await sendSubscriptionConfirmationEmail({
            to: email, name, product: product?.size, quantity: qty,
            startDate: sub?.start_date, deliverySlot: sub?.delivery_slot, dailyAmount,
          })
        }
        await sendSubscriptionActivated(
          profile?.phone, name,
          product?.size ? `${product.size} x${qty}` : `x${qty}`,
          sub?.start_date,
          sub?.delivery_slot === 'morning' ? '7AM–9AM' : '5PM–7PM',
          dailyAmount,
          sub?.delivery_frequency,
        )
      } catch { /* non-blocking */ }

    } else if (type === 'wallet') {
      if (wallet) {
        await supabaseAdmin
          .from('wallet')
          .update({ balance: (wallet.balance || 0) + amount })
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('wallet')
          .insert({ user_id: userId, balance: amount, deposit_balance: 0 })
      }

      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: userId,
        amount,
        type: 'credit',
        description: descriptionKey,
      })
    }

    return Response.json({ success: true })

  } catch (error) {
    console.error('Verify payment error:', error)
    return Response.json({ success: false, error: 'Payment verification failed' }, { status: 500 })
  }
}
