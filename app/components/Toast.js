'use client'
import { useEffect, useState } from 'react'

const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
}

const STYLES = {
  success: { bg: '#f0faf4', border: '#c8e6d4', icon: '#1a5c38', text: '#1a5c38' },
  error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#dc2626' },
  info:    { bg: '#fdf6e3', border: '#f0dfa0', icon: '#d4a017', text: '#92400e' },
}

export function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const s = STYLES[toast.type] || STYLES.info

  useEffect(() => {
    // Trigger slide-in
    requestAnimationFrame(() => setVisible(true))

    const timer = setTimeout(() => dismiss(), toast.duration || 3000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  return (
    <div
      role="alert"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '12px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        transform: leaving ? 'translateX(120%)' : visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: leaving ? 0 : visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
        minWidth: '260px',
        maxWidth: '360px',
        pointerEvents: 'all',
      }}
    >
      <span style={{ color: s.icon, marginTop: '1px' }}>{ICONS[toast.type] || ICONS.info}</span>
      <p style={{ flex: 1, margin: 0, fontSize: '13px', fontWeight: '500', color: s.text, lineHeight: '1.4' }}>
        {toast.message}
      </p>
      <button
        onClick={dismiss}
        style={{ color: s.icon, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
