import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    // Get customer email and phone
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id)
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('full_name, phone').eq('id', user_id).single()

    if (!authUser?.user?.email) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 404 })
    }

    // Generate magic link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
      options: { redirectTo: 'https://srikrishnaadairy.in/dashboard' }
    })

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })
    }

    const loginLink = linkData.properties.action_link
    const name = profile?.full_name || 'Customer'

    // Send via WhatsApp
    if (profile?.phone) {
      await sendWhatsAppMessage(profile.phone,
        `Hi ${name}! Here is your Sri Krishnaa Dairy login link:\n\n${loginLink}\n\nThis link expires in 1 hour. Tap it to login directly without a password.\n\n– Sri Krishnaa Dairy Team`
      )
    }

    return NextResponse.json({ success: true, link: loginLink })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
