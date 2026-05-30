import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end) return NextResponse.json({ error: 'start and end required' }, { status: 400 })

    const { data: transactions, error } = await supabaseAdmin
  .from('wallet_transactions')
  .select('*')
  .gte('created_at', start + 'T00:00:00')
  .lte('created_at', end + 'T23:59:59')
  .order('created_at', { ascending: false })

if (error) {
  console.error('[Transactions] Query error:', error.message)
  return NextResponse.json({ error: error.message }, { status: 500 })
}

// Fetch profile names separately
const userIds = [...new Set((transactions || []).map(t => t.user_id))]
const { data: profiles } = await supabaseAdmin
  .from('profiles')
  .select('id, full_name, phone')
  .in('id', userIds)

const profileMap = {}
;(profiles || []).forEach(p => { profileMap[p.id] = p })

const enriched = (transactions || []).map(t => ({
  ...t,
  profiles: profileMap[t.user_id] || null
}))

console.log('[Transactions] Found:', enriched.length)
return NextResponse.json({ transactions: enriched })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
