import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { createAdminNotification } from '../../../lib/notify'
import crypto from 'crypto'

// PayU sends webhook as POST application/x-www-form-urlencoded
// Called when a Pluxee (Sodexo) payment completes via PayU gateway
export async function POST(request) {
  let txnid = '(unknown)'
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    const key         = params.get('key')         || ''
    txnid             = params.get('txnid')        || ''
    const amount      = params.get('amount')       || ''
    const productinfo = params.get('productinfo')  || ''
    const firstname   = params.get('firstname')    || ''
    const email       = params.get('email')        || ''
    const phone       = params.get('phone')        || ''
    const status      = params.get('status')       || ''
    const hash        = params.get('hash')         || ''
    const udf1        = params.get('udf1')         || ''
    const udf2        = params.get('udf2')         || ''
    const udf3        = params.get('udf3')         || ''
    const udf4        = params.get('udf4')         || ''
    const udf5        = params.get('udf5')         || ''

    // ── Verify PayU hash ─────────────────────────────────────────────────────
    // Response hash (reversed order vs request hash):
    // sha512(SALT|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    const salt = process.env.PAYU_SALT
    if (!salt) {
      console.error('[payu-webhook] PAYU_SALT env var not set')
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }
    const hashInput = `${salt}|${status}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`
    const expectedHash = crypto.createHash('sha512').update(hashInput).digest('hex')

    if (expectedHash !== hash) {
      console.error(`[payu-webhook] hash mismatch for txnid=${txnid}`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // ── Only credit on success ────────────────────────────────────────────────
    if (status !== 'success') {
      console.log(`[payu-webhook] txnid=${txnid} status=${status}, skipping`)
      return NextResponse.json({ received: true, status })
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error(`[payu-webhook] invalid amount "${amount}" for txnid=${txnid}`)
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // ── Idempotency: check if already processed ───────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from('wallet_requests')
      .select('id, status')
      .eq('payment_method', 'pluxee')
      .eq('txn_ref', txnid)
      .limit(1)

    if (existing?.length) {
      console.log(`[payu-webhook] txnid=${txnid} already processed, skipping`)
      return NextResponse.json({ received: true, already_processed: true })
    }

    // ── Match customer by phone (last 10 digits) ──────────────────────────────
    const normalizedPhone = phone.replace(/\D/g, '').slice(-10)
    let matchedUser = null

    if (normalizedPhone.length === 10) {
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, phone')
        .not('phone', 'is', null)

      for (const p of profiles || []) {
        if ((p.phone || '').replace(/\D/g, '').slice(-10) === normalizedPhone) {
          matchedUser = p
          break
        }
      }
    }

    // ── No match: store pending for admin to resolve ──────────────────────────
    if (!matchedUser) {
      await supabaseAdmin.from('wallet_requests').insert({
        requested_by: null,
        target_user_id: null,
        action: 'add',
        amount: amountNum,
        payment_method: 'pluxee',
        txn_ref: txnid,
        note: `PayU webhook — unmatched phone: ${phone}, name: ${firstname}, email: ${email}`,
        status: 'pending',
      })
      await createAdminNotification({
        type: 'wallet_request',
        title: `Pluxee payment — customer not matched`,
        body: `₹${amountNum} received from ${firstname || phone} but no account found. Txn: ${txnid}`,
        link_tab: 'customers',
      })
      console.warn(`[payu-webhook] no profile matched for phone="${phone}" txnid=${txnid}`)
      return NextResponse.json({ received: true, matched: false })
    }

    // ── Mark as auto-approved (also acts as idempotency insert) ──────────────
    const { error: insertError } = await supabaseAdmin.from('wallet_requests').insert({
      requested_by: matchedUser.id,
      target_user_id: matchedUser.id,
      action: 'add',
      amount: amountNum,
      payment_method: 'pluxee',
      txn_ref: txnid,
      note: `Pluxee auto-credit via PayU webhook — Txn: ${txnid}`,
      status: 'auto_approved',
    })

    if (insertError) {
      if (insertError.code === '23505') {
        // Concurrent duplicate webhook — safe to ignore
        return NextResponse.json({ received: true, already_processed: true })
      }
      console.error(`[payu-webhook] wallet_request insert error for txnid=${txnid}:`, insertError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // ── Credit the wallet ─────────────────────────────────────────────────────
    const { data: wallet } = await supabaseAdmin
      .from('wallet')
      .select('balance')
      .eq('user_id', matchedUser.id)
      .maybeSingle()

    const newBalance = (wallet?.balance || 0) + amountNum

    const [walletResult, txnResult] = await Promise.all([
      wallet
        ? supabaseAdmin.from('wallet').update({ balance: newBalance }).eq('user_id', matchedUser.id)
        : supabaseAdmin.from('wallet').insert({ user_id: matchedUser.id, balance: newBalance }),
      supabaseAdmin.from('wallet_transactions').insert({
        user_id: matchedUser.id,
        amount: amountNum,
        type: 'credit',
        description: `Pluxee recharge — ₹${amountNum} (Ref: ${txnid})`,
      }),
    ])

    if (walletResult.error) {
      console.error(`[payu-webhook] wallet update failed for txnid=${txnid}:`, walletResult.error)
    }
    if (txnResult.error) {
      console.error(`[payu-webhook] wallet_transaction insert failed for txnid=${txnid}:`, txnResult.error)
    }

    console.log(`[payu-webhook] credited ₹${amountNum} to ${matchedUser.full_name} (${matchedUser.id}) txnid=${txnid}`)
    return NextResponse.json({ received: true, matched: true, credited: amountNum })

  } catch (err) {
    console.error(`[payu-webhook] unhandled error for txnid=${txnid}:`, err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
