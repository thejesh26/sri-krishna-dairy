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
    // Filter by the agent's assigned customers (same logic as delivery/today).
    // Using delivered_by would exclude addons confirmed by an admin on the agent's behalf.
    const { data: assignedSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('is_active', true)
      .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
    const userIds = [...new Set((assignedSubs || []).map(s => s.user_id))]
    if (userIds.length === 0) {
      return NextResponse.json({ addonOrders: [] })
    }
    query = query.in('user_id', userIds)
  }

  const { data, error } = await query
  if (error) {
    console.error('[addon-history] query error:', error)
    return NextResponse.json({ error: 'Failed to load addon history.' }, { status: 500 })
  }
  return NextResponse.json({ addonOrders: data || [] })
}
