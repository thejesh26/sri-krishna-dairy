import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids')?.split(',').map(Number).filter(Boolean)
  if (!ids?.length) return NextResponse.json({ counts: {} })

  const { data } = await supabaseAdmin
    .from('subscription_deliveries')
    .select('subscription_id')
    .in('subscription_id', ids)
    .eq('not_delivered', false)

  const counts = {}
  ;(data || []).forEach(d => {
    counts[d.subscription_id] = (counts[d.subscription_id] || 0) + 1
  })

  return NextResponse.json({ counts })
}
