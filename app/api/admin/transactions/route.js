import { NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
