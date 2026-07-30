import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'
import { getISTDate, getScheduledQuantity } from '../../../lib/pricing'
import { notifyAdmin } from '../../../lib/whatsapp'

const PROFILE_FIELDS = 'full_name, phone, apartment_name, flat_number, area, landmark, pincode'

function isDeliveryDay(sub, today) {
  const freq = sub.delivery_frequency || 'daily'
  if (freq === 'daily') return true
  const start = new Date(sub.start_date + 'T00:00:00+05:30')
  const check = new Date(today + 'T00:00:00+05:30')
  const daysDiff = Math.round((check - start) / (1000 * 60 * 60 * 24))
  if (freq === 'alternate') return daysDiff % 2 === 0
  if (freq === 'weekly') return daysDiff % 7 === 0
  return true
}

// Live-computed fallback — only used when today's snapshot is missing (e.g. the 5:30 AM
// cron hasn't run yet or failed). Matches the filter the snapshot cron itself applies.
async function loadSubscriptionsLive(today) {
  const { data: allSubs } = await supabaseAdmin
    .from('subscriptions')
    .select(`*, products(*), profiles(${PROFILE_FIELDS})`)
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('delivery_slot', { ascending: true })

  return (allSubs || []).filter(sub =>
    !(sub.paused_dates || []).includes(today) &&
    isDeliveryDay(sub, today) &&
    getScheduledQuantity(sub, today) > 0
  )
}

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
    .select(`*, products(*), profiles(${PROFILE_FIELDS})`)
    .eq('delivery_date', today)
    .in('status', ['pending', 'out_for_delivery'])
    .order('delivery_slot', { ascending: true })
  if (!isAdmin) {
    ordersQuery = ordersQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`)
  }
  const { data: orders } = await ordersQuery

  // Subscriptions: read today's frozen snapshot (written by the 5:30 AM cron) instead of
  // recomputing live — a pause/edit made after the snapshot must not change what's already
  // shown as scheduled for today. Falls back to the live computation if the snapshot is
  // missing, so a failed cron degrades gracefully instead of showing an empty list.
  const { data: snapshotRows } = await supabaseAdmin
    .from('subscription_deliveries')
    .select(`*, subscriptions(*, products(*), profiles(${PROFILE_FIELDS}))`)
    .eq('delivery_date', today)

  let subscriptions
  let snapshotMissing = false

  if (snapshotRows?.length) {
    subscriptions = snapshotRows
      .filter(row => row.subscriptions)
      .map(row => ({
        ...row.subscriptions,
        id: row.subscription_id,
        quantity: row.quantity,
        delivery_status: row.status,
      }))
      .sort((a, b) => (a.delivery_slot || '').localeCompare(b.delivery_slot || ''))
  } else {
    snapshotMissing = true
    console.error(`[delivery/today] snapshot missing for ${today} — falling back to live computation`)
    subscriptions = await loadSubscriptionsLive(today)
    notifyAdmin(
      "Today's Delivery Snapshot Missing",
      `⚠️ No subscription_deliveries snapshot found for ${today}. The 5:30 AM snapshot cron may not have run. Showing live-computed numbers instead — these can still drift during the day.`
    ).catch(() => {})
  }

  if (!isAdmin) {
    subscriptions = subscriptions.filter(sub => !sub.assigned_to || sub.assigned_to === user.id)
  }

  // Addon orders for today — include delivered ones so they stay visible after confirmation.
  // Filter by the same agent assignment as subscriptions: only show addons for customers
  // whose subscription is assigned to this agent (or unassigned).
  let addonQuery = supabaseAdmin
    .from('addon_orders')
    .select(`*, products(*), profiles!addon_orders_user_id_fkey(${PROFILE_FIELDS})`)
    .eq('delivery_date', today)
    .neq('status', 'cancelled')

  if (!isAdmin) {
    const userIds = [...new Set(subscriptions.map(s => s.user_id))]
    if (userIds.length === 0) {
      return NextResponse.json({ orders: orders || [], subscriptions, addonOrders: [], snapshot_missing: snapshotMissing })
    }
    addonQuery = addonQuery.in('user_id', userIds)
  }

  const { data: addonOrders } = await addonQuery

  return NextResponse.json({
    orders: orders || [],
    subscriptions,
    addonOrders: addonOrders || [],
    snapshot_missing: snapshotMissing,
  })
}
