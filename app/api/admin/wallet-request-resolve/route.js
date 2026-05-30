import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { request_id, approved } = await request.json()
    if (!request_id || approved === undefined) {
      return NextResponse.json({ error: 'request_id and approved are required' }, { status: 400 })
    }

    const { data: walletReq, error: fetchError } = await supabaseAdmin
      .from('wallet_requests')
      .select('target_user_id, action, amount, status, requested_by')
      .eq('id', request_id)
      .single()

    if (fetchError || !walletReq) {
      return NextResponse.json({ error: 'Wallet request not found' }, { status: 404 })
    }
    if (walletReq.status !== 'pending') {
      return NextResponse.json({ error: 'Request already resolved' }, { status: 409 })
    }

    const resolvedAt = new Date().toISOString()

    if (!approved) {
      await supabaseAdmin.from('wallet_requests').update({
        status: 'rejected',
        resolved_by: user.id,
        resolved_at: resolvedAt,
      }).eq('id', request_id)
      return NextResponse.json({ success: true })
    }

    // approved === true — apply wallet change
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('id, balance')
      .eq('user_id', walletReq.target_user_id)
      .maybeSingle()

    const balance = wallet?.balance ?? 0

    if (walletReq.action === 'deduct' && balance < walletReq.amount) {
      return NextResponse.json({ error: 'Insufficient wallet balance for deduction' }, { status: 422 })
    }

    const newBalance = walletReq.action === 'add'
      ? balance + walletReq.amount
      : balance - walletReq.amount

    await supabaseAdmin.from('wallet').update({ balance: newBalance }).eq('user_id', walletReq.target_user_id)

    await supabaseAdmin.from('wallet_transactions').insert({
      user_id: walletReq.target_user_id,
      amount: walletReq.amount,
      type: walletReq.action === 'add' ? 'credit' : 'debit',
      description: 'Wallet update approved by admin',
    })

    await supabaseAdmin.from('wallet_requests').update({
      status: 'approved',
      resolved_by: user.id,
      resolved_at: resolvedAt,
    }).eq('id', request_id)

    // Notify the agent who raised the request
    try {
      const { data: agentProfile } = await supabaseAdmin
        .from('profiles').select('full_name, phone').eq('id', walletReq.requested_by).single()
      if (agentProfile?.phone) {
        await sendWhatsAppMessage(
          agentProfile.phone,
          `Your wallet request of ₹${walletReq.amount} (${walletReq.action}) for customer has been approved by admin.`
        )
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, new_balance: newBalance })
  } catch (err) {
    console.error('[WalletRequestResolve] Error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
