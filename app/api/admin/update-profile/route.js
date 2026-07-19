import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// Allowed fields admin can update on a profile — prevents arbitrary column writes.
const ALLOWED_FIELDS = ['is_banned', 'has_used_cod', 'is_delivery']

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { user_id, fields } = await request.json()
    if (!user_id || !fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'user_id and fields are required.' }, { status: 400 })
    }

    const sanitized = Object.fromEntries(
      Object.entries(fields).filter(([k]) => ALLOWED_FIELDS.includes(k))
    )
    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No allowed fields provided.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(sanitized)
      .eq('id', user_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/update-profile] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
