import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { createAdminNotification } from '../../../lib/notify'

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

    // Fetch subscription info for the notification
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id, profiles(full_name, phone)')
      .eq('id', subscription_id)
      .maybeSingle()

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ is_active: true })
      .eq('id', subscription_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const name = sub?.profiles?.full_name || sub?.user_id || 'Customer'
    const phone = sub?.profiles?.phone || 'N/A'
    await createAdminNotification({
      type: 'reactivation',
      title: `Subscription reactivated — ${name}`,
      body: `Phone: ${phone} | Subscription #${subscription_id}`,
      link_tab: 'customers',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reactivate-subscription] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
