import crypto from 'crypto'
import { createServerClient } from '../../../lib/supabase-server'

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
      userId,
      amount
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
