'use client'
import { useEffect, useRef } from 'react'
import Button from './Button'

/**
 * Modal — accessible focus-trapped dialog.
 *
 * Props:
 *   open            – boolean
 *   onClose         – fn  (called on Esc, backdrop click, X button)
 *   title           – string
 *   description     – string
 *   size            – 'sm' | 'md' | 'lg'
 *   footer          – ReactNode  (custom footer, overrides confirm/cancel)
 *   confirmLabel    – string   (default 'Confirm')
 *   confirmVariant  – Button variant (default 'primary')
 *   onConfirm       – fn
 *   confirmLoading  – boolean
 *   cancelLabel     – string   (default 'Cancel')
 *   hideCancel      – boolean
 *   closeOnBackdrop – boolean  (default true)
 *   children        – ReactNode
 *
 * Usage:
 *   <Modal open={open} onClose={() => setOpen(false)}
 *     title="Cancel subscription?"
 *     description="This will stop your daily delivery."
 *     confirmLabel="Yes, cancel"
 *     confirmVariant="danger"
 *     onConfirm={handleCancel}
 *     confirmLoading={cancelling}
 *   />
 *
 *   <Modal open={open} onClose={close} title="Payment details" size="lg">
 *     <p>Custom body content</p>
 *   </Modal>
 */

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  confirmLoading = false,
  cancelLabel = 'Cancel',
  hideCancel = false,
  closeOnBackdrop = true,
  children,
}) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Focus management
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      // Focus the dialog itself after paint
      requestAnimationFrame(() => {
        dialogRef.current?.focus()
      })
    } else {
      previousFocusRef.current?.focus()
    }
  }, [open])

  // Esc key handler
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Trap focus inside modal
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!open) return null

  const showFooter = footer !== undefined ? footer : (onConfirm || !hideCancel)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-desc' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: 'fadeIn 0.15s ease' }}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative bg-white rounded-2xl shadow-xl w-full ${SIZE_CLASSES[size]} flex flex-col focus:outline-none`}
        style={{ animation: 'slideUp 0.2s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            {title && (
              <h2
                id="modal-title"
                className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-lg leading-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-desc" className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-700 transition p-1 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a5c38]"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
            {children}
          </div>
        )}

        {/* Footer */}
        {showFooter && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f5f0e8]">
            {footer || (
              <>
                {!hideCancel && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    {cancelLabel}
                  </Button>
                )}
                {onConfirm && (
                  <Button
                    variant={confirmVariant}
                    size="sm"
                    onClick={onConfirm}
                    loading={confirmLoading}
                  >
                    {confirmLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  )
}
