import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const end = searchParams.get('end')
  const start = searchParams.get('start')

  if (type === 'subscriptions') {
    const { data: subs } = await supabaseAdmin
      .from('subscriptions')
      .select('*, products(*)')
      .eq('is_active', true)
      .lte('start_date', end)

    if (subs && subs.length > 0) {
      const userIds = [...new Set(subs.map(s => s.user_id))]
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      subs.forEach(sub => { sub.profiles = profileMap[sub.user_id] || null })
    }

    return NextResponse.json({ subscriptions: subs || [] })
  }

  if (type === 'orders') {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('*, products(*)')
      .in('status', ['pending', 'out_for_delivery'])
      .gt('delivery_date', start)
      .lte('delivery_date', end)

    if (orders && orders.length > 0) {
      const userIds = [...new Set(orders.map(o => o.user_id))]
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      orders.forEach(o => { o.profiles = profileMap[o.user_id] || null })
    }

    return NextResponse.json({ orders: orders || [] })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
