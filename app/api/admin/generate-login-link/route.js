import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.slice(7))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
