'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

function ResetPasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [isWeakReset, setIsWeakReset] = useState(false)

  // Password strength checks — computed inline on every render
  const pwdChecks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/;'`~]/.test(password),
  }
  const isPasswordStrong = Object.values(pwdChecks).every(Boolean)

  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user landed here due to weak password enforcement
    if (searchParams.get('reason') === 'weak_password') {
      setIsWeakReset(true)
      setRecoveryReady(true) // user is already authenticated, no recovery token needed
      return
    }

    // Read the hash NOW before Supabase potentially clears it during token processing
    const hashHasRecovery =
      typeof window !== 'undefined' && window.location.hash.includes('type=recovery')

    // Supabase fires PASSWORD_RECOVERY when it detects the recovery token in the URL hash.
    // We must wait for this event before allowing the user to update their password.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true)
      }
    })

    // Race-condition fallback: if the hash indicated a recovery flow but Supabase already
    // processed the token before our listener registered, check for an active session.
    if (hashHasRecovery) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setRecoveryReady(true)
      })
    }

    // If no PASSWORD_RECOVERY event fires within 5 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setInvalidLink(true)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  // Clear the invalid-link timeout once recovery is confirmed
  useEffect(() => {
    if (recoveryReady) setInvalidLink(false)
  }, [recoveryReady])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage('Passwords do not match!')
      return
    }

    // Enforce strong password policy
    if (!isPasswordStrong) {
      setMessage('Please make sure your password meets all the requirements shown below.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      password,
      data: { requires_password_update: false },
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setDone(true)
      setTimeout(() => { router.push('/login') }, 3000)
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

          {done ? (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-3">
                Password Reset!
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>
          ) : invalidLink && !recoveryReady ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-3">
                Invalid or Expired Link
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <a href="/forgot-password"
                className="inline-block text-white py-3 px-6 rounded-lg font-bold hover:opacity-90 transition shadow"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                Request New Link
              </a>
            </div>
          ) : !recoveryReady ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🔑</div>
              <p className="text-[#1a5c38] font-semibold mt-4">Verifying reset link...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔑</div>
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">
                  {isWeakReset ? 'Update Your Password' : 'Reset Password'}
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  {isWeakReset
                    ? 'Your current password is too weak. Please set a stronger password to continue.'
                    : 'Enter your new password below'}
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
                    New Password
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] pr-12" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1a5c38] transition">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Real-time password strength indicator */}
                  {password.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {[
                        { key: 'length',  label: '8+ characters' },
                        { key: 'upper',   label: 'Uppercase letter' },
                        { key: 'lower',   label: 'Lowercase letter' },
                        { key: 'number',  label: 'Number' },
                        { key: 'special', label: 'Special character' },
                      ].map(({ key, label }) => (
                        <span key={key} className={`text-xs flex items-center gap-1 ${pwdChecks[key] ? 'text-[#1a5c38]' : 'text-gray-400'}`}>
                          {pwdChecks[key] ? '✓' : '○'} {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">
                    Confirm Password
                  </label>
                  <input type="password" placeholder="Repeat your password" required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
                  {confirm.length > 0 && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !isPasswordStrong}
                  className="text-white py-3 rounded-lg font-bold hover:opacity-90 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                  {loading ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="text-center py-4 text-xs text-gray-400 border-t border-[#e8e0d0]">
        2025 Sri Krishnaa Dairy Farms. All rights reserved.
      </div>

    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <p className="text-[#1a5c38] font-semibold">Loading...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}