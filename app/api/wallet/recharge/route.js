import crypto from 'crypto'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = await request.json()

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
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    // Idempotency: reject if this payment_id was already credited
    const description = `Wallet recharge [${razorpay_payment_id}]`
    const { data: existingTx } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('description', description)
      .limit(1)
    if (existingTx?.length) {
      return Response.json({ success: true, idempotent: true })
    }

    // Get or create wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallet').select('*').eq('user_id', userId).maybeSingle()

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
      description,
    })

    return Response.json({ success: true })

  } catch (error) {
    console.error('Wallet recharge error:', error)
    return Response.json({ success: false, error: 'Recharge failed' }, { status: 500 })
  }
}
