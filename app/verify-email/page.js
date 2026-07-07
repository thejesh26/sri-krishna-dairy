'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'

function getEmailProvider(email) {
  if (!email) return { name: 'Email', url: null }
  const domain = email.split('@')[1]?.toLowerCase() || ''
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      name: 'Gmail',
      url: 'https://mail.google.com/mail/#search/from:noreply@srikrishnaadairy.in',
      icon: '📧',
    }
  }
  if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
    return {
      name: 'Outlook',
      url: 'https://outlook.live.com/mail/',
      icon: '📧',
    }
  }
  if (domain === 'yahoo.com') {
    return {
      name: 'Yahoo Mail',
      url: 'https://mail.yahoo.com/',
      icon: '📧',
    }
  }
  return { name: 'Email App', url: null, icon: '📧' }
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const provider = getEmailProvider(email)
  const [resendStatus, setResendStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

  const handleResend = async () => {
    if (!email) return
    setResendStatus('sending')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendStatus(error ? 'error' : 'sent')
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0]">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide">FARM FRESH - PURE - NATURAL</p>
          </div>
        </a>
        <a href="/login" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Login
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-[#e8e0d0] p-8 w-full max-w-md text-center">

          {/* Success icon */}
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{background:'linear-gradient(135deg, #f0faf4, #d4eddf)'}}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[#1a5c38]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Gold checkmark */}
          <div className="w-8 h-8 rounded-full bg-[#d4a017] flex items-center justify-center mx-auto -mt-6 mb-5 shadow border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-2">
            Account Created!
          </h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            We've sent a confirmation link to{' '}
            {email && <strong className="text-[#1c1c1c]">{email}</strong>}
            {!email && 'your email address'}.
            <br />Please check your inbox and click the link to activate your account.
          </p>

          {/* Open email button */}
          {provider.url ? (
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition shadow mb-4"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {provider.icon} Open {provider.name}
            </a>
          ) : (
            <div className="bg-[#f5f0e8] rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-[#1c1c1c] font-semibold">Open your email app</p>
              <p className="text-xs text-gray-500 mt-1">Look for an email from <strong>noreply@srikrishnaadairy.in</strong></p>
            </div>
          )}

          {/* Instructions card */}
          <div className="bg-[#f5f0e8] rounded-xl p-4 mb-5 text-left">
            <p className="text-xs font-semibold text-[#d4a017] uppercase tracking-widest mb-3">What to do next</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38] font-bold mt-0.5">1.</span>
                <span>Open the confirmation email from Sri Krishnaa Dairy</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38] font-bold mt-0.5">2.</span>
                <span>Click the <strong>"Confirm your email"</strong> button in the email</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38] font-bold mt-0.5">3.</span>
                <span>You'll be redirected to login — then you can place your first order!</span>
              </div>
            </div>
          </div>

          {/* WhatsApp activation */}
          <div className="bg-[#f0faf4] border border-[#1a5c38] rounded-xl p-4 mb-5 text-left">
            <p className="text-sm font-bold text-[#1a5c38] mb-1">📱 Activate WhatsApp Notifications</p>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Save our number and send <strong>'Hi'</strong> to receive delivery updates on WhatsApp.
            </p>
            <a
              href="https://wa.me/918105054473?text=Hi"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-sm py-2.5 px-4 rounded-lg hover:bg-[#1da851] transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send 'Hi' to 8105054473
            </a>
          </div>

          {/* Resend */}
          <div className="mb-5">
            {resendStatus === 'sent' ? (
              <p className="text-sm text-[#1a5c38] font-semibold">Confirmation email resent! Check your inbox.</p>
            ) : resendStatus === 'error' ? (
              <p className="text-sm text-red-500">Could not resend. Please try again or contact support.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={!email || resendStatus === 'sending'}
                className="text-sm text-[#1a5c38] font-semibold underline hover:text-[#14472c] transition disabled:opacity-50">
                {resendStatus === 'sending' ? 'Sending...' : "Didn't receive the email? Resend confirmation"}
              </button>
            )}
          </div>

          <div className="border-t border-[#e8e0d0] pt-5">
            <p className="text-sm text-gray-500 mb-3">
              Questions? Call <strong className="text-[#1c1c1c]">8105054473</strong>
            </p>
            <a href="/login" className="text-sm text-[#1a5c38] font-semibold hover:underline">
              Already confirmed? Go to Login →
            </a>
          </div>

        </div>
      </div>

      <Footer variant="public" />

    </div>
  )
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <p className="text-[#1a5c38] font-semibold">Loading...</p>
    </div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
