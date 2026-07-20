import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { getISTDate, getScheduledQuantity } from '../../../lib/pricing'

/**
 * GET /api/delivery/upcoming?date=YYYY-MM-DD
 * Returns subscriptions and addon orders for the given date (defaults to tomorrow).
 * Used by delivery agents to preview tomorrow's workload.
 */
export async function GET(request) {
  const { user, error: authError, isAdmin } = await requireDelivery(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const today = getISTDate()
  const tomorrow = new Date(today + 'T00:00:00+05:30')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDate = tomorrow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const date = searchParams.get('date') || defaultDate

  // Only allow future dates (not today — that's the today route)
  if (date <= today) {
    return NextResponse.json({ error: 'Use /api/delivery/today for current-day deliveries.' }, { status: 400 })
  }

  let subsQuery = supabaseAdmin
    .from('subscriptions')
    .select('*, products(*), profiles(full_name, phone, apartment_name, flat_number, area, landmark, pincode)')
    .eq('is_active', true)
    .lte('start_date', date)
    .or(`end_date.is.null,end_date.gte.${date}`)
    .order('delivery_slot', { ascending: true })
  if (!isAdmin) {
    subsQuery = subsQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
  }
  const { data: allSubs } = await subsQuery

  function isDeliveryDay(sub) {
    const freq = sub.delivery_frequency || 'daily'
    if (freq === 'daily') return true
    const start = new Date(sub.start_date + 'T00:00:00+05:30')
    const check = new Date(date + 'T00:00:00+05:30')
    const daysDiff = Math.round((check - start) / (1000 * 60 * 60 * 24))
    if (freq === 'alternate') return daysDiff % 2 === 0
    if (freq === 'weekly') return daysDiff % 7 === 0
    return true
  }

  const subscriptions = (allSubs || []).filter(sub =>
    !(sub.paused_dates || []).includes(date) &&
    isDeliveryDay(sub) &&
    getScheduledQuantity(sub, date) > 0
  )

  let addonQuery = supabaseAdmin
    .from('addon_orders')
    .select('*, products(*), profiles!addon_orders_user_id_fkey(full_name, phone, apartment_name, flat_number, area)')
    .eq('delivery_date', date)
    .neq('status', 'cancelled')

  if (!isAdmin) {
    const userIds = [...new Set((allSubs || []).map(s => s.user_id))]
    if (userIds.length === 0) {
      return NextResponse.json({ subscriptions, addonOrders: [], date })
    }
    addonQuery = addonQuery.in('user_id', userIds)
  }

  const { data: addonOrders } = await addonQuery

  return NextResponse.json({ subscriptions, addonOrders: addonOrders || [], date })
}
