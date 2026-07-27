import Razorpay from 'razorpay'
import { NextResponse } from 'next/server'
import { requireAuth } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { error: authError } = await requireAuth(request)
    if (authError) return authError

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error('[razorpay/create-order] missing env vars — NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set')
      return NextResponse.json({ error: 'Payment gateway not configured on server.' }, { status: 503 })
    }

    const { amount } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret })

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })

  } catch (error) {
    const msg = error?.error?.description || error?.message || String(error)
    console.error('[razorpay/create-order] error:', msg, error)
    return NextResponse.json({ error: `Razorpay error: ${msg}` }, { status: 500 })
  }
}
