import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function DELETE(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

    const { error } = await supabaseAdmin.from('priority_waitlist').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/waitlist DELETE] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
