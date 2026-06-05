import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('*, products(*)')
    .order('created_at', { ascending: false })

  if (subs && subs.length > 0) {
    const userIds = [...new Set(subs.map(s => s.user_id))]
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', userIds)
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    subs.forEach(sub => { sub.profiles = profileMap[sub.user_id] || null })
  }

  return NextResponse.json({ subscriptions: subs || [] })
}
