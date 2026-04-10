import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * POST /api/push/subscribe
 * Saves a push subscription object to the user's profile.
 * Body: { subscription: PushSubscriptionJSON }
 */
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

    const { subscription } = await request.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object.' }, { status: 400 })
    }

    // Store push subscription in profiles (requires push_subscription jsonb column)
    // Run this migration in Supabase:
    //   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription jsonb;
    const { error } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}

/**
 * DELETE /api/push/subscribe
 * Removes push subscription for the current user.
 */
export async function DELETE(request) {
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

    await supabase.from('profiles').update({ push_subscription: null }).eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Server error.' }, { status: 500 })
  }
}
