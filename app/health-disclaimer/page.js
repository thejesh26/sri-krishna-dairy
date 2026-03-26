import Link from 'next/link'

export const metadata = {
  title: 'Health Disclaimer | Sri Krishnaa Dairy Farms',
  description: 'Health disclaimer for fresh raw cow milk from Sri Krishnaa Dairy Farms, Kattigenahalli, Bangalore.',
}

export default function HealthDisclaimer() {
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
        <p className="text-[#d4a017] text-xs font-semibold uppercase tracking-widest mb-3">Important Notice</p>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl sm:text-5xl font-bold mb-4">Health Disclaimer</h1>
        <p className="text-green-200 text-sm sm:text-base max-w-xl mx-auto">
          Please read this information carefully before consuming our fresh milk products.
        </p>
        <p className="text-green-300 text-xs mt-4">Last updated: March 2025</p>
      </section>

      {/* Content */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">

          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
            <span className="text-3xl flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 mb-1">Important Notice About Fresh Milk</p>
              <p className="text-amber-700 text-sm leading-relaxed">
                Our milk is fresh and minimally processed. It is not ultra-heat treated (UHT). Individuals with
                certain health conditions, pregnant women, young children, elderly persons, and immunocompromised
                individuals should consult their doctor before consuming fresh unprocessed milk.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">1. Nature of Our Product</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              Sri Krishnaa Dairy Farms delivers <span className="font-semibold text-[#1c1c1c]">fresh cow milk</span> sourced
              directly from our cows maintained in Kattigenahalli, Bangalore. Our milk is:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                ['Farm fresh', 'Collected, filtered, and delivered the same day — typically within hours of milking.'],
                ['Minimally processed', 'Filtered for cleanliness but not commercially pasteurized or homogenized.'],
                ['No preservatives', 'Contains zero artificial preservatives, additives, or stabilizers.'],
                ['Short shelf life', 'Must be refrigerated immediately upon receipt and consumed within 24–36 hours.'],
              ].map(([label, desc]) => (
                <li key={label} className="flex gap-3">
                  <span className="text-[#1a5c38] font-bold mt-0.5 flex-shrink-0">✓</span>
                  <span><span className="font-semibold text-[#1c1c1c]">{label}:</span> {desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">2. Benefits of Fresh Milk</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              Many customers choose fresh farm milk for the following reasons:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Rich in natural enzymes, vitamins, and minerals that may be reduced during commercial processing.',
                'Contains natural fats and proteins in their unaltered form.',
                'No added hormones, antibiotics, or chemical treatments in our cow care practices.',
                'Better taste and creaminess compared to commercially processed milk, as reported by our customers.',
                'Sourced from cows fed on natural fodder in a stress-free farming environment.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#d4a017] mt-0.5 flex-shrink-0">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[#6a6a6a] text-xs mt-4 italic">
              Note: The above are general observations and traditional views. Sri Krishnaa Dairy Farms does not
              make medical claims about the health benefits of fresh milk.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">3. Risks of Fresh Milk Consumption</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              Fresh milk that has not been pasteurized may carry a higher risk of containing harmful bacteria
              such as <em>Salmonella</em>, <em>E. coli</em>, <em>Listeria</em>, or <em>Campylobacter</em> compared to
              commercially pasteurized milk. While we maintain strict hygiene and quality practices, you should
              be aware of the following:
            </p>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Bacterial contamination can occur at any point between milking and consumption if not handled properly.',
                'The risk is higher for individuals with weakened immune systems, chronic illness, or those on immunosuppressant medications.',
                'Pregnant women are advised to boil milk before consumption to eliminate any risk to the fetus.',
                'Children under 5 years and elderly individuals over 65 are more susceptible to foodborne illness and should consume only boiled milk.',
                'Anyone experiencing nausea, vomiting, or diarrhea after consuming milk should seek medical attention immediately.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">4. Who Should Be Cautious</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              We recommend extra caution for the following groups. Please consult a qualified healthcare
              professional before consuming our milk:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '🤰', label: 'Pregnant women' },
                { icon: '👶', label: 'Infants and toddlers under 2' },
                { icon: '🧓', label: 'Elderly individuals over 65' },
                { icon: '🏥', label: 'Immunocompromised individuals' },
                { icon: '💊', label: 'People on immunosuppressant medication' },
                { icon: '🩺', label: 'Those with lactose intolerance or milk allergy' },
                { icon: '🔬', label: 'People with chronic kidney or liver disease' },
                { icon: '⚡', label: 'Anyone recovering from serious illness' },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
                  <span className="text-xl">{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">5. Safe Handling Guidelines</h2>
            <ul className="flex flex-col gap-3 text-sm text-[#4a4a4a]">
              {[
                'Refrigerate milk immediately upon delivery. Do not leave it at room temperature for more than 2 hours.',
                'Consume within 24–36 hours of delivery for best taste and safety.',
                'If you are uncertain about the freshness of the milk, boil it before drinking.',
                'Do not consume milk that smells sour, has visible curdling, or changed in colour.',
                'Always store milk in the delivery bottle or a clean, sealed container in the refrigerator.',
                'Wash your hands before handling or pouring milk.',
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#1a5c38] font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">6. FSSAI Compliance</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              Sri Krishnaa Dairy Farms operates in accordance with the guidelines of the <span className="font-semibold text-[#1c1c1c]">Food Safety and
              Standards Authority of India (FSSAI)</span>. Our farm and milk handling processes adhere to applicable
              food safety standards for fresh milk supply. Our cows are regularly health-checked, and our milking
              and storage equipment is cleaned and sanitised daily. We do not administer artificial growth
              hormones to our cows.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">7. Limitation of Liability</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed">
              Sri Krishnaa Dairy Farms shall not be held liable for any adverse health effects, illness, or
              injury arising from the consumption of our products when they have been delivered in proper
              condition and the customer has been made aware of safe handling guidelines. By ordering from us,
              you acknowledge that you have read this disclaimer and accept the inherent nature of fresh,
              minimally processed dairy products.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e0d0] shadow-sm p-7 sm:p-10">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">8. Report a Quality Concern</h2>
            <p className="text-[#4a4a4a] text-sm leading-relaxed mb-4">
              If you receive milk that appears spoiled or abnormal, or if you experience any adverse reaction
              after consumption, please contact us immediately:
            </p>
            <div className="flex flex-col gap-3 text-sm">
              <a href="https://wa.me/918553666002" target="_blank"
                className="flex items-center gap-3 bg-[#f0faf4] border border-[#c8e6d4] rounded-xl px-5 py-3 hover:bg-[#e0f5ea] transition">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c]">WhatsApp</p>
                  <p className="text-[#4a4a4a] text-xs">+91 8553666002 — send photos if possible</p>
                </div>
              </a>
              <a href="tel:8553666002"
                className="flex items-center gap-3 bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl px-5 py-3 hover:bg-[#f5f0e8] transition">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-[#1c1c1c]">Call Us</p>
                  <p className="text-[#4a4a4a] text-xs">8553666002</p>
                </div>
              </a>
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
              <Link href="/privacy-policy" className="hover:text-[#d4a017] transition">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-[#d4a017] transition">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-[#d4a017] transition">Refund Policy</Link>
              <Link href="/health-disclaimer" className="hover:text-[#d4a017] transition text-[#d4a017]">Health Disclaimer</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
