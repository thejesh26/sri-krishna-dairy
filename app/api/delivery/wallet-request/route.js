import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireDelivery(request)
    if (authError) return authError

    const { target_user_id, action, amount, note } = await request.json()
    if (!target_user_id || !action || !amount) {
      return Response.json({ error: 'target_user_id, action, amount are required' }, { status: 400 })
    }
    if (!['add', 'deduct'].includes(action)) {
      return Response.json({ error: 'action must be add or deduct' }, { status: 400 })
    }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      return Response.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin.from('wallet_requests').insert({
      requested_by: user.id,
      target_user_id,
      action,
      amount: amt,
      note: note || null,
      status: 'pending',
    })

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Wallet request error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
