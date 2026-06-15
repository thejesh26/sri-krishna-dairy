import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// POST /api/admin/unpause
// Admin removes a specific date from a subscription's paused_dates array.
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { subscription_id, pause_date } = await request.json()
    if (!subscription_id || !pause_date) {
      return NextResponse.json({ error: 'subscription_id and pause_date are required.' }, { status: 400 })
    }

    const { data: sub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('paused_dates, pause_days_used_this_month')
      .eq('id', subscription_id)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    const updatedPaused = (sub.paused_dates || []).filter(d => d !== pause_date)
    const newPausedCount = Math.max(0, (sub.pause_days_used_this_month || 0) - 1)

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        paused_dates: updatedPaused,
        pause_days_used_this_month: newPausedCount,
      })
      .eq('id', subscription_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, paused_dates: updatedPaused })
  } catch (err) {
    console.error('[admin/unpause] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
