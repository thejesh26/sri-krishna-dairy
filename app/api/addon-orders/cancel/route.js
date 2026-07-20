import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

// POST /api/addon-orders/cancel
// Customer cancels a pending addon order. Only allowed before 6AM on the delivery date.
export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { addon_id } = await request.json()
    if (!addon_id) return NextResponse.json({ error: 'addon_id is required.' }, { status: 400 })

    // Verify ownership
    const { data: addon } = await supabaseAdmin
      .from('addon_orders')
      .select('id, user_id, status, delivery_date, total_price, payment_method')
      .eq('id', addon_id)
      .eq('user_id', user.id)
      .single()

    if (!addon) return NextResponse.json({ error: 'Addon order not found.' }, { status: 404 })
    if (addon.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending addon orders can be cancelled.' }, { status: 400 })
    }

    // Only allow cancellation before 6AM IST on the delivery date
    const cutoff = new Date(`${addon.delivery_date}T06:00:00+05:30`)
    if (new Date() >= cutoff) {
      return NextResponse.json({ error: 'Cancellation not allowed after 6AM on the delivery date.' }, { status: 400 })
    }

    // Atomically cancel — prevents double-cancel
    const { data: cancelled } = await supabaseAdmin
      .from('addon_orders')
      .update({ status: 'cancelled' })
      .eq('id', addon_id)
      .eq('status', 'pending')
      .select('id')

    if (!cancelled?.length) {
      return NextResponse.json({ error: 'Addon order already cancelled.' }, { status: 409 })
    }

    // Refund if paid from wallet
    const refundAmount = addon.total_price || 0
    if (refundAmount > 0 && addon.payment_method !== 'COD') {
      const { data: wallet } = await supabaseAdmin
        .from('wallet').select('balance').eq('user_id', user.id).maybeSingle()
      if (wallet) {
        await supabaseAdmin.from('wallet').update({ balance: (wallet.balance || 0) + refundAmount }).eq('user_id', user.id)
        await supabaseAdmin.from('wallet_transactions').insert({
          user_id: user.id,
          amount: refundAmount,
          type: 'credit',
          description: `Addon order cancellation refund — delivery ${addon.delivery_date}`,
        })
      }
    }

    return NextResponse.json({ success: true, refund_amount: refundAmount })
  } catch (err) {
    console.error('[addon-orders/cancel] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
