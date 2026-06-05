import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')?.split(',').map(Number).filter(Boolean)
    const date = searchParams.get('date')
    if (!ids?.length || !date) return NextResponse.json({ statuses: {} })

    const { data, error } = await supabaseAdmin
      .from('subscription_deliveries')
      .select('subscription_id, not_delivered')
      .in('subscription_id', ids)
      .eq('delivery_date', date)

    if (error) throw error

    const statuses = {}
    ;(data || []).forEach(d => {
      statuses[d.subscription_id] = d.not_delivered ? 'missed' : 'delivered'
    })

    return NextResponse.json({ statuses })
  } catch (err) {
    console.error('[admin/delivery-statuses] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
