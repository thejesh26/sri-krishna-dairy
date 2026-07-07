import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { notifyWalletCredited, notifyWalletDebited } from '../../../lib/whatsapp'
import { sendEmail } from '../../../lib/email'

/**
 * Admin/delivery: manually adjust a customer's wallet balance.
 * Actions: 'add' | 'deduct' | 'set'
 */
export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('full_name').eq('id', user.id).single()

    const { target_user_id, action, amount, note } = await request.json()

    if (!target_user_id || !action || !['add', 'deduct', 'set'].includes(action)) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 0 || amt > 100000) {
      return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
    }

    // Get or create target wallet
    let { data: wallet } = await supabaseAdmin
      .from('wallet').select('id, balance').eq('user_id', target_user_id).maybeSingle()

    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin
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

    await supabaseAdmin.from('wallet').update({ balance: newBalance }).eq('user_id', target_user_id)

    if (txnAmount > 0) {
      await supabaseAdmin.from('wallet_transactions').insert({
        user_id: target_user_id,
        amount: txnAmount,
        type: txnType,
        description: note || `Manual ${action} by ${callerProfile.full_name || 'admin'}`,
      })
    }

    // Notify customer (non-blocking)
    try {
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, phone')
        .eq('id', target_user_id)
        .single()

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(target_user_id)
      const customerEmail = authUser?.user?.email
      const customerName = customerProfile?.full_name || 'Customer'

      if (customerProfile?.phone) {
        if (action === 'add') {
          await notifyWalletCredited(customerProfile.phone, customerName, amt, newBalance)
        } else if (action === 'deduct') {
          await notifyWalletDebited(customerProfile.phone, customerName, txnAmount, newBalance)
        }
      }

      if (customerEmail) {
        await sendEmail({
          to: customerEmail,
          subject: action === 'add'
            ? `💰 ₹${amt} added to your Sri Krishnaa Dairy wallet`
            : `💸 ₹${txnAmount} deducted from your Sri Krishnaa Dairy wallet`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
  <h2 style="color:#1a5c38;">${action === 'add' ? '💰 Wallet Credited' : '💸 Wallet Debited'}</h2>
  <p>Hi ${customerName},</p>
  <p>₹${action === 'add' ? amt : txnAmount} has been ${action === 'add' ? 'added to' : 'deducted from'} your Sri Krishnaa Dairy wallet${action === 'add' ? ' by admin' : ''}.</p>
  <p><strong>New Balance: ₹${newBalance}</strong></p>
  ${note ? `<p>Note: ${note}</p>` : ''}
  <p>Visit <a href="https://srikrishnaadairy.in/wallet">srikrishnaadairy.in/wallet</a> to check your balance.</p>
  <p style="color:#999;font-size:12px;">For queries contact 8105054473 — Sri Krishnaa Dairy Team</p>
</div>`,
          text: `Hi ${customerName}, ₹${action === 'add' ? amt : txnAmount} has been ${action === 'add' ? 'added to' : 'deducted from'} your wallet. New balance: ₹${newBalance}. Visit srikrishnaadairy.in/wallet`,
        })
      }
    } catch (notifyErr) {
      console.error('[WalletUpdate] Notification failed:', notifyErr?.message)
    }

    return NextResponse.json({ success: true, new_balance: newBalance })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
