import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error } = await requireAuth(request)
    if (error) return error

    await supabaseAdmin.from('leads').update({ converted: true })
      .eq('email', user.email)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
