'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

export default function Reviews() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    setUser(session.user)

    const { data: existing } = await supabase
      .from('reviews')
      .select('rating, review, photo_url')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (existing) {
      setRating(existing.rating || 0)
      setReviewText(existing.review || '')
      setExistingPhotoUrl(existing.photo_url || null)
    }
    setLoading(false)
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a star rating.'); return }
    setError('')
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      let photo_url = existingPhotoUrl

      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${session.user.id}_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('reviews')
          .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
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
      setError(err.message)
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] font-[family-name:var(--font-inter)]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh - Pure - Natural</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Dashboard
        </a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Title */}
        <div className="mb-6">
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Share Your Experience</p>
          <h2 className="text-2xl font-bold text-[#1c1c1c] font-[family-name:var(--font-playfair)]">Leave a Review</h2>
          <p className="text-sm text-gray-500 mt-1">Your feedback helps us serve our community better.</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : !user ? (
          /* Not logged in */
          <div className="bg-white border border-[#e8e0d0] rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">⭐</div>
            <p className="font-semibold text-[#1c1c1c] font-[family-name:var(--font-playfair)] text-lg mb-2">Please login to leave a review</p>
            <p className="text-sm text-gray-400 mb-6">We'd love to hear from you about your Sri Krishnaa Dairy experience.</p>
            <a href="/login" className="inline-block bg-[#1a5c38] text-white font-bold px-8 py-3 rounded-xl text-sm hover:bg-[#0d3320] transition">
              Login to Continue
            </a>
          </div>
        ) : done ? (
          /* Success */
          <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-2xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)] text-xl mb-2">Thank you!</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your review has been submitted and will appear on our website once approved by our team.
            </p>
            <a href="/dashboard" className="inline-block mt-6 bg-[#1a5c38] text-white font-bold px-8 py-3 rounded-xl text-sm hover:bg-[#0d3320] transition">
              Back to Dashboard
            </a>
          </div>
        ) : (
          /* Review Form */
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 shadow-sm">

              {/* Star Rating */}
              <p className="font-semibold text-[#1c1c1c] text-sm mb-3">Your Rating <span className="text-red-400">*</span></p>
              <div className="flex gap-2 items-center mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(star)}
                    style={{
                      fontSize: 36,
                      color: star <= (hovered || rating) ? '#d4a017' : '#e8e0d0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      lineHeight: 1,
                      transition: 'color 0.15s',
                    }}
                  >
                    ★
                  </button>
                ))}
                {(hovered || rating) > 0 && (
                  <span className="text-sm font-semibold text-[#1a5c38] ml-1">{LABELS[hovered || rating]}</span>
                )}
              </div>

              {/* Review Text */}
              <p className="font-semibold text-[#1c1c1c] text-sm mb-2">Your Experience <span className="text-gray-400 font-normal">(optional)</span></p>
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
              <p className="font-semibold text-[#1c1c1c] text-sm mb-2">Add Photo <span className="text-gray-400 font-normal">(optional)</span></p>
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
                    >
                      ×
                    </button>
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full text-white py-3 rounded-xl font-bold text-sm transition disabled:opacity-50 mt-5"
                style={{ background: 'linear-gradient(135deg, #1a5c38, #2d7a50)' }}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>

            {/* Google Review Link */}
            <div className="bg-white border border-[#e8e0d0] rounded-2xl p-5 shadow-sm text-center">
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
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
