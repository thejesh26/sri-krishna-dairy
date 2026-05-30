import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/db'

/**
 * GET /api/reviews/public
 *
 * Returns approved reviews sorted by helpfulness (like_count desc), then recency.
 * Auth is optional — authenticated users also receive liked_by_me on each review.
 *
 * Optimization: reviews + user likes queries run in parallel via Promise.all.
 * User likes are fetched WITHOUT filtering by review_id, removing the sequential
 * dependency on the reviews query resolving first.
 */
export async function GET(request) {
  // Optional auth — never fail a public read because of a bad/missing token
  let userId = null
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.slice(7))
    userId = user?.id || null
  }

  // Both queries fire simultaneously — no sequential dependency
  const [reviewsResult, likesResult] = await Promise.all([
    supabaseAdmin
      .from('reviews')
      .select('id, rating, review, photo_url, like_count, created_at, profiles(full_name)')
      .eq('is_approved', true)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false }),

    userId
      ? supabaseAdmin
          .from('review_likes')
          .select('review_id')
          .eq('user_id', userId)
      : Promise.resolve({ data: [] }),
  ])

  if (reviewsResult.error) {
    return NextResponse.json({ error: reviewsResult.error.message }, { status: 500 })
  }

  const likedSet = new Set((likesResult.data || []).map(l => l.review_id))

  const reviews = (reviewsResult.data || []).map(r => ({
    id: r.id,
    rating: r.rating,
    review: r.review,
    photo_url: r.photo_url,
    like_count: r.like_count,
    created_at: r.created_at,
    author: r.profiles?.full_name
      ? r.profiles.full_name.split(' ')[0]
      : 'Customer',
    liked_by_me: likedSet.has(r.id),
  }))

  return NextResponse.json({ reviews })
}
