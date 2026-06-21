import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function POST(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { full_name, phone, apartment_name, flat_number, area, landmark } = await request.json()

  if (!full_name || !phone) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const cleanPhone = phone.replace(/\D/g, '').slice(-10)

  if (cleanPhone.length !== 10) {
    return NextResponse.json({ error: 'Phone must be 10 digits' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', cleanPhone)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Customer with this phone already exists' }, { status: 409 })
  }

  const { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
    phone: '91' + cleanPhone,
    phone_confirm: true,
    user_metadata: { full_name },
  })

  if (authCreateError) {
    return NextResponse.json({ error: authCreateError.message }, { status: 500 })
  }

  const referralCode = authUser.user.id.slice(0, 8).toUpperCase()

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: authUser.user.id,
      full_name,
      phone: cleanPhone,
      apartment_name: apartment_name || null,
      flat_number: flat_number || null,
      area: area || null,
      landmark: landmark || null,
      referral_code: referralCode,
      is_admin: false,
      is_delivery: false,
    }, { onConflict: 'id' })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('wallet')
    .upsert({ user_id: authUser.user.id, balance: 0, deposit_balance: 0 }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true, user_id: authUser.user.id })
}
