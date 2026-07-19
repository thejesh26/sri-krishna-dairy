import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { createAdminNotification } from '../../../lib/notify'
import { notifyAdmin } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    let body
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    const { amount, txn_ref } = body
    const amt = parseFloat(amount)

    if (!txn_ref?.trim()) {
      return NextResponse.json({ error: 'Transaction reference is required.' }, { status: 400 })
    }
    if (txn_ref.trim().length > 100) {
      return NextResponse.json({ error: 'Transaction reference is too long.' }, { status: 400 })
    }
    if (isNaN(amt) || amt < 10) {
      return NextResponse.json({ error: 'Amount must be at least ₹10.' }, { status: 400 })
    }
    if (amt > 10000) {
      return NextResponse.json({ error: 'Amount cannot exceed ₹10,000 per request.' }, { status: 400 })
    }

    // Check globally — same txn_ref from any customer means it's already submitted.
    // The DB also enforces this via a partial unique index, so this is just a friendlier error.
    const { data: existing } = await supabaseAdmin
      .from('wallet_requests')
      .select('id')
      .eq('payment_method', 'pluxee')
      .eq('txn_ref', txn_ref.trim())
      .limit(1)
    if (existing?.length) {
      return NextResponse.json({ error: 'This transaction reference has already been submitted.' }, { status: 409 })
    }

    const { error: insertError } = await supabaseAdmin.from('wallet_requests').insert({
      requested_by: user.id,
      target_user_id: user.id,
      action: 'add',
      amount: amt,
      payment_method: 'pluxee',
      txn_ref: txn_ref.trim(),
      note: `Pluxee payment — Txn ref: ${txn_ref.trim()}`,
      status: 'pending',
    })

    if (insertError) {
      // Unique constraint violation — concurrent duplicate submission
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This transaction reference has already been submitted.' }, { status: 409 })
      }
      console.error('[pluxee-request] insert error:', insertError)
      return NextResponse.json({ error: 'Server error.' }, { status: 500 })
    }

    // Notify admin
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('full_name, phone').eq('id', user.id).single()
      const name = profile?.full_name || 'Customer'

      await createAdminNotification({
        type: 'wallet_request',
        title: `Pluxee recharge request — ${name}`,
        body: `₹${amt} | Txn ref: ${txn_ref.trim()}`,
        link_tab: 'customers',
      })
      await notifyAdmin(
        'Pluxee Recharge Request',
        `💳 Pluxee payment pending verification\nCustomer: ${name}\nPhone: ${profile?.phone || 'N/A'}\nAmount: ₹${amt}\nTxn Ref: ${txn_ref.trim()}`
      )
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[pluxee-request] error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
