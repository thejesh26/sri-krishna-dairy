import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { data } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json({ leads: data || [] })
}
