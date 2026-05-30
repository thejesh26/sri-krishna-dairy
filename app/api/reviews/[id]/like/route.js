import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/db'
import { requireAuth } from '../../../../lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/reviews/[id]/like
 *
 * Atomically toggles a like on an approved review via a single PostgreSQL
 * function call. The RPC handles INSERT-or-DELETE + counter update in one
 * transaction, eliminating the race condition present in the read-modify-write
 * pattern.
 *
 * Returns: { liked: boolean, like_count: number }
 */
export async function POST(request, { params }) {
  const { user, error: authError } = await requireAuth(request)
  if (authError) return authError

  const reviewId = params.id

  if (!UUID_RE.test(reviewId)) {
    return NextResponse.json({ error: 'Invalid review id.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.rpc('toggle_review_like', {
    p_review_id: reviewId,
    p_user_id: user.id,
  })

  if (error) {
    if (error.message?.includes('review_not_found')) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 })
    }
    console.error('[reviews/like] RPC error:', error.message)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }

  return NextResponse.json({ liked: data.liked, like_count: data.like_count })
}
