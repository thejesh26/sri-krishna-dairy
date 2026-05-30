import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

/**
 * POST /api/admin/convert-to-deposit
 * Moves `amount` from wallet.balance → wallet.deposit_balance for a customer.
 * Records a wallet_transaction pair (debit from balance, credit to deposit).
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { target_user_id, amount, note } = await request.json()

    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id is required.' }, { status: 400 })
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0 || amt > 100000) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }

    const { data: wallet } = await supabaseAdmin
      .from('wallet').select('id, balance, deposit_balance').eq('user_id', target_user_id).maybeSingle()

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found for this customer.' }, { status: 404 })
    }
    if (wallet.balance < amt) {
      return NextResponse.json({ error: `Insufficient balance. Available: ₹${wallet.balance}` }, { status: 400 })
    }

    const newBalance = wallet.balance - amt
    const newDeposit = (wallet.deposit_balance || 0) + amt

    await supabaseAdmin.from('wallet').update({ balance: newBalance, deposit_balance: newDeposit }).eq('user_id', target_user_id)

    const description = note?.trim() || `Converted ₹${amt} from balance to deposit by admin`
    await supabaseAdmin.from('wallet_transactions').insert([
      { user_id: target_user_id, amount: amt, type: 'debit',  description },
      { user_id: target_user_id, amount: amt, type: 'credit', description: `Bottle deposit credited — ${description}` },
    ])

    return NextResponse.json({ success: true, new_balance: newBalance, new_deposit: newDeposit })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
