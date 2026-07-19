import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// POST /api/admin/pause
// Admin adds a date to a subscription's paused_dates array.
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { subscription_id, pause_date } = await request.json()
    if (!subscription_id || !pause_date) {
      return NextResponse.json({ error: 'subscription_id and pause_date are required.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pause_date)) {
      return NextResponse.json({ error: 'pause_date must be in YYYY-MM-DD format.' }, { status: 400 })
    }

    const { data: sub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('paused_dates, pause_days_used_this_month')
      .eq('id', subscription_id)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    const existing = sub.paused_dates || []
    if (existing.includes(pause_date)) {
      return NextResponse.json({ error: 'Date is already paused.', paused_dates: existing }, { status: 409 })
    }

    const newPaused = [...existing, pause_date].sort()

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        paused_dates: newPaused,
        pause_days_used_this_month: (sub.pause_days_used_this_month || 0) + 1,
      })
      .eq('id', subscription_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, paused_dates: newPaused })
  } catch (err) {
    console.error('[admin/pause] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
