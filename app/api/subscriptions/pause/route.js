import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { sendSubscriptionPausedEmail } from '../../../lib/email'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription_id, pause_date } = await request.json()

    if (!subscription_id || !pause_date || !/^\d{4}-\d{2}-\d{2}$/.test(pause_date)) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
    }

    // Must be at least 12 hours in the future
    if ((new Date(pause_date).getTime() - Date.now()) / (1000 * 60 * 60) < 12) {
      return NextResponse.json({ error: 'Please pause at least 12 hours in advance.' }, { status: 400 })
    }

    // Fetch subscription (ownership enforced by user_id filter)
    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (fetchError || !sub) {
      return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 })
    }

    const currentPaused = sub.paused_dates || []
    if (currentPaused.includes(pause_date)) {
      return NextResponse.json({ error: 'This date is already paused.' }, { status: 409 })
    }

    const updatedPaused = [...currentPaused, pause_date].sort()

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ paused_dates: updatedPaused })
      .eq('id', subscription_id)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send pause confirmation email (non-blocking)
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      await sendSubscriptionPausedEmail({
        to: user.email,
        name: profile?.full_name || user.email,
        pauseDate: pause_date,
      })
    } catch { /* email failure must not block response */ }

    return NextResponse.json({ success: true, paused_dates: updatedPaused })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
