'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Footer from '../components/Footer'

const SERVICE_AREAS = [
  'Kattigenahalli',
  'Hunasamaranahalli',
  'Chidananda Reddy Layout',
  'Niranthara Layout',
  'Muneshwar Nagar',
  'Sathanur',
  'Venkatala',
  'Bagalur Cross',
  'Palahalli',
  'Kogilu',
  'Srinivasapura',
]

export default function Waitlist() {
  const [form, setForm] = useState({ name: '', phone: '', area: '', email: '' })
  const [phoneError, setPhoneError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState(null)

  useEffect(() => {
    fetch('/api/waitlist')
      .then(r => r.json())
      .then(d => setWaitlistCount(d.count))
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'phone') setPhoneError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{10}$/.test(form.phone)) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
      } else {
        setPhoneError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setPhoneError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh • Pure • Natural</p>
          </div>
        </a>
        <Link href="/" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          ← Home
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-6 py-12">

        {submitted ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-4">
              You're on our priority list!
            </h2>
            <p className="text-gray-600 text-base leading-relaxed mb-2">
              We'll WhatsApp you as soon as slots open in your area.
            </p>
            <p className="text-[#d4a017] font-semibold text-sm mt-4">— Sri Krishnaa Dairy Team</p>
            <a href="/"
              className="inline-block mt-8 border border-[#1a5c38] text-[#1a5c38] font-semibold px-6 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
              ← Back to Home
            </a>
          </div>
        ) : (
          <>
            {/* Page heading */}
            <div className="text-center mb-8">
              <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-2">Priority Registration</p>
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c] mb-3">
                Join Our Priority List
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                We're expanding! Be first to know when slots open in your area.
              </p>
              {waitlistCount !== null && (
                <div className="inline-flex items-center gap-2 mt-4 bg-[#f0faf4] border border-[#c8e6d4] rounded-full px-4 py-2">
                  <span className="text-lg">👨‍👩‍👧‍👦</span>
                  <span className="text-[#1a5c38] font-semibold text-sm">{waitlistCount} {waitlistCount === 1 ? 'family' : 'families'} already waiting</span>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Full Name */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <label className="block text-sm font-bold text-[#1c1c1c] mb-2">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                />
              </div>

              {/* Phone */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <label className="block text-sm font-bold text-[#1c1c1c] mb-2">Phone <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none bg-[#fdfbf7] ${phoneError ? 'border-red-400 focus:border-red-500' : 'border-[#e8e0d0] focus:border-[#1a5c38]'}`}
                />
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
              </div>

              {/* Area */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <label className="block text-sm font-bold text-[#1c1c1c] mb-2">Your Area <span className="text-red-500">*</span></label>
                <select
                  name="area"
                  value={form.area}
                  onChange={handleChange}
                  required
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                  <option value="">Select your area</option>
                  {SERVICE_AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* Email (optional) */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
                <label className="block text-sm font-bold text-[#1c1c1c] mb-2">Email <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="text-white py-4 rounded-xl font-bold text-lg transition shadow-lg disabled:opacity-50"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                {submitting ? 'Joining...' : 'Join Priority List 🎉'}
              </button>

              <p className="text-center text-xs text-gray-400">
                We'll WhatsApp you when slots open. No spam, ever.
              </p>
            </form>
          </>
        )}
      </div>

      <Footer variant="public" />

    </div>
  )
}
