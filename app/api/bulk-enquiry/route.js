import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminAlert } from '../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, phone, institution, quantity, message } = body

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!phone || typeof phone !== 'string' || !/^\d{10,13}$/.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json({ error: 'Valid phone number is required.' }, { status: 400 })
    }

    // Save to DB
    await supabaseAdmin.from('bulk_enquiries').insert({
      name: name.trim(),
      phone: phone.trim(),
      institution: institution?.trim() || null,
      quantity: quantity?.trim() || null,
      message: message?.trim() || null,
    })

    // Notify admin via WhatsApp
    const lines = [
      `📦 *New Bulk Enquiry*`,
      `👤 Name: ${name.trim()}`,
      `📞 Phone: ${phone.trim()}`,
      institution?.trim() ? `🏢 Institution: ${institution.trim()}` : null,
      quantity?.trim() ? `🥛 Quantity: ${quantity.trim()}` : null,
      message?.trim() ? `💬 Message: ${message.trim()}` : null,
    ].filter(Boolean).join('\n')

    await sendAdminAlert(lines)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
