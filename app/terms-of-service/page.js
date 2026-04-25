import Link from 'next/link'
import Footer from '../components/Footer'

export const metadata = {
  title: 'Terms of Service | Sri Krishnaa Dairy Farms',
  description: 'Terms and conditions for using Sri Krishnaa Dairy Farms milk delivery service.',
}

export default function TermsOfService() {
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
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-5xl font-bold mb-4">Terms of Service</h1>
        <p className="text-green-200 text-sm sm:text-base max-w-xl mx-auto">
          Please read these terms carefully before using our service.
        </p>
        <p className="text-green-300 text-xs mt-4">Last updated: March 2025</p>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              By creating an account, placing an order, or subscribing to any service offered by Sri Krishnaa Dairy
              Farms (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not
              agree to these terms, please do not use our service. These terms apply to all customers, visitors,
              and users of our delivery platform.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">2. Account Registration</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'You must provide accurate and complete information during registration, including your real name, a valid mobile number, and a correct delivery address.',
                'You are responsible for maintaining the confidentiality of your account credentials.',
                'You must be at least 18 years of age to create an account.',
                'One customer should maintain one account. Multiple accounts for the same address may be merged or terminated.',
                'We reserve the right to suspend or terminate accounts that provide false information or violate these terms.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">3. Subscription Service</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Subscriptions are for daily milk delivery. You may choose a one-day, fixed-term, or ongoing subscription.',
                'Deliveries are scheduled for your selected time slot (morning or evening). Timings depend on availability in your area.',
                'You may pause delivery for specific dates through the app at least 12 hours before the scheduled delivery.',
                'For fixed-term subscriptions, delivery will automatically stop on the end date you selected.',
                'Ongoing subscriptions continue until you cancel. Cancellation takes effect from the next billing cycle.',
                'We reserve the right to suspend delivery if your wallet balance is insufficient and no alternative payment arrangement is made.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">4. Payments</h2>
            <div className="flex flex-col gap-5 text-sm text-[#4a4a4a]">
              <div>
                <p className="font-semibold text-[#1c1c1c] mb-2">4.1 Prepaid Wallet</p>
                <p className="leading-relaxed">
                  You may add funds to your prepaid wallet in advance. Daily subscription charges are automatically
                  deducted from your wallet balance each morning. We will notify you when your balance is low. It
                  is your responsibility to maintain sufficient balance to avoid delivery interruptions.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1c1c1c] mb-2">4.2 Cash on Delivery (COD)</p>
                <p className="leading-relaxed">
                  For one-time orders, COD is available. Payment must be made to the delivery agent at the time of
                  delivery. Refusal to pay on delivery may result in COD being disabled for your account.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#1c1c1c] mb-2">4.3 Prices</p>
                <p className="leading-relaxed">
                  Prices are as listed on the platform at the time of ordering. We reserve the right to change
                  prices with reasonable notice. Any price changes will be communicated via WhatsApp or in-app
                  notification before they take effect.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">5. Bottle Deposit System</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'If you opt for the "keep bottle" delivery mode, a refundable deposit of ₹200 per bottle is charged at the start of your subscription.',
                'Bottles remain the property of Sri Krishnaa Dairy Farms and must be returned in clean, undamaged condition upon cancellation.',
                'The bottle deposit is refunded in full when bottles are returned in acceptable condition.',
                'Broken, lost, or heavily damaged bottles will not be eligible for deposit refund.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">6. Delivery Terms</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'We currently deliver within Kattigenahalli and select surrounding areas in Bangalore. Serviceability is subject to change.',
                'Deliveries are attempted as per your selected time slot. We are not responsible for delays caused by traffic, weather, or other unforeseen circumstances.',
                'If no one is available to receive the delivery, milk will be left at your door as per standing instructions. We are not responsible for milk left unattended beyond a reasonable time.',
                'Deliveries are subject to availability. In case of stock shortage, we will inform you as early as possible.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">7. Product Quality & FSSAI Compliance</h2>
            <div className="inline-flex items-center gap-3 bg-[#f0faf4] border border-[#c8e6d4] rounded-xl px-5 py-3 mb-4">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-semibold text-[#1a5c38] text-sm">FSSAI Licensed</p>
                <p className="text-xs text-gray-500">Lic. No: 21225008004544</p>
              </div>
            </div>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              Sri Krishnaa Dairy Farms operates in compliance with FSSAI (Food Safety and Standards Authority of
              India) regulations. Our milk is sourced directly from our cows maintained under hygienic conditions
              at our farm in Kammasandra, Bangalore Rural. Milk quality is checked regularly. However, as a fresh,
              natural product with no preservatives, it must be consumed or refrigerated promptly after delivery.
              We are not responsible for spoilage due to customer handling after delivery.
            </p>
            <p className="text-[#4a4a4a] text-sm font-semibold mb-2">Our process from farm to your door:</p>
            <ol className="flex flex-col gap-2 text-sm text-[#4a4a4a]">
              {[
                'Milking — Cows milked at 4–6 AM under hygienic conditions with sanitized equipment.',
                'Quality Check — Each batch inspected and tested before bottling.',
                'Bottle Cleaning — Returned bottles washed with food-grade agents and sterilized.',
                'Filling & Sealing — Measured quantities poured and sealed hygienically.',
                'Packing — Labelled and packed in insulated bags to maintain freshness.',
                'Route Dispatch — Delivery agents dispatched by 5 AM.',
                'Door Delivery — Delivered to your doorstep within your chosen time slot.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#1a5c38] font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">8. Limitation of Liability</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              To the fullest extent permitted by law:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Our total liability for any claim arising out of or related to the service shall not exceed the amount paid by you in the last 30 days.',
                'We are not liable for indirect, incidental, or consequential damages arising from use or inability to use our service.',
                'We are not responsible for health effects arising from consumption of our products — please refer to our Health Disclaimer.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">9. Governing Law</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              These Terms of Service are governed by the laws of India. Any disputes shall be subject to the
              exclusive jurisdiction of the courts in Bangalore, Karnataka.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">10. Contact</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              For any questions about these Terms of Service, contact us:
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-[#4a4a4a]"><span className="font-semibold text-[#1c1c1c]">Business:</span> Sri Krishnaa Dairy Farms</p>
              <p className="text-[#4a4a4a]"><span className="font-semibold text-[#1c1c1c]">Location:</span> Kattigenahalli, Bangalore, Karnataka</p>
              <p><span className="font-semibold text-[#1c1c1c]">Phone / WhatsApp:</span>{' '}
                <a href="tel:9980166221" className="text-[#1a5c38] hover:underline font-semibold">9980166221</a>
              </p>
            </div>
          </div>

        </div>
      </section>

      <Footer variant="public" />

    </div>
  )
}
