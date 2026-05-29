import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

const VALID_STATUSES = ['pending', 'out_for_delivery', 'delivered', 'cancelled', 'missed']

export async function POST(request) {
  try {
    const { error } = await requireAdmin(request)
    if (error) return error

    const body = await request.json()
    const { order_id, status } = body

    if (!order_id && order_id !== 0) {
      return NextResponse.json({ error: 'Invalid order_id.' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', order_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
