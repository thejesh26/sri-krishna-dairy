import { createServerClient } from '../../../lib/supabase-server'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7))
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles').select('is_delivery, is_admin').eq('id', user.id).single()
    if (!profile?.is_delivery && !profile?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { type, message } = await request.json()
    if (!type || !message?.trim()) {
      return Response.json({ error: 'type and message are required' }, { status: 400 })
    }
    if (!['issue', 'feedback', 'suggestion'].includes(type)) {
      return Response.json({ error: 'type must be issue, feedback, or suggestion' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('delivery_issues').insert({
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
