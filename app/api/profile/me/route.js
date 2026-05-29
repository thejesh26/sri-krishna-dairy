import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { user, error } = await requireAuth(request)
    if (error) return error

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
