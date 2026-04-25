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
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { entryId, phone, name } = await request.json()
    if (!entryId || !phone || !name) {
      return NextResponse.json({ error: 'entryId, phone, and name are required' }, { status: 400 })
    }

    const message =
      `Hi ${name}! Great news! A slot has opened in your area.\n\n` +
      `Subscribe now: srikrishnaadairy.in/subscribe\n\n` +
      `- Sri Krishnaa Dairy`

    await sendWhatsAppMessage(phone, message)
    await supabaseAdmin
      .from('priority_waitlist')
      .update({ invited: true, invited_at: new Date().toISOString() })
      .eq('id', entryId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
