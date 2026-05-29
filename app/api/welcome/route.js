import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/db'
import { notifyWelcome } from '../../lib/whatsapp'

export async function POST(request) {
  try {
    const { user_id, phone, name } = await request.json()
    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

    // Verify user exists and was created recently (within last 10 minutes)
    if (user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('created_at').eq('id', user_id).maybeSingle()
      if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const age = Date.now() - new Date(profile.created_at).getTime()
      if (age > 10 * 60 * 1000) return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    console.log('[Welcome] Sending welcome WA to:', phone, 'name:', name)
    await notifyWelcome(phone, name)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Welcome] Error:', err.message)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
