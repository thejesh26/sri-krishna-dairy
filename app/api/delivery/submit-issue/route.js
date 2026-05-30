import { supabaseAdmin } from '../../../lib/db'
import { requireDelivery } from '../../../lib/auth'

export async function POST(request) {
  try {
    const { user, error: authError } = await requireDelivery(request)
    if (authError) return authError

    const { type, message } = await request.json()
    if (!type || !message?.trim()) {
      return Response.json({ error: 'type and message are required' }, { status: 400 })
    }
    if (!['issue', 'feedback', 'suggestion'].includes(type)) {
      return Response.json({ error: 'type must be issue, feedback, or suggestion' }, { status: 400 })
    }

    const { error: insertError } = await supabaseAdmin.from('delivery_issues').insert({
      reported_by: user.id,
      type,
      message: message.trim(),
      status: 'open',
    })

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Submit issue error:', error)
    return Response.json({ error: 'Server error' }, { status: 500 })
  }
}
