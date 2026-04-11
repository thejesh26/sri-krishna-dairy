import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyAdmin(request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return null
  const { data: profile } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

// POST — create a new discount code
export async function POST(request) {
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
  const user = await verifyAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('discount_codes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
