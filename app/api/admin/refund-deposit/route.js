import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDepositRefundEmail } from '../../../lib/email'
import { notifyDepositRefund } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // Authenticate + verify admin
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, full_name')
      .eq('id', user.id)
      .single()

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { user_id, refund_amount, good_bottles, notes } = await request.json()

    const amount = Number(refund_amount)
    if (!user_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'user_id and positive refund_amount are required.' }, { status: 400 })
    }
    const bottles = Number(good_bottles) || 0

    // Fetch current wallet state
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('id, balance, deposit_balance')
      .eq('user_id', user_id)
      .maybeSingle()

    if (!wallet || (wallet.deposit_balance || 0) < amount) {
      return NextResponse.json({ error: 'Insufficient deposit balance.' }, { status: 400 })
    }

    const newDeposit = (wallet.deposit_balance || 0) - amount
    const newBalance = (wallet.balance || 0) + amount

    // Deduct deposit_balance and credit wallet.balance
    await supabaseAdmin
      .from('wallet')
      .update({ deposit_balance: newDeposit, balance: newBalance })
      .eq('user_id', user_id)

    // Record the refund as a wallet credit transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      user_id,
      amount,
      type: 'credit',
      description: `Bottle deposit refund — ${bottles} bottle${bottles !== 1 ? 's' : ''} returned${notes ? ` (${notes})` : ''} [by ${adminProfile.full_name || 'Admin'}]`,
    })

    // Notify customer — non-blocking
    try {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user_id)
        .single()

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id)
      const email = authUser?.user?.email
      const name = customerProfile?.full_name || email || 'Customer'

      if (email) {
        await sendDepositRefundEmail({ to: email, name, refundAmount: amount, goodBottles: bottles })
      }
      if (customerProfile?.phone) {
        await notifyDepositRefund({ phone: customerProfile.phone, name, refundAmount: amount, goodBottles: bottles })
      }
    } catch {
      // Notification failure must not block refund
    }

    return NextResponse.json({ success: true, new_deposit_balance: newDeposit, new_balance: newBalance })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
