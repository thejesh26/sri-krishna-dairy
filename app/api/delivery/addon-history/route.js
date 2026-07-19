import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { getISTDate } from '../../../lib/pricing'

export async function GET(request) {
  const { user, error: authError, isAdmin } = await requireDelivery(request)
  if (authError) return authError

  const today = getISTDate()

  let query = supabaseAdmin
    .from('addon_orders')
    .select('*, products(*), profiles!addon_orders_user_id_fkey(full_name, phone, apartment_name, flat_number, area)')
    .eq('status', 'delivered')
    .lt('delivery_date', today)
    .order('delivery_date', { ascending: false })
    .limit(50)

  if (!isAdmin) {
    query = query.eq('delivered_by', user.id)
  }

  const { data } = await query
  return NextResponse.json({ addonOrders: data || [] })
}
