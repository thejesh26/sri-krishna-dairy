import { createServerClient } from '../../../lib/supabase-server'
import { sendEmail } from '../../../lib/email'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!adminProfile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { subscription_id, cancelled_by, cancellation_reason } = await request.json()
    if (!subscription_id) {
      return Response.json({ error: 'subscription_id required' }, { status: 400 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('user_id, products(size)')
      .eq('id', subscription_id)
      .single()

    if (!sub) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', sub.user_id)
      .single()

    const { data: { user: customerUser } } = await supabase.auth.admin.getUserById(sub.user_id)

    const updatePayload = { is_active: false }
    if (cancelled_by) updatePayload.cancelled_by = cancelled_by
    if (cancellation_reason) updatePayload.cancellation_reason = cancellation_reason

    await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', subscription_id)

    const name = profile?.full_name || 'Customer'
    const email = customerUser?.email

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Subscription Stopped - Sri Krishnaa Dairy',
        html: `<p>Hi ${name},</p>
<p>Your milk subscription has been stopped by the admin.</p>
<p>For queries, please contact us at <strong>9980166221</strong> or <strong>hello@srikrishnaadairy.in</strong></p>
<p>— Sri Krishnaa Dairy Team</p>`,
        text: `Hi ${name}, your milk subscription has been stopped by admin. For queries contact: 9980166221 or hello@srikrishnaadairy.in`,
      }).catch(() => {})
    }

    if (profile?.phone) {
      await sendWhatsAppMessage(
        profile.phone,
        `Hi ${name}! Your milk subscription has been stopped. Please contact us: 9980166221`
      ).catch(() => {})
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Stop subscription error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
