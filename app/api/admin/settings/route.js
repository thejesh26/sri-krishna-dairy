import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('key, value')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data || [] })
}

export async function POST(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { key, value } = await request.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
