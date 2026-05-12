import { createServerClient } from '../../../lib/supabase-server'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('is_delivery, is_admin').eq('id', user.id).single()
    if (!profile?.is_delivery && !profile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    const { error: insertError } = await supabase.from('wallet_requests').insert({
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
