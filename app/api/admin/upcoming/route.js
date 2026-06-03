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
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('*, products(*), profiles(*)')
      .eq('is_active', true)
      .lte('start_date', end)
    return NextResponse.json({ subscriptions: data || [] })
  }

  if (type === 'orders') {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('*, products(*), profiles(*)')
      .in('status', ['pending', 'out_for_delivery'])
      .gt('delivery_date', start)
      .lte('delivery_date', end)
    return NextResponse.json({ orders: data || [] })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}