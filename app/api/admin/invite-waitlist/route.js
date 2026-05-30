import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

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
