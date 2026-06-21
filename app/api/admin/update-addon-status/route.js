import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

const ALLOWED_STATUSES = ['pending', 'out_for_delivery', 'cancelled']

export async function POST(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { addon_id, status } = await request.json()
    if (!addon_id || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid addon_id or status.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('addon_orders')
      .update({ status })
      .eq('id', addon_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/update-addon-status] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
