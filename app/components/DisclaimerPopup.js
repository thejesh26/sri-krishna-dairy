'use client'
import { useState, useEffect } from 'react'

export default function DisclaimerPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted = localStorage.getItem('sk_disclaimer_accepted')
      if (!accepted) setShow(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('sk_disclaimer_accepted', 'true')
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
              A refundable deposit of ₹100/bottle (minimum ₹200) is collected for bottle retention delivery mode.
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

          <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4">
            <p className="text-xs text-[#8a6e0a] leading-relaxed">
              By clicking "Accept & Continue", you confirm that you have read, understood, and agree to our
              Terms of Service, Privacy Policy, Refund Policy, and Health Disclaimer.
              You also acknowledge that fresh farm milk is not commercially pasteurized.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white rounded-b-2xl px-6 pb-6 pt-4 border-t border-[#e8e0d0]">
          <button
            onClick={handleAccept}
            className="w-full text-white py-3 rounded-xl font-bold text-base hover:opacity-90 transition shadow-lg"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            Accept & Continue
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
