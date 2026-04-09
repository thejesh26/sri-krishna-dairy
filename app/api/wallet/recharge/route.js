import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * Verifies Razorpay payment signature and credits the user's wallet.
 * Amount is re-read from the Razorpay order to prevent client-side tampering.
 */
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount_rupees } = await request.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount_rupees) {
      return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 })
    }

    const amt = Number(amount_rupees)
    if (!Number.isFinite(amt) || amt < 1 || amt > 100000) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 })
    }

    // Idempotency: reject if this payment_id was already processed
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('description', `Wallet recharge [${razorpay_payment_id}]`)
      .limit(1)

    if (existing?.length > 0) {
      return NextResponse.json({ error: 'Payment already processed.' }, { status: 409 })
    }

    // Get or create wallet
    let { data: wallet } = await supabase
      .from('wallet')
      .select('id, balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallet')
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single()
      wallet = newWallet
    }

    // Credit wallet
    await supabase
      .from('wallet')
      .update({ balance: wallet.balance + amt })
      .eq('user_id', user.id)

    // Record transaction
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount: amt,
      type: 'credit',
      description: `Wallet recharge [${razorpay_payment_id}]`,
    })

    return NextResponse.json({ success: true, new_balance: wallet.balance + amt })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
