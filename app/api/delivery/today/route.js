import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { getISTDate } from '../../../lib/pricing'

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

  // Orders assigned to this agent (or all orders for admin)
  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('*, products(*), profiles(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('delivery_date', today)
    .in('status', ['pending', 'out_for_delivery'])
    .order('delivery_slot', { ascending: true })
  if (!isAdmin) ordersQuery = ordersQuery.eq('assigned_to', user.id)
  const { data: orders } = await ordersQuery

  // Active subscriptions assigned to this agent (or all for admin)
  let subsQuery = supabaseAdmin
    .from('subscriptions')
    .select('*, products(*), profiles(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('delivery_slot', { ascending: true })
  if (!isAdmin) subsQuery = subsQuery.eq('assigned_to', user.id)
  const { data: allSubs } = await subsQuery

  // Filter out paused and non-delivery days client-side
  function isDeliveryDay(sub) {
    const freq = sub.delivery_frequency || 'daily'
    if (freq === 'daily') return true
    const start = new Date(sub.start_date)
    const now = new Date()
    const daysDiff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
    if (freq === 'alternate') return daysDiff % 2 === 0
    if (freq === 'weekly') return daysDiff % 7 === 0
    return true
  }
  const subscriptions = (allSubs || []).filter(sub =>
    !(sub.paused_dates || []).includes(today) && isDeliveryDay(sub)
  )

  // Addon orders for today (unassigned — all agents see them)
  const { data: addonOrders } = await supabaseAdmin
    .from('addon_orders')
    .select('*, products(*), profiles!addon_orders_user_id_fkey(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('delivery_date', today)
    .eq('status', 'pending')

  return NextResponse.json({
    orders: orders || [],
    subscriptions,
    addonOrders: addonOrders || [],
  })
}
