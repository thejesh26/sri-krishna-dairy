'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DisclaimerPopup() {
  const [show, setShow] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('sk_disclaimer_accepted')
      if (!accepted) setShow(true)
    }
  }, [])

  const handleAccept = async () => {
    localStorage.setItem('sk_disclaimer_accepted', 'true')
    // Save to DB so we have a server-side record
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ disclaimer_accepted: true })
          .eq('id', session.user.id)
      }
    } catch {
      // Non-blocking — localStorage acceptance is the primary gate
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)'}}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl px-6 pt-6 pb-4 border-b border-[#e8e0d0]">
          <div className="flex items-center gap-3 mb-1">
            <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 rounded-full object-cover border-2 border-[#d4a017]" />
            <div>
              <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1a5c38] text-lg leading-tight">Sri Krishnaa Dairy Farms</p>
              <p className="text-xs text-[#d4a017] font-medium">Farm Fresh · Pure · Natural</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Please read and accept before continuing</p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col gap-4">

          <div>
            <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base mb-2">Health Disclaimer</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Our milk is <strong>farm-fresh and minimally processed</strong>. It is not commercially pasteurized.
              Persons with compromised immune systems, pregnant women, elderly individuals, or young children
              should consult a healthcare provider before consuming raw or minimally processed milk.
              Sri Krishnaa Dairy Farms is not liable for any health outcomes arising from consumption of our products.
            </p>
          </div>

          <div>
            <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base mb-2">Subscription & Payment</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Subscriptions are prepaid. Daily amounts are auto-deducted from your wallet balance.
              Ensure sufficient wallet balance to avoid missed deliveries.
              We reserve the right to pause delivery if wallet balance is insufficient.
            </p>
          </div>

          <div>
            <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base mb-2">Bottle Deposit</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              A refundable deposit of ₹200/bottle is collected for bottle retention delivery mode.
              Deposit is refunded when bottles are returned in good condition.
            </p>
          </div>

          <div>
            <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base mb-2">Refund Policy</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Delivered milk cannot be refunded. If a delivery is missed due to our fault, the amount will be
              credited back to your wallet. Wallet balances are refundable upon account closure request.
            </p>
          </div>

          <div>
            <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base mb-2">Product Quality</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              All our milk is sourced from healthy, ethically-raised cows at our farm in Kammasandra, Bangalore Rural.
              We follow strict hygiene protocols at every step. Our farm operates under
              <strong> FSSAI Lic. No: 21225008004544</strong>.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-2xl px-6 pb-6 pt-4 border-t border-[#e8e0d0]">
          {/* Mandatory checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-4 p-3 rounded-xl border-2 border-[#e8e0d0] hover:border-[#1a5c38] transition">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#1a5c38] cursor-pointer"
            />
            <span className="text-xs text-[#4a4a4a] leading-relaxed">
              I have read and understood the health disclaimer. I acknowledge that raw milk should be boiled before
              consumption and Sri Krishnaa Dairy Farms is not responsible for any health issues arising from
              consumption of unboiled milk.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!checked}
            className="w-full text-white py-3 rounded-xl font-bold text-base transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            style={{background: checked ? 'linear-gradient(135deg, #1a5c38, #2d7a50)' : '#9ca3af'}}>
            {checked ? 'Accept & Continue' : 'Check the box above to continue'}
          </button>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
            <a href="/terms-of-service" target="_blank" className="hover:text-[#1a5c38] transition">Terms</a>
            <a href="/privacy-policy" target="_blank" className="hover:text-[#1a5c38] transition">Privacy</a>
            <a href="/refund-policy" target="_blank" className="hover:text-[#1a5c38] transition">Refund Policy</a>
            <a href="/health-disclaimer" target="_blank" className="hover:text-[#1a5c38] transition">Health Disclaimer</a>
          </div>
        </div>
      </div>
    </div>
  )
}
