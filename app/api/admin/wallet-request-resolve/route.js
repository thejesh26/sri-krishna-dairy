import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
