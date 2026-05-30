import { NextResponse } from 'next/server'
import { createServerClient } from './supabase-server'
import { supabaseAdmin } from './db'

// Extracts and verifies the Bearer JWT from the Authorization header.
// Returns { user } on success, or a NextResponse error to return immediately.
export async function requireAuth(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user }
}

// Like requireAuth but also checks profiles.is_admin.
export async function requireAdmin(request) {
  const result = await requireAuth(request)
  if (result.error) return result

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', result.user.id)
    .single()

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user: result.user }
}

// Like requireAuth but also checks profiles.is_delivery (or is_admin).
export async function requireDelivery(request) {
  const result = await requireAuth(request)
  if (result.error) return result

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, is_delivery')
    .eq('id', result.user.id)
    .single()

  if (!profile?.is_admin && !profile?.is_delivery) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user: result.user, isAdmin: !!profile?.is_admin }
}

// For cron routes — verifies CRON_SECRET in Authorization header.
export function requireCron(request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return {}
}
