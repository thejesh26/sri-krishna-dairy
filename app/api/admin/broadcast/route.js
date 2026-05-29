import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'
import { sendWhatsAppMessage } from '../../../lib/whatsapp'

export async function POST(request) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const { message } = await request.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

    const { data: customers } = await supabaseAdmin
      .from('profiles')
      .select('phone, full_name')
      .eq('is_admin', false)
      .eq('is_delivery', false)
      .not('phone', 'is', null)

    let sent = 0
    for (const customer of customers || []) {
      if (customer.phone) {
        const firstName = customer.full_name?.split(' ')[0] || 'there'
        const personalised = message.replace('{Name}', firstName)
        await sendWhatsAppMessage(customer.phone, personalised)
        sent++
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return NextResponse.json({ success: true, sent })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
