'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'

export default function ReviewForm({ userId, onSubmit }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { showSuccess, showError } = useToast()

  const handleSubmit = async () => {
    if (rating === 0) { showError('Please select a star rating.'); return }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ rating, review }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not submit review.')
      showSuccess('Thank you for your review!')
      setDone(true)
      onSubmit?.()
    } catch (err) {
      showError(err.message)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🙏</div>
        <p className="font-semibold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Thank you for your feedback!</p>
        <p className="text-sm text-gray-500 mt-1">Your review helps other customers and improves our service.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-6 shadow-sm">
      <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base mb-1">How was your experience?</p>
      <p className="text-xs text-gray-400 mb-4">Your feedback helps us serve you better.</p>

      {/* Star Rating */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            style={{ fontSize: 28, color: star <= (hovered || rating) ? '#d4a017' : '#e8e0d0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, transition: 'color 0.15s' }}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className="text-sm text-gray-400 self-center ml-1">
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </span>
        )}
      </div>

      {/* Optional text */}
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Share your experience (optional)..."
        maxLength={500}
        rows={3}
        className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm text-[#1c1c1c] focus:outline-none focus:border-[#1a5c38] resize-none mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={loading || rating === 0}
        className="w-full text-white py-3 rounded-xl font-bold text-sm transition disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #1a5c38, #2d7a50)' }}
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  )
}
