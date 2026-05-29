import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// POST — create a new discount code
export async function POST(request) {
  const { user, error } = await requireAdmin(request)
  if (error) return error

  const { code, percent, description } = await request.json()
  if (!code || !percent || typeof percent !== 'number' || percent < 1 || percent > 99) {
    return NextResponse.json({ error: 'Valid code and percent (1–99) are required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .insert({
      code: code.trim().toUpperCase(),
      percent,
      description: description?.trim() || null,
      is_active: true,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

// PATCH — toggle active/inactive
export async function PATCH(request) {
  const { user, error } = await requireAdmin(request)
  if (error) return error

  const { id, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('discount_codes')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove a discount code
export async function DELETE(request) {
  const { error } = await requireAdmin(request)
  if (error) return error

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('discount_codes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
