import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  const { data } = await supabaseAdmin
    .from('subscription_deliveries')
    .select('*, subscriptions(*, products(*), profiles(*))')
    .eq('not_delivered', false)
    .gte('delivery_date', fromDate)
    .order('delivery_date', { ascending: false })
    .limit(300)

  return NextResponse.json({ deliveries: data || [] })
}
