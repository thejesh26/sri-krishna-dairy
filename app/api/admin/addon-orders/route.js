import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data: addons, error } = await supabaseAdmin
      .from('addon_orders')
      .select('*, products(*)')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (addons && addons.length > 0) {
      const userIds = [...new Set(addons.map(a => a.user_id))]
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      addons.forEach(a => { a.profiles = profileMap[a.user_id] || null })
    }

    return NextResponse.json({ addonOrders: addons || [] })
  } catch (err) {
    console.error('[admin/addon-orders] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
