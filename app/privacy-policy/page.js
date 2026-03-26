import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Sri Krishnaa Dairy Farms',
  description: 'Privacy Policy for Sri Krishnaa Dairy Farms milk delivery service in Kattigenahalli, Bangalore.',
}

export default function PrivacyPolicy() {
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
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-green-200 text-sm sm:text-base max-w-xl mx-auto">
          How we collect, use, and protect your personal information.
        </p>
        <p className="text-green-300 text-xs mt-4">Last updated: March 2025</p>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">1. Who We Are</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              Sri Krishnaa Dairy Farms (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a fresh milk delivery service based in Kattigenahalli,
              Bangalore, Karnataka. We operate an online platform at this website to enable customers to subscribe to
              daily milk delivery, place one-time orders, and manage prepaid wallet balances. This Privacy Policy
              describes what data we collect from you and how we use it when you use our service.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">2. Information We Collect</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              When you create an account or place an order, we collect the following:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                ['Full Name', 'To address you and label your delivery.'],
                ['Mobile Number', 'To contact you about deliveries, send OTPs, and for account login.'],
                ['Email Address', 'Used as your account identifier for login and password recovery.'],
                ['Delivery Address', 'Apartment name, flat number, area, and landmark — used to route your daily delivery.'],
                ['Payment Records', 'Wallet top-up amounts, deduction history, and COD order records. We do not store any card or UPI credentials.'],
                ['Order & Subscription History', 'Products ordered, quantities, delivery dates, and delivery preferences.'],
              ].map(([label, desc]) => (
                <li key={label} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span><span className="font-semibold text-[#1c1c1c]">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">3. How We Use Your Information</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Fulfilling your daily milk delivery subscription and one-time orders.',
                'Managing your prepaid wallet balance and transaction history.',
                'Contacting you for delivery updates, schedule changes, or service announcements.',
                'Verifying your identity when you log in or reset your password.',
                'Improving our delivery routes and service quality based on order patterns.',
                'Complying with applicable laws and regulatory requirements (including FSSAI).',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#1a5c38] font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">4. Data Storage & Security</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              Your data is stored securely using <span className="font-semibold">Supabase</span>, a cloud database platform
              with enterprise-grade encryption at rest and in transit (TLS/SSL). Access to the database is restricted
              to our administrative staff and delivery team only for the purposes described above.
            </p>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              We do not store payment card numbers, UPI IDs, or any financial credentials on our servers. All
              wallet transactions are logged within our system and visible to you at any time through the Wallet
              section of your account.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">5. Sharing of Information</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              We do <span className="font-semibold text-[#1c1c1c]">not sell, rent, or trade</span> your personal
              information to any third party. Your information may be shared only in the following limited cases:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'With our delivery agents — only your name, building/flat number, and delivery slot are shared to complete your delivery.',
                'With law enforcement or regulatory authorities if required by law.',
                'With Supabase as our infrastructure provider, under strict data processing terms.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">6. Cookies & Analytics</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              We use <span className="font-semibold">Google Analytics</span> to understand how visitors interact with
              our website. This involves anonymous usage data such as pages visited and session duration. No personally
              identifiable information is shared with Google Analytics. You may opt out using your browser settings or
              a browser extension.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">7. Your Rights</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              You may contact us at any time to:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Access, correct, or delete your personal information.',
                'Cancel your subscription and request account deletion.',
                'Request a copy of your order and wallet transaction history.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">8. Contact Us</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              For any questions or concerns regarding this Privacy Policy, please reach out to us:
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-[#4a4a4a]"><span className="font-semibold text-[#1c1c1c]">Business:</span> Sri Krishnaa Dairy Farms</p>
              <p className="text-[#4a4a4a]"><span className="font-semibold text-[#1c1c1c]">Location:</span> Kattigenahalli, Bangalore, Karnataka</p>
              <p><span className="font-semibold text-[#1c1c1c]">Phone / WhatsApp:</span>{' '}
                <a href="tel:8553666002" className="text-[#1a5c38] hover:underline font-semibold">8553666002</a>
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d1f13] text-white px-6 pt-10 pb-6 mt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/privacy-policy" className="hover:text-[#d4a017] transition text-[#d4a017]">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-[#d4a017] transition">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-[#d4a017] transition">Refund Policy</Link>
              <Link href="/health-disclaimer" className="hover:text-[#d4a017] transition">Health Disclaimer</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
