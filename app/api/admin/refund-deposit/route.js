import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendEmail } from '../../../lib/email'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

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

      if (customerProfile?.phone) {
        await sendWhatsAppMessage(
          customerProfile.phone,
          `Hi ${name}! Your bottle deposit refund of ₹${amount} has been processed! 🎉\n\n` +
          `The amount has been credited to your Sri Krishnaa Dairy wallet.\n` +
          `New wallet balance: ₹${newBalance}\n\n` +
          `If you paid via Razorpay and want a bank transfer instead, contact us:\n` +
          `📞 9980166221\n\n` +
          `Thank you for being a valued customer! 🥛\n` +
          `— Sri Krishnaa Dairy Team`
        )
      }
      if (email) {
        await sendEmail({
          to: email,
          subject: `✅ Bottle Deposit Refund Processed — ₹${amount}`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
  <h2 style="color:#1a5c38;margin-bottom:8px;">✅ Deposit Refund Processed</h2>
  <p style="color:#555;font-size:14px;">Hi <strong>${name}</strong>,</p>
  <p style="color:#555;font-size:14px;">Your bottle deposit refund of <strong>₹${amount}</strong> has been processed and credited to your Sri Krishnaa Dairy wallet.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0ebe0;margin:16px 0;">
    <tr><td style="padding:8px 0;font-size:13px;color:#4b5563;">Refund Amount</td><td style="padding:8px 0;font-size:13px;font-weight:bold;color:#1a5c38;text-align:right;">₹${amount}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#4b5563;">New Wallet Balance</td><td style="padding:8px 0;font-size:13px;font-weight:bold;color:#1a5c38;text-align:right;">₹${newBalance}</td></tr>
    <tr><td style="padding:8px 0;font-size:13px;color:#4b5563;">Credited To</td><td style="padding:8px 0;font-size:13px;text-align:right;">Sri Krishnaa Dairy Wallet</td></tr>
  </table>
  <div style="background:#f0faf4;border:1px solid #c8e6d4;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
    <p style="margin:0;font-size:13px;color:#1a5c38;">Wallet credits are instant. Bank transfers (if requested) take 3-5 business days.</p>
  </div>
  <p style="color:#555;font-size:13px;">If you paid via Razorpay and prefer a bank transfer, please call or WhatsApp us at <strong>9980166221</strong>.</p>
  <p style="color:#999;font-size:12px;margin-top:16px;">Thank you for being a valued customer! — Sri Krishnaa Dairy Team</p>
</div>`,
          text: `Hi ${name},\n\nYour bottle deposit refund of ₹${amount} has been processed.\nNew wallet balance: ₹${newBalance}\n\nWallet credits are instant. Bank transfers (if requested) take 3-5 business days.\n\nQuestions? Call 9980166221\n— Sri Krishnaa Dairy Team`,
        })
      }
    } catch {
      // Notification failure must not block refund
    }

    return NextResponse.json({ success: true, new_deposit_balance: newDeposit, new_balance: newBalance })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
