import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    await supabaseAdmin.from('leads').update({ converted: true })
      .eq('email', user.email)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
