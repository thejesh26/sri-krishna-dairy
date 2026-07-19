import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// POST /api/admin/reactivate-subscription
// Reactivates an inactive subscription. Uses service role to bypass RLS.
export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { subscription_id } = await request.json()
    if (!subscription_id) {
      return NextResponse.json({ error: 'subscription_id is required.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ is_active: true })
      .eq('id', subscription_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reactivate-subscription] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
