import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data, error } = await supabaseAdmin
      .from('addon_orders')
      .select('*, products(*), profiles!addon_orders_user_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ addonOrders: data || [] })
  } catch (err) {
    console.error('[admin/addon-orders] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
