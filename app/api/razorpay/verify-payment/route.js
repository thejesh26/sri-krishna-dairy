import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { createServerClient } from '../../../lib/supabase-server'
import { sendPaymentReceivedEmail } from '../../../lib/email'

export async function POST(request) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // additional_deposit replaces bottle_deposit:
      // only the INCREMENTAL deposit (new bottles beyond what customer already paid)
      additional_deposit,
      // subscription_id: pending subscription to activate after payment
      subscription_id,
    } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 })
    }

    const depositAmount = Math.max(0, Number(additional_deposit) || 0)

    // Verify signature: HMAC-SHA256 of "order_id|payment_id" using key_secret
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
    }

    // Fetch actual amount paid from Razorpay (never trust client-supplied amount)
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    const payment = await razorpay.payments.fetch(razorpay_payment_id)
    const amountPaid = payment.amount / 100 // paise → rupees

    // Idempotency: skip wallet credit if this payment was already processed
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('description', `Subscription payment [${razorpay_payment_id}]`)
      .limit(1)

    if (!existing || existing.length === 0) {
      // Get or create wallet
      let { data: wallet } = await supabase
        .from('wallet')
        .select('id, balance, deposit_balance')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from('wallet')
          .insert({ user_id: user.id, balance: 0, deposit_balance: 0 })
          .select()
          .single()
        wallet = newWallet
      }

      // Credit spendable balance (excluding the additional deposit portion)
      const spendableAmount = amountPaid - depositAmount
      await supabase
        .from('wallet')
        .update({ balance: (wallet.balance || 0) + spendableAmount })
        .eq('user_id', user.id)

      // Credit only the incremental deposit to deposit_balance
      if (depositAmount > 0) {
        await supabase
          .from('wallet')
          .update({ deposit_balance: (wallet.deposit_balance || 0) + depositAmount })
          .eq('user_id', user.id)
      }

      // Record transaction for the spendable portion
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: spendableAmount,
        type: 'credit',
        description: `Subscription payment [${razorpay_payment_id}]`,
      })
    }

    // ── Activate the pending subscription (Issue 1 fix) ──────────────────────
    // The subscription was created with is_active = false before payment.
    // Set it to true now that payment is verified.
    if (subscription_id) {
      const { error: activateError } = await supabase
        .from('subscriptions')
        .update({ is_active: true })
        .eq('id', subscription_id)
        .eq('user_id', user.id)    // ownership check — cannot activate another user's sub
        .eq('is_active', false)    // only activate pending subs (idempotency)

      if (activateError) {
        // Log but don't fail the response — wallet was already credited
        console.error('Subscription activation error:', activateError.message)
      }
    }

    // Send payment confirmation email (non-blocking)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      await sendPaymentReceivedEmail({
        to: user.email,
        name: profile?.full_name || user.email,
        amountPaid,
        paymentId: razorpay_payment_id,
      })
    } catch {
      // Email failure must not block payment verification response
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
