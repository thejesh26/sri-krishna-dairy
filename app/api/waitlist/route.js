import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminAlert } from '../../lib/whatsapp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { name, phone, area, email } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (!phone || !/^[0-9]{10}$/.test(phone.replace(/\D/g, '').slice(-10))) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit phone number.' }, { status: 400 })
    }
    if (!area || typeof area !== 'string' || !area.trim()) {
      return NextResponse.json({ error: 'Please select your area.' }, { status: 400 })
    }

    await supabaseAdmin.from('priority_waitlist').insert({
      name: name.trim(),
      phone: phone.trim(),
      area: area.trim(),
      email: email?.trim() || null,
    })

    await sendAdminAlert(`New waitlist: ${name.trim()}, ${phone.trim()}, ${area.trim()}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { count } = await supabaseAdmin
      .from('priority_waitlist')
      .select('*', { count: 'exact', head: true })
    return NextResponse.json({ count: count || 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
