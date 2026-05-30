import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'

export async function POST(request) {
  try {
    const { email, name, phone } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    await supabaseAdmin.from('leads').upsert({
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      email: email.trim().toLowerCase(),
      source: 'signup',
      converted: false,
    }, { onConflict: 'email' })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
