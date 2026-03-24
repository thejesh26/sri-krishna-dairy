'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0]">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide">FARM FRESH - PURE - NATURAL</p>
          </div>
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg border border-[#e8e0d0] p-8 w-full max-w-md">

          {!sent ? (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔐</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">
                  Forgot Password?
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5 text-center">
                  {message}
                </div>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">
                    Email Address
                  </label>
                  <input type="email" placeholder="your@email.com" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>

                <button type="submit" disabled={loading}
                  className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition shadow"
                  style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-5">
                Remember your password?{' '}
                <a href="/login" className="text-[#1a5c38] font-semibold hover:underline">Login</a>
              </p>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">📧</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-3">
                Check Your Email!
              </h2>
              <p className="text-gray-500 text-sm mb-2">
                We've sent a password reset link to:
              </p>
              <p className="font-bold text-[#1c1c1c] mb-6">{email}</p>
              <p className="text-gray-400 text-xs mb-6">
                Click the link in the email to reset your password. Check your spam folder if you don't see it.
              </p>
              <a href="/login"
                className="inline-block text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition shadow"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                Back to Login
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="text-center py-4 text-xs text-gray-400 border-t border-[#e8e0d0]">
        2025 Sri Krishnaa Dairy Farms. All rights reserved.
      </div>

    </div>
  )
}