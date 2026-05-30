import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireAdmin(request)
    if (authError) return authError

    const { type, id, agent_id } = await request.json()
    if (!type || !id) return NextResponse.json({ error: 'type and id required' }, { status: 400 })

    if (type === 'subscription') {
      await supabaseAdmin.from('subscriptions').update({ assigned_to: agent_id || null }).eq('id', id)
    } else if (type === 'order') {
      await supabaseAdmin.from('orders').update({ assigned_to: agent_id || null }).eq('id', id)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
