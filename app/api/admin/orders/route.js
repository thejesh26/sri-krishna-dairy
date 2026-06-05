import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, products(*), profiles(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ orders: data || [] })
  } catch (err) {
    console.error('[admin/orders] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
