import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'
import { getISTDate } from '../../../lib/pricing'

// GET /api/addon-orders/list
// Returns the authenticated customer's addon orders (upcoming + recent past).
export async function GET(request) {
  try {
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const since = thirtyDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { data, error } = await supabaseAdmin
      .from('addon_orders')
      .select('*, products(size, price)')
      .eq('user_id', user.id)
      .gte('delivery_date', since)
      .order('delivery_date', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ addonOrders: data || [] })
  } catch (err) {
    console.error('[addon-orders/list] Error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
