import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAdmin } from '../../../lib/auth'

// GET — fetch recent notifications + unread count
export async function GET(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const { data: notifications } = await supabaseAdmin
    .from('admin_notifications')
    .select('id, type, title, body, link_tab, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  const unread = (notifications || []).filter(n => !n.is_read).length

  return NextResponse.json({ notifications: notifications || [], unread })
}

// POST — mark all as read, or mark specific ids as read
export async function POST(request) {
  const { error: authError } = await requireAdmin(request)
  if (authError) return authError

  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body?.ids) ? body.ids : null

  if (ids) {
    await supabaseAdmin.from('admin_notifications').update({ is_read: true }).in('id', ids)
  } else {
    await supabaseAdmin.from('admin_notifications').update({ is_read: true }).eq('is_read', false)
  }

  return NextResponse.json({ success: true })
}
