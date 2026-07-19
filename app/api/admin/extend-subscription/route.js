import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// POST /api/admin/extend-subscription
// Extends a subscription's end_date by N days. Uses service role to bypass RLS.
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { subscription_id, days } = await request.json()
    if (!subscription_id || !days || isNaN(parseInt(days)) || parseInt(days) <= 0) {
      return NextResponse.json({ error: 'subscription_id and a positive days value are required.' }, { status: 400 })
    }

    const { data: sub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('end_date')
      .eq('id', subscription_id)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    const istToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const base = new Date((sub.end_date ?? istToday) + 'T00:00:00+05:30')
    base.setDate(base.getDate() + parseInt(days))
    const newEndDate = base.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ end_date: newEndDate })
      .eq('id', subscription_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, end_date: newEndDate })
  } catch (err) {
    console.error('[extend-subscription] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
