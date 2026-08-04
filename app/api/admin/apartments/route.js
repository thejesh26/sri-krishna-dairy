import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// GET — all apartments including inactive, for the admin Settings management view
export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('apartments')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ apartments: data || [] })
}

// POST — add a new apartment
export async function POST(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Apartment name is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('apartments')
    .insert({ name: name.trim() })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An apartment with that name already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, data })
}

// PATCH — toggle active/inactive (soft hide from dropdowns; no hard delete, to avoid
// orphaning historical profiles.apartment_id references)
export async function PATCH(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { id, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('apartments')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
