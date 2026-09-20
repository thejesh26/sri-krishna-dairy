'use client'
import { useState } from 'react'

export default function BulkEnquiryForm() {
  const [bulkForm, setBulkForm] = useState({ name: '', phone: '', institution: '', quantity: '', message: '' })
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkSubmitted, setBulkSubmitted] = useState(false)
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkPhoneError, setBulkPhoneError] = useState('')

  const handleBulkEnquiry = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{10}$/.test(bulkForm.phone)) {
      setBulkPhoneError('Please enter a valid 10-digit phone number.')
      return
    }
    setBulkPhoneError('')
    setBulkSubmitting(true)
    try {
      await fetch('/api/bulk-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkForm),
      })
    } catch {
      // best-effort — still show success
    } finally {
      setBulkSubmitting(false)
      setBulkModal(true)
      setBulkForm({ name: '', phone: '', institution: '', quantity: '', message: '' })
      setTimeout(() => setBulkModal(false), 10000)
    }
  }

  return (
    <>
      {bulkModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.5)'}}
          onClick={() => setBulkModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title"
            onClick={(e) => e.stopPropagation()}
            ref={(el) => el?.querySelector('button')?.focus()}
            onKeyDown={(e) => { if (e.key === 'Escape') setBulkModal(false) }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-[#e8e0d0]">
            <div className="text-5xl mb-4">🎉</div>
            <h3 id="bulk-modal-title" className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">
              Thank you for your enquiry!
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              We'll contact you within 24 hours to discuss your bulk milk requirements.
            </p>
            <p className="text-[#d4a017] font-semibold text-sm">— Sri Krishnaa Dairy Team</p>
            <button onClick={() => setBulkModal(false)}
              className="mt-5 text-xs text-gray-600 hover:text-[#1a5c38] transition underline">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 max-w-xl mx-auto">
        <h4 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] mb-2 text-center">Send a Bulk Enquiry</h4>
        <p className="text-gray-500 text-sm text-center mb-6">Fill in your details and we'll get back to you within 24 hours with a custom quote.</p>
        {bulkSubmitted ? (
          <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-bold text-[#1a5c38] text-lg">Enquiry Received!</p>
            <p className="text-gray-500 text-sm mt-2">We'll contact you within 24 hours. You can also reach us directly on WhatsApp.</p>
            <a href="https://wa.me/918105054473" target="_blank"
              className="inline-flex items-center gap-2 mt-4 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
              style={{background:'#25D366'}}>
              WhatsApp Us
            </a>
          </div>
        ) : (
          <form onSubmit={handleBulkEnquiry} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e0d0] flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="bulk-name" className="text-xs font-semibold text-gray-600 mb-1 block">Your Name *</label>
                <input id="bulk-name" name="name" required type="text" placeholder="Ravi Kumar" autoComplete="name"
                  value={bulkForm.name} onChange={e => setBulkForm(f => ({...f, name: e.target.value}))}
                  className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <div>
                <label htmlFor="bulk-phone" className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number *</label>
                <input id="bulk-phone" name="phone" required type="tel" placeholder="9876543210"
                  pattern="[0-9]{10}" maxLength={10} inputMode="numeric" autoComplete="tel-national"
                  aria-invalid={!!bulkPhoneError} aria-describedby={bulkPhoneError ? 'bulk-phone-error' : undefined}
                  value={bulkForm.phone}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ''); setBulkForm(f => ({...f, phone: v})); setBulkPhoneError('') }}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${bulkPhoneError ? 'border-red-400 focus:border-red-400' : 'border-[#e8e0d0] focus:border-[#1a5c38]'}`} />
                {bulkPhoneError && <p id="bulk-phone-error" className="text-red-500 text-xs mt-1">{bulkPhoneError}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="bulk-institution" className="text-xs font-semibold text-gray-600 mb-1 block">Institution / Business Name *</label>
              <input id="bulk-institution" name="institution" required type="text" placeholder="Hotel Sunshine, ABC School, etc." autoComplete="organization"
                value={bulkForm.institution} onChange={e => setBulkForm(f => ({...f, institution: e.target.value}))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
            </div>
            <div>
              <label htmlFor="bulk-quantity" className="text-xs font-semibold text-gray-600 mb-1 block">Approximate Daily Quantity (litres)</label>
              <input id="bulk-quantity" name="quantity" type="text" placeholder="e.g. 20 litres/day"
                value={bulkForm.quantity} onChange={e => setBulkForm(f => ({...f, quantity: e.target.value}))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
            </div>
            <div>
              <label htmlFor="bulk-message" className="text-xs font-semibold text-gray-600 mb-1 block">Message (optional)</label>
              <textarea id="bulk-message" name="message" rows={3} placeholder="Any special requirements, delivery timing preferences..."
                value={bulkForm.message} onChange={e => setBulkForm(f => ({...f, message: e.target.value}))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] resize-none" />
            </div>
            <button type="submit" disabled={bulkSubmitting}
              className="text-white py-3 rounded-lg font-bold transition disabled:opacity-60"
              style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
              {bulkSubmitting ? 'Sending...' : '📩 Send Enquiry'}
            </button>
            <p className="text-xs text-gray-600 text-center">We'll respond within 24 hours. Prefer instant help? <a href="https://wa.me/918105054473" target="_blank" className="text-[#25D366] font-semibold">Chat on WhatsApp</a></p>
          </form>
        )}
      </div>
    </>
  )
}
