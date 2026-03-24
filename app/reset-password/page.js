'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage('Passwords do not match!')
      return
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters!')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setDone(true)
      setTimeout(() => { window.location.href = '/login' }, 3000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      <header className="bg-white px-6 py-4 flex items-center shadow-sm border-b border-[#e8e0d0]">
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

          {!done ? (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔑</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">
                  Reset Password
                </h2>
                <p className="text-sm text-gray-400 mt-2">Enter your new password below</p>
              </div>

              {message && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-5 text-center">
                  {message}
                </div>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">
                    New Password
                  </label>
                  <input type="password" placeholder="Min. 6 characters" required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">
                    Confirm Password
                  </label>
                  <input type="password" placeholder="Repeat your password" required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                </div>

                <button type="submit" disabled={loading}
                  className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition shadow"
                  style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-3">
                Password Reset!
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been reset successfully. Redirecting to login...
              </p>
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