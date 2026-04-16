import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      amount
    } = await request.json()

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

    return Response.json({ success: true })

  } catch (error) {
    console.error('Wallet recharge error:', error)
    return Response.json(
      { success: false, error: 'Recharge failed' },
      { status: 500 }
    )
  }
}
