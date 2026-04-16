import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { createServerClient } from '../../../lib/supabase-server'
import { sendPaymentReceivedEmail } from '../../../lib/email'

export async function POST(request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Input ─────────────────────────────────────────────────────────────────
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscription_id,
    } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 })
    }

    // ── Verify HMAC-SHA256 signature ──────────────────────────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
    }

    // ── Idempotency — skip if already processed ───────────────────────────────
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('description', `Subscription payment [${razorpay_payment_id}]`)
      .limit(1)

    if (existing?.length > 0) {
      return NextResponse.json({ success: true })
    }

    // ── Fetch actual amount paid from Razorpay (never trust client amount) ────
    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
    const payment = await razorpay.payments.fetch(razorpay_payment_id)
    const amountPaid = payment.amount / 100 // paise → rupees

    // ── Get deposit split from subscription in DB ─────────────────────────────
    // Compute additional (incremental) deposit server-side so the client
    // cannot manipulate how much goes to deposit vs spendable balance.
    let additionalDeposit = 0
    if (subscription_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('bottle_deposit')
        .eq('id', subscription_id)
        .eq('user_id', user.id)
        .single()

      if (sub?.bottle_deposit > 0) {
        const { data: wallet } = await supabase
          .from('wallet')
          .select('deposit_balance')
          .eq('user_id', user.id)
          .maybeSingle()

        const existingDeposit = wallet?.deposit_balance || 0
        additionalDeposit = Math.max(0, sub.bottle_deposit - existingDeposit)
        additionalDeposit = Math.min(additionalDeposit, amountPaid) // cap at amount paid
      }
    }

    const spendableAmount = amountPaid - additionalDeposit

    // ── Get or create wallet ──────────────────────────────────────────────────
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

    // ── Credit spendable balance ──────────────────────────────────────────────
    await supabase
      .from('wallet')
      .update({ balance: (wallet.balance || 0) + spendableAmount })
      .eq('user_id', user.id)

    // ── Credit deposit balance ────────────────────────────────────────────────
    if (additionalDeposit > 0) {
      await supabase
        .from('wallet')
        .update({ deposit_balance: (wallet.deposit_balance || 0) + additionalDeposit })
        .eq('user_id', user.id)
    }

    // ── Record transaction ────────────────────────────────────────────────────
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount: spendableAmount,
      type: 'credit',
      description: `Subscription payment [${razorpay_payment_id}]`,
    })

    // ── Activate subscription ─────────────────────────────────────────────────
    if (subscription_id) {
      await supabase
        .from('subscriptions')
        .update({ is_active: true })
        .eq('id', subscription_id)
        .eq('user_id', user.id)
        .eq('is_active', false)
    }

    // ── Send confirmation email (non-blocking) ────────────────────────────────
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
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
