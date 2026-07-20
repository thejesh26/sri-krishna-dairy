import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

const SUPABASE_STORAGE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

function validatePhotoUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    if (!SUPABASE_STORAGE_HOST || !u.hostname.endsWith(SUPABASE_STORAGE_HOST)) return null
    return url
  } catch { return null }
}

export async function POST(request) {
  const { user, error: authError } = await requireAuth(request)
  if (authError) return authError

  const { rating, review, photo_url } = await request.json()
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('reviews')
    .upsert(
      {
        user_id: user.id,
        rating,
        review: review?.trim() || null,
        photo_url: validatePhotoUrl(photo_url),
        is_approved: false,
      },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
