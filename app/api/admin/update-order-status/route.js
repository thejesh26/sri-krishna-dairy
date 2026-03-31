import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'

/**
 * SECURITY: Server-side order status update.
 *
 * Closes VULN-05: updateOrderStatus() in admin/page.js ran directly against
 * Supabase using the anon key with only a UI-level admin check. Any authenticated
 * user who called supabase.from('orders').update({ status }) from the browser
 * console could change any order's status if RLS was not enforced.
 *
 * This route re-verifies is_admin from the database on every request.
 */

const VALID_STATUSES = ['pending', 'out_for_delivery', 'delivered', 'cancelled']

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    // Verify JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.slice(7)
    )
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Re-verify admin status from DB on every call — not from a cached flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { order_id, status } = body

    if (!order_id || typeof order_id !== 'string') {
      return NextResponse.json({ error: 'Invalid order_id.' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
