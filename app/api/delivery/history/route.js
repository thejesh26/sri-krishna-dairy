import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { getISTDate } from '../../../lib/pricing'

// GET /api/delivery/history
// Returns past delivered orders and subscription deliveries for the calling agent.
// Uses service role to bypass RLS — delivery agents are not the row owners.
export async function GET(request) {
  const { user, error: authError, isAdmin } = await requireDelivery(request)
  if (authError) return authError

  const today = getISTDate()

  // Delivered one-time orders (assigned to this agent or unassigned)
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('*, products(*), profiles(full_name, phone, apartment_name, flat_number, area)')
    .eq('status', 'delivered')
    .lt('delivery_date', today)
    .order('delivery_date', { ascending: false })
    .limit(100)
  if (!isAdmin) {
    ordersQuery = ordersQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
  }

  // Subscription delivery records (delivered_by stores the agent's UUID)
  let sdQuery = supabaseAdmin
    .from('subscription_deliveries')
    .select('*, subscriptions(*, products(*), profiles(full_name, phone, apartment_name, flat_number, area))')
    .lt('delivery_date', today)
    .order('delivery_date', { ascending: false })
    .limit(100)
  if (!isAdmin) {
    sdQuery = sdQuery.eq('delivered_by', user.id)
  }

  const [{ data: orderHistory, error: oErr }, { data: sdHistory, error: sdErr }] = await Promise.all([
    ordersQuery, sdQuery,
  ])

  if (oErr) console.error('[delivery/history] orders error:', oErr)
  if (sdErr) console.error('[delivery/history] sd error:', sdErr)

  return NextResponse.json({
    orderHistory: orderHistory || [],
    sdHistory: sdHistory || [],
  })
}
