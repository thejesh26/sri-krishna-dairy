import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { getISTDate, getScheduledQuantity } from '../../../lib/pricing'

/**
 * GET /api/delivery/today
 * Returns today's orders, subscriptions, and addon orders for the calling delivery agent.
 * Uses service role to bypass RLS — the delivery agent's own JWT cannot read customer
 * profiles or subscriptions assigned to them because RLS only allows owner/admin reads.
 */
export async function GET(request) {
  const { user, error: authError, isAdmin } = await requireDelivery(request)
  if (authError) return authError

  const today = getISTDate()

  // Orders: show all pending orders for today.
  // For non-admins: prefer rows assigned to this agent; fall back to all unassigned rows so
  // agents always see work even when admin hasn't explicitly assigned everything.
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('*, products(*), profiles(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('delivery_date', today)
    .in('status', ['pending', 'out_for_delivery'])
    .order('delivery_slot', { ascending: true })
  if (!isAdmin) {
    ordersQuery = ordersQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
  }
  const { data: orders } = await ordersQuery

  // Subscriptions: same fallback — assigned-to-agent OR unassigned.
  let subsQuery = supabaseAdmin
    .from('subscriptions')
    .select('*, products(*), profiles(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('delivery_slot', { ascending: true })
  if (!isAdmin) {
    subsQuery = subsQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
  }
  const { data: allSubs } = await subsQuery

  // Filter out paused and non-delivery days client-side
  function isDeliveryDay(sub) {
    const freq = sub.delivery_frequency || 'daily'
    if (freq === 'daily') return true
    const start = new Date(sub.start_date + 'T00:00:00+05:30')
    const check = new Date(today + 'T00:00:00+05:30')
    const daysDiff = Math.round((check - start) / (1000 * 60 * 60 * 24))
    if (freq === 'alternate') return daysDiff % 2 === 0
    if (freq === 'weekly') return daysDiff % 7 === 0
    return true
  }
  const subscriptions = (allSubs || []).filter(sub =>
    !(sub.paused_dates || []).includes(today) &&
    isDeliveryDay(sub) &&
    getScheduledQuantity(sub, today) > 0
  )

  // Addon orders for today — include delivered ones so they stay visible after confirmation
  const { data: addonOrders } = await supabaseAdmin
    .from('addon_orders')
    .select('*, products(*), profiles!addon_orders_user_id_fkey(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('delivery_date', today)
    .neq('status', 'cancelled')

  return NextResponse.json({
    orders: orders || [],
    subscriptions,
    addonOrders: addonOrders || [],
  })
}
