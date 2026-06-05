import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fromDate = thirtyDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { data, error } = await supabaseAdmin
      .from('subscription_deliveries')
      .select('*, subscriptions(*, products(*))')
      .eq('not_delivered', false)
      .gte('delivery_date', fromDate)
      .order('delivery_date', { ascending: false })
      .limit(300)

    if (error) throw error

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id))]
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .in('id', userIds)
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      data.forEach(d => {
        if (d.subscriptions) d.subscriptions.profiles = profileMap[d.user_id] || null
      })
    }

    return NextResponse.json({ deliveries: data || [] })
  } catch (err) {
    console.error('[admin/delivered-subs] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
