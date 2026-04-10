import Link from 'next/link'

export const metadata = {
  title: 'Refund Policy | Sri Krishnaa Dairy Farms',
  description: 'Refund and cancellation policy for Sri Krishnaa Dairy Farms milk delivery service.',
}

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] font-[family-name:var(--font-inter)]">

      {/* Header */}
      <header className="bg-[#fdfbf7] px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-[#e8e0d0]">
        <Link href="/" className="flex items-center gap-2">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover shadow border-2 border-[#d4a017]" />
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)] leading-tight">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide hidden sm:block">FARM FRESH • PURE • NATURAL</p>
          </div>
        </Link>
        <Link href="/" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#1a5c38] hover:text-white transition">
          ← Back to Home
        </Link>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-white text-center"
        style={{background: 'linear-gradient(135deg, #0d3320 0%, #1a5c38 60%, #2d7a50 100%)'}}>
        <p className="text-[#d4a017] text-xs font-semibold uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-5xl font-bold mb-4">Refund Policy</h1>
        <p className="text-green-200 text-sm sm:text-base max-w-xl mx-auto">
          Our policy on refunds, cancellations, and wallet credits.
        </p>
        <p className="text-green-300 text-xs mt-4">Last updated: March 2025</p>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* Summary Banner */}
          <div className="rounded-2xl p-7 sm:p-10 text-white"
            style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold mb-4">Quick Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {[
                { icon: '🥛', label: 'Delivered Milk', value: 'No refund (perishable)' },
                { icon: '💰', label: 'Wallet Balance', value: 'Unused balance refundable on request' },
                { icon: '🍶', label: 'Bottle Deposit', value: 'Fully refundable on return' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="font-semibold text-white">{label}</p>
                  <p className="text-green-200 text-xs mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">1. Delivered Milk Orders</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              Fresh milk is a highly perishable food product. Once delivered, <span className="font-semibold text-[#1c1c1c]">we are unable to accept
              returns or issue refunds</span> for milk that has already been delivered. This applies to both one-time
              orders and daily subscription deliveries.
            </p>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              <span className="font-semibold text-[#1c1c1c]">Exception:</span> If the milk delivered is demonstrably
              spoiled, sour, or contaminated at the time of delivery (before opening), please contact us within
              2 hours via WhatsApp with a photo. We will investigate and, if confirmed, credit your wallet for
              the affected delivery.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">2. Missed or Failed Deliveries</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'If we are unable to deliver on a scheduled day due to our own operational failure (e.g., vehicle breakdown, stock shortage), the wallet deduction for that day will be reversed within 24 hours.',
                'If delivery is missed because the address was inaccessible or no one responded to the delivery agent, no refund or reversal will be issued.',
                'If you did not pause your subscription in advance and were unavailable, the charge will not be reversed.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">3. Prepaid Wallet Balance</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Wallet credits added by the admin on your behalf are non-transferable to other accounts.',
                'If you wish to cancel your subscription and close your account, unused wallet balance may be refunded to your bank account or UPI ID upon request, subject to a processing period of up to 7 business days.',
                'Wallet refund requests must be submitted by contacting us via WhatsApp or phone. We do not accept refund requests through any other channel.',
                'Minimum wallet balance of ₹50 must remain in the account for the refund to be processed; amounts below this threshold are non-refundable.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">4. Bottle Deposit Refund</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'The bottle deposit (₹100 per bottle) is fully refundable when bottles are returned in clean, undamaged condition.',
                'Please arrange bottle return by contacting us via WhatsApp to schedule a pickup or drop-off.',
                'Bottles must be rinsed clean before return. Bottles with broken seals, cracks, chips, or heavy stains will not qualify for deposit refund.',
                'Refund will be processed within 3 business days of bottle return and verification.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">5. Subscription Cancellation</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'You can cancel your subscription at any time through the app or by contacting us.',
                'Cancellation takes effect from the next delivery date. Any milk already dispatched for the day cannot be recalled.',
                'There is no cancellation fee.',
                'Pausing individual delivery days (instead of full cancellation) is available free of charge through the app, up to 12 hours before the scheduled slot.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">6. How to Request a Refund</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              To request any eligible refund, contact us through the following:
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <a href="https://wa.me/919980166221" target="_blank"
                className="flex items-center gap-3 bg-[#f0faf4] border border-[#c8e6d4] rounded-xl px-5 py-3 hover:bg-[#e0f5ea] transition">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c]">WhatsApp (Preferred)</p>
                  <p className="text-[#4a4a4a] text-xs">+91 9980166221 — fastest response</p>
                </div>
              </a>
              <a href="tel:9980166221"
                className="flex items-center gap-3 bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl px-5 py-3 hover:bg-[#f5f0e8] transition">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c]">Call Us</p>
                  <p className="text-[#4a4a4a] text-xs">9980166221</p>
                </div>
              </a>
            </div>
            <p className="text-[#4a4a4a] text-xs mt-4 leading-relaxed">
              Please include your registered phone number and a brief description of your issue.
              Refund processing time may vary between 1–7 business days depending on the type of refund.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d1f13] text-white px-6 pt-10 pb-6 mt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/privacy-policy" className="hover:text-[#d4a017] transition">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-[#d4a017] transition">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-[#d4a017] transition text-[#d4a017]">Refund Policy</Link>
              <Link href="/health-disclaimer" className="hover:text-[#d4a017] transition">Health Disclaimer</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
