'use client'
import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'pwa_banner_dismissed_at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getOS() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function wasDismissedRecently() {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY)
    if (!ts) return false
    return Date.now() - parseInt(ts, 10) < DISMISS_TTL_MS
  } catch {
    return false
  }
}

// ── iOS instruction modal ─────────────────────────────────────────────────────
function IOSModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0d3320,#1a5c38)' }} className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base font-[family-name:var(--font-playfair)]">Add to Home Screen</p>
            <p className="text-xs mt-0.5" style={{ color: '#d4a017' }}>Safari · iPhone / iPad</p>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none">&times;</button>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {[
            {
              num: 1,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              ),
              text: 'Tap the Share button',
              sub: 'The box-with-arrow icon at the bottom of Safari',
            },
            {
              num: 2,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <rect x="5" y="2" width="14" height="20" rx="2"/>
                  <line x1="12" y1="6" x2="12" y2="10"/>
                  <line x1="10" y1="8" x2="14" y2="8"/>
                  <line x1="10" y1="13" x2="14" y2="13"/>
                  <line x1="10" y1="17" x2="14" y2="17"/>
                </svg>
              ),
              text: 'Tap "Add to Home Screen"',
              sub: 'Scroll down in the share sheet to find it',
            },
            {
              num: 3,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
              text: 'Tap "Add" — Done!',
              sub: 'The app icon appears on your home screen',
            },
          ].map(({ num, icon, text, sub }) => (
            <div key={num} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2" style={{ borderColor: '#1a5c38', background: '#f0faf4' }}>
                {icon}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1c1c1c' }}>
                  <span style={{ color: '#d4a017' }}>Step {num}:</span> {text}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Arrow pointing down toward browser bar */}
        <div className="px-5 pb-5">
          <div className="rounded-xl p-3 text-center text-xs" style={{ background: '#f0faf4', color: '#1a5c38', border: '1px solid #c8e6d4' }}>
            Look for the <strong>Share icon</strong> (⬜ with arrow) in the Safari toolbar below
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Android instruction modal ─────────────────────────────────────────────────
function AndroidModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center px-4 pb-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#0d3320,#1a5c38)' }} className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base font-[family-name:var(--font-playfair)]">Add to Home Screen</p>
            <p className="text-xs mt-0.5" style={{ color: '#d4a017' }}>Chrome · Android</p>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none">&times;</button>
        </div>

        {/* Steps */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {[
            {
              num: 1,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <circle cx="12" cy="5" r="1" fill="#1a5c38"/>
                  <circle cx="12" cy="12" r="1" fill="#1a5c38"/>
                  <circle cx="12" cy="19" r="1" fill="#1a5c38"/>
                </svg>
              ),
              text: 'Tap the 3-dot menu',
              sub: 'Found at the top-right corner of Chrome',
            },
            {
              num: 2,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              ),
              text: 'Tap "Add to Home Screen"',
              sub: 'Select it from the dropdown menu',
            },
            {
              num: 3,
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a5c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ),
              text: 'Tap "Add" — Done!',
              sub: 'The app icon appears on your home screen',
            },
          ].map(({ num, icon, text, sub }) => (
            <div key={num} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2" style={{ borderColor: '#1a5c38', background: '#f0faf4' }}>
                {icon}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1c1c1c' }}>
                  <span style={{ color: '#d4a017' }}>Step {num}:</span> {text}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-xl p-3 text-center text-xs" style={{ background: '#f0faf4', color: '#1a5c38', border: '1px solid #c8e6d4' }}>
            Look for the <strong>three-dot menu ⋮</strong> in the top-right of Chrome
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main banner ───────────────────────────────────────────────────────────────
export default function PWAInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [modal, setModal] = useState(null) // 'ios' | 'android' | null
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const os = getOS()

    // Never show on desktop or if already installed
    if (os === 'other' || isStandalone()) return

    // Never show if dismissed recently
    if (wasDismissedRecently()) return

    // Capture Android native install prompt
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Show banner after 30 seconds
    const timer = setTimeout(() => setVisible(true), 30_000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {}
  }

  const handleInstall = async () => {
    const os = getOS()

    // Android with native prompt available
    if (os === 'android' && deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      }
      setDeferredPrompt(null)
      return
    }

    // Fall back to manual instruction modal
    setModal(os)
  }

  if (!visible) return null

  return (
    <>
      {/* Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9998] flex items-center gap-3 px-4 py-3 shadow-lg"
        style={{
          background: '#ffffff',
          borderTop: '3px solid #1a5c38',
        }}
      >
        {/* Logo */}
        <img
          src="/Logo.jpg"
          alt="Sri Krishnaa Dairy"
          className="h-11 w-11 rounded-full object-cover border-2 flex-shrink-0"
          style={{ borderColor: '#d4a017' }}
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight font-[family-name:var(--font-playfair)]" style={{ color: '#1a5c38' }}>
            Add to Home Screen
          </p>
          <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>
            App-like experience — no download needed!
          </p>
        </div>

        {/* Install button */}
        <button
          onClick={handleInstall}
          className="flex-shrink-0 font-bold text-sm px-4 py-2 rounded-lg text-white transition"
          style={{ background: 'linear-gradient(135deg,#1a5c38,#2d7a50)' }}
        >
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none transition"
          style={{ color: '#9ca3af' }}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>

      {/* Instruction modals */}
      {modal === 'ios' && <IOSModal onClose={() => setModal(null)} />}
      {modal === 'android' && <AndroidModal onClose={() => setModal(null)} />}
    </>
  )
}
