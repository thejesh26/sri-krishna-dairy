import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function POST(request) {
  try {
    const { amount } = await request.json()

    if (!amount || amount <= 0) {
      return Response.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    })

    return Response.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })

  } catch (error) {
    console.error('Razorpay create order error:', error)
    return Response.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
