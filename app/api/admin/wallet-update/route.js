import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * Admin/delivery: manually adjust a customer's wallet balance.
 * Actions: 'add' | 'deduct' | 'set'
 */
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

    // Verify caller is admin or delivery
    const { data: callerProfile } = await supabase
      .from('profiles').select('is_admin, is_delivery, full_name').eq('id', user.id).single()
    if (!callerProfile?.is_admin && !callerProfile?.is_delivery) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { target_user_id, action, amount, note } = await request.json()

    if (!target_user_id || !action || !['add', 'deduct', 'set'].includes(action)) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 0 || amt > 100000) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }

    // Get or create target wallet
    let { data: wallet } = await supabase
      .from('wallet').select('id, balance').eq('user_id', target_user_id).maybeSingle()

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallet').insert({ user_id: target_user_id, balance: 0 }).select().single()
      wallet = newWallet
    }

    let newBalance
    let txnType
    let txnAmount

    if (action === 'add') {
      newBalance = wallet.balance + amt
      txnType = 'credit'
      txnAmount = amt
    } else if (action === 'deduct') {
      newBalance = Math.max(0, wallet.balance - amt)
      txnType = 'debit'
      txnAmount = wallet.balance - newBalance // actual amount deducted
    } else { // set
      newBalance = amt
      txnType = newBalance >= wallet.balance ? 'credit' : 'debit'
      txnAmount = Math.abs(newBalance - wallet.balance)
    }

    await supabase.from('wallet').update({ balance: newBalance }).eq('user_id', target_user_id)

    if (txnAmount > 0) {
      await supabase.from('wallet_transactions').insert({
        user_id: target_user_id,
        amount: txnAmount,
        type: txnType,
        description: note || `Manual ${action} by ${callerProfile.full_name || 'admin'}`,
      })
    }

    return NextResponse.json({ success: true, new_balance: newBalance })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
