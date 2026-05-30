import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../lib/db'
import { requireAuth } from '../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError
    const { message, type } = await request.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message required.' }, { status: 400 })
    await supabaseAdmin.from('customer_suggestions').insert({
      user_id: user.id,
      message: message.trim(),
      type: type || 'suggestion',
      status: 'open',
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
