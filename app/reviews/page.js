'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { Avatar, Button, Card, EmptyState } from '../components/ui'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

// ── Public review card ────────────────────────────────────────────────────────
function ReviewCard({ review, userId, sessionToken, onLikeToggle }) {
  const [liked, setLiked] = useState(review.liked_by_me)
  const [count, setCount] = useState(review.like_count)
  const [pending, setPending] = useState(false)

  const handleLike = async () => {
    if (!userId || !sessionToken || pending) return
    const prevLiked = liked
    const prevCount = count
    setLiked(!prevLiked)
    setCount(c => !prevLiked ? c + 1 : Math.max(0, c - 1))
    setPending(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        setCount(data.like_count)
        onLikeToggle?.(review.id, data.liked, data.like_count)
      } else {
        setLiked(prevLiked)
        setCount(prevCount)
      }
    } catch {
      setLiked(prevLiked)
      setCount(prevCount)
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      {/* Author + stars */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={review.author} size="sm" />
          <div>
            <p className="font-semibold text-sm text-[#1c1c1c]">{review.author}</p>
            <p className="text-xs text-gray-400">
              {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <span className="text-[#d4a017] text-base tracking-tight" aria-label={`${review.rating} out of 5 stars`}>
          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
        </span>
      </div>

      {/* Review text */}
      {review.review && (
        <p className="text-sm text-gray-600 leading-relaxed">{review.review}</p>
      )}

      {/* Photo */}
      {review.photo_url && (
        <img
          src={review.photo_url}
          alt="Review photo"
          className="w-full max-h-48 object-cover rounded-xl border border-[#e8e0d0]"
        />
      )}

      {/* Helpful / like */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#f5f0e8]">
        {userId ? (
          <Button
            variant={liked ? 'secondary' : 'ghost'}
            size="sm"
            loading={pending}
            onClick={handleLike}
            className="rounded-full text-xs"
          >
            <span style={{ opacity: liked ? 1 : 0.5 }}>👍</span>
            {liked ? 'Helpful ✓' : 'Helpful?'}
          </Button>
        ) : (
          <span className="text-xs text-gray-400 flex items-center gap-1" style={{ opacity: 0.45 }}>
            👍
          </span>
        )}
        {count > 0 && (
          <span className="text-xs text-gray-400">
            {count} {count === 1 ? 'person found this helpful' : 'people found this helpful'}
          </span>
        )}
      </div>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Reviews() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [sessionToken, setSessionToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')
  const fileInputRef = useRef(null)

  const [publicReviews, setPublicReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || null
    setSessionToken(token)
    await loadPublicReviews(token)
    if (!session) { setLoading(false); return }
    setUser(session.user)
    const { data: existing } = await supabase
      .from('reviews').select('rating, review, photo_url')
      .eq('user_id', session.user.id).maybeSingle()
    if (existing) {
      setRating(existing.rating || 0)
      setReviewText(existing.review || '')
      setExistingPhotoUrl(existing.photo_url || null)
    }
    setLoading(false)
  }

  const loadPublicReviews = async (token) => {
    setReviewsLoading(true)
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('/api/reviews/public', { headers })
      if (res.ok) {
        const data = await res.json()
        setPublicReviews(data.reviews || [])
      }
    } catch { /* non-blocking */ }
    setReviewsLoading(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (rating === 0) { setFormError('Please select a star rating.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      let photo_url = existingPhotoUrl
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${session.user.id}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('reviews').upload(path, photoFile, { upsert: true, contentType: photoFile.type })
        if (uploadError) throw new Error('Photo upload failed: ' + uploadError.message)
        const { data: urlData } = supabase.storage.from('reviews').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ rating, review: reviewText, photo_url }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not submit review.')
      setDone(true)
    } catch (err) {
      setFormError(err.message)
    }
    setSubmitting(false)
  }

  const handleLikeToggle = (reviewId, liked, likeCount) => {
    setPublicReviews(prev =>
      prev.map(r => r.id === reviewId ? { ...r, like_count: likeCount, liked_by_me: liked } : r)
    )
  }

  const avgRating = publicReviews.length
    ? (publicReviews.reduce((s, r) => s + r.rating, 0) / publicReviews.length).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-[#fdfbf7] font-[family-name:var(--font-inter)]">
      <Header showBack backUrl="/dashboard" />

      <div className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-10">

        {/* ── Public reviews wall ──────────────────────────────────── */}
        <section>
          <div className="mb-5">
            <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Customer Reviews</p>
            <div className="flex items-end gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-[#1c1c1c] font-[family-name:var(--font-playfair)]">
                What Our Customers Say
              </h2>
              {avgRating && (
                <span className="text-sm text-gray-500 mb-0.5">
                  <span className="text-[#d4a017] font-bold">{avgRating}</span> ★ avg · {publicReviews.length} review{publicReviews.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {reviewsLoading ? (
            <EmptyState loading />
          ) : publicReviews.length === 0 ? (
            <EmptyState icon="⭐" title="No reviews yet" description="Be the first to share your experience!" compact />
          ) : (
            <div className="flex flex-col gap-4">
              {publicReviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  userId={user?.id}
                  sessionToken={sessionToken}
                  onLikeToggle={handleLikeToggle}
                />
              ))}
              {!user && (
                <p className="text-center text-xs text-gray-400">
                  <a href="/login" className="text-[#1a5c38] font-semibold hover:underline">Login</a> to mark reviews as helpful
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Submit review ────────────────────────────────────────── */}
        <section>
          <div className="mb-5">
            <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Share Your Experience</p>
            <h2 className="text-2xl font-bold text-[#1c1c1c] font-[family-name:var(--font-playfair)]">Leave a Review</h2>
            <p className="text-sm text-gray-500 mt-1">Your feedback helps us serve our community better.</p>
          </div>

          {loading ? (
            <EmptyState loading />
          ) : !user ? (
            <EmptyState
              icon="⭐"
              title="Please login to leave a review"
              description="We'd love to hear from you about your experience."
              action={{ label: 'Login to Continue', href: '/login' }}
            />
          ) : done ? (
            <Card className="text-center py-8">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)] text-xl mb-2">Thank you!</p>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Your review has been submitted and will appear once approved by our team.
              </p>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              <Card>
                {/* Star Rating */}
                <p className="font-semibold text-[#1c1c1c] text-sm mb-3">
                  Your Rating <span className="text-red-400">*</span>
                </p>
                <div className="flex gap-2 items-center mb-5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(star)}
                      aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                      style={{
                        fontSize: 36,
                        color: star <= (hovered || rating) ? '#d4a017' : '#e8e0d0',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, lineHeight: 1, transition: 'color 0.15s',
                      }}
                    >★</button>
                  ))}
                  {(hovered || rating) > 0 && (
                    <span className="text-sm font-semibold text-[#1a5c38] ml-1">{LABELS[hovered || rating]}</span>
                  )}
                </div>

                {/* Review Text */}
                <p className="font-semibold text-[#1c1c1c] text-sm mb-2">
                  Your Experience <span className="text-gray-400 font-normal">(optional)</span>
                </p>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about the quality, delivery, or service..."
                  maxLength={500}
                  rows={4}
                  className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#1c1c1c] focus:outline-none focus:border-[#1a5c38] resize-none mb-1"
                />
                <p className="text-xs text-gray-400 text-right mb-5">{reviewText.length}/500</p>

                {/* Photo Upload */}
                <p className="font-semibold text-[#1c1c1c] text-sm mb-2">
                  Add Photo <span className="text-gray-400 font-normal">(optional)</span>
                </p>
                <div className="flex items-center gap-4">
                  {(photoPreview || existingPhotoUrl) && (
                    <div className="relative">
                      <img
                        src={photoPreview || existingPhotoUrl}
                        alt="Preview"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-[#d4a017]"
                      />
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); setExistingPhotoUrl(null) }}
                        className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full w-5 h-5 text-xs text-gray-500 flex items-center justify-center shadow hover:text-red-500"
                        aria-label="Remove photo"
                      >×</button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#e8e0d0] rounded-xl px-5 py-3 text-sm text-gray-500 hover:border-[#1a5c38] hover:text-[#1a5c38] transition flex items-center gap-2"
                  >
                    <span style={{ fontSize: 18 }}>📷</span>
                    {photoPreview || existingPhotoUrl ? 'Change Photo' : 'Add Photo'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>

                {formError && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  disabled={rating === 0}
                  onClick={handleSubmit}
                  className="mt-5"
                >
                  Submit Review
                </Button>
              </Card>

              {/* Google Review Link */}
              <Card className="text-center">
                <p className="text-sm text-gray-500 mb-3">Love our milk? Help others find us too!</p>
                <a
                  href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-[#d4a017] text-[#d4a017] font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#d4a017] hover:text-white transition"
                >
                  <span style={{ fontSize: 18 }}>⭐</span>
                  Also Review Us on Google →
                </a>
              </Card>
            </div>
          )}
        </section>

      </div>
      <Footer />
    </div>
  )
}
