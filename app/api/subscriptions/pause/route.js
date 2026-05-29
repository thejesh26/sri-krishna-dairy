import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { sendSubscriptionPausedEmail } from '../../../lib/email'
import { notifyAdmin } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user, error } = await requireAuth(request)
    if (error) return error

    const { subscription_id, pause_date } = await request.json()

    if (!subscription_id || !pause_date || !/^\d{4}-\d{2}-\d{2}$/.test(pause_date)) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    // Must be at least 12 hours in the future
    if ((new Date(pause_date).getTime() - Date.now()) / (1000 * 60 * 60) < 12) {
      return NextResponse.json({ error: 'Please pause at least 12 hours in advance.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced by user_id filter)
    const { data: sub, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*, products(*), pause_days_used_this_month')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    // Enforce 5-day monthly pause limit
    const pausedThisMonth = sub.pause_days_used_this_month || 0
    if (pausedThisMonth >= 5) {
      return NextResponse.json({
        error: "You've used all 5 pause days this month. Pausing will resume next month.",
      }, { status: 400 })
    }

    const currentPaused = sub.paused_dates || []
    if (currentPaused.includes(pause_date)) {
      return NextResponse.json({ error: 'This date is already paused.' }, { status: 409 })
    }

    const updatedPaused = [...currentPaused, pause_date].sort()
    const newPausedCount = pausedThisMonth + 1

    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({ paused_dates: updatedPaused, pause_days_used_this_month: newPausedCount })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Extend end_date by 1 day for fixed subscriptions
    if (sub.subscription_type === 'fixed' && sub.end_date) {
      const newEndDate = new Date(sub.end_date + 'T00:00:00')
      newEndDate.setDate(newEndDate.getDate() + 1)
      await supabase
        .from('subscriptions')
        .update({ end_date: newEndDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) })
        .eq('id', subscription_id)
    }

    // Send pause confirmation email + admin notification (non-blocking)
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', user.id).single()
      await sendSubscriptionPausedEmail({
        to: user.email,
        name: profile?.full_name || user.email,
        pauseDate: pause_date,
      })
      await notifyAdmin(
        `Subscription Paused — ${profile?.full_name || 'Customer'}`,
        `⏸️ Subscription paused\nCustomer: ${profile?.full_name || user.id}\nPhone: ${profile?.phone || 'N/A'}\nPaused date: ${pause_date}\nTotal paused days: ${updatedPaused.length}`
      )
    } catch { /* non-blocking */ }

    return NextResponse.json({
      success: true,
      paused_dates: updatedPaused,
      pause_days_used_this_month: newPausedCount,
      pause_days_remaining: Math.max(0, 5 - newPausedCount),
    })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
