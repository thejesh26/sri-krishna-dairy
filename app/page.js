import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] font-[family-name:var(--font-inter)]">

      {/* Header */}
      <header className="bg-[#fdfbf7] px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-[#e8e0d0]">
        <Link href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-14 w-14 rounded-full object-cover shadow border-2 border-[#d4a017]" />
          <div>
            <h1 className="text-lg font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium tracking-wide">FARM FRESH • PURE • NATURAL</p>
          </div>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-[#1c1c1c]">
          <a href="#about" className="hover:text-[#1a5c38] transition">About</a>
          <a href="#how-it-works" className="hover:text-[#1a5c38] transition">How It Works</a>
          <a href="#products" className="hover:text-[#1a5c38] transition">Products</a>
          <a href="#contact" className="hover:text-[#1a5c38] transition">Contact</a>
        </nav>
        <div className="flex gap-3">
          <Link href="/login" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">Login</Link>
          <Link href="/signup" className="bg-[#1a5c38] text-white font-semibold px-4 py-2 rounded text-sm hover:bg-[#14472c] transition">Sign Up</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center"
        style={{background: 'linear-gradient(135deg, #0d3320 0%, #1a5c38 40%, #2d7a50 70%, #1a5c38 100%)'}}>
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-10"
          style={{background: 'radial-gradient(circle, #d4a017, transparent)'}}></div>
        <div className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] rounded-full opacity-10"
          style={{background: 'radial-gradient(circle, #d4a017, transparent)'}}></div>
        <div className="absolute top-[20%] left-[5%] w-2 h-2 rounded-full bg-[#d4a017] opacity-40"></div>
        <div className="absolute top-[40%] right-[10%] w-3 h-3 rounded-full bg-[#d4a017] opacity-30"></div>
        <div className="absolute bottom-[30%] left-[15%] w-2 h-2 rounded-full bg-white opacity-20"></div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
          <div>
            <div style={{display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(212,160,23,0.15)', border:'1px solid rgba(212,160,23,0.5)', borderRadius:'999px', padding:'8px 16px', marginBottom:'24px'}}>
              <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'#d4a017', display:'inline-block'}}></span>
              <span style={{color:'#d4a017', fontWeight:'600', fontSize:'12px', letterSpacing:'2px', textTransform:'uppercase'}}>Farm Fresh Daily Delivery</span>
            </div>
            <h2 className="font-[family-name:var(--font-playfair)] text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Pure Milk,<br />
              <span className="text-[#d4a017]">Straight From</span><br />
              Our Farm
            </h2>
            <p className="text-green-100 text-lg mb-4 leading-relaxed max-w-md">
              No middlemen. No preservatives. Just pure, fresh cow milk delivered to your doorstep every morning.
            </p>
            <p className="text-green-300 text-sm font-medium mb-10">
              📍 Serving homes & apartments in & around Kattigenahalli, Bangalore
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/order" className="bg-[#d4a017] text-white px-8 py-4 rounded font-bold text-base hover:bg-[#b8860b] transition shadow-lg">
                Order Now →
              </Link>
              <Link href="/subscribe" className="border-2 border-white text-white px-8 py-4 rounded font-bold text-base hover:bg-white hover:text-[#1a5c38] transition">
                Subscribe Daily
              </Link>
            </div>
            <div className="flex gap-8 mt-12 pt-8 border-t border-white border-opacity-20">
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#d4a017]">5+</p>
                <p className="text-green-300 text-xs mt-1">Years Farming</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#d4a017]">100%</p>
                <p className="text-green-300 text-xs mt-1">Pure & Natural</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#d4a017]">Daily</p>
                <p className="text-green-300 text-xs mt-1">Fresh Delivery</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-80 h-80 rounded-full border-4 border-[#d4a017] border-opacity-60 flex items-center justify-center shadow-2xl overflow-hidden"
                style={{background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'}}>
                <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="w-72 h-72 rounded-full object-cover" />
              </div>
              <div style={{position:'absolute', top:'8px', right:'-16px', background:'#d4a017', borderRadius:'999px', padding:'8px 20px', fontSize:'14px', fontWeight:'700', color:'white', boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>
                Est. 2019
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              {['🌿 No Preservatives', '🐄 Farm Direct', '⏰ Morning Delivery', '💵 Cash on Delivery'].map((item) => (
                <span key={item}
                  style={{background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'white', fontSize:'15px', fontWeight:'600', padding:'12px 22px', borderRadius:'999px', whiteSpace:'nowrap'}}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#fdfbf7"/>
          </svg>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <hr className="border-[#e8e0d0]" />
      </div>

      {/* Products */}
      <section id="products" className="px-6 py-20 max-w-4xl mx-auto">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">What We Offer</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-12">Our Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="border border-[#e8e0d0] rounded-lg p-8 hover:shadow-lg transition bg-white">
            <div className="text-5xl mb-5 text-center">🥛</div>
            <h4 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] text-center mb-1">Fresh Cow Milk</h4>
            <p className="text-center text-[#d4a017] font-semibold text-sm mb-3">500ml Bottle</p>
            <p className="text-gray-400 text-center text-sm mb-5">Pure, fresh & delivered every morning</p>
            <p className="text-3xl font-bold text-center text-[#1a5c38] mb-6">₹30 <span className="text-sm font-normal text-gray-400">/ bottle</span></p>
            <Link href="/order?product=500ml" className="block bg-[#1a5c38] text-white text-center py-3 rounded font-semibold hover:bg-[#14472c] transition">Order Now (COD)</Link>
            <Link href="/subscribe?product=500ml" className="block mt-2 border border-[#d4a017] text-[#d4a017] text-center py-2 rounded font-semibold hover:bg-[#d4a017] hover:text-white transition text-sm">Subscribe (Prepaid)</Link>
          </div>
          <div className="border border-[#e8e0d0] rounded-lg p-8 hover:shadow-lg transition bg-white">
            <div className="text-5xl mb-5 text-center">🥛</div>
            <h4 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] text-center mb-1">Fresh Cow Milk</h4>
            <p className="text-center text-[#d4a017] font-semibold text-sm mb-3">1000ml Bottle</p>
            <p className="text-gray-400 text-center text-sm mb-5">Best value for families</p>
            <p className="text-3xl font-bold text-center text-[#1a5c38] mb-6">₹55 <span className="text-sm font-normal text-gray-400">/ bottle</span></p>
            <Link href="/order?product=1000ml" className="block bg-[#1a5c38] text-white text-center py-3 rounded font-semibold hover:bg-[#14472c] transition">Order Now (COD)</Link>
            <Link href="/subscribe?product=1000ml" className="block mt-2 border border-[#d4a017] text-[#d4a017] text-center py-2 rounded font-semibold hover:bg-[#d4a017] hover:text-white transition text-sm">Subscribe (Prepaid)</Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#f5f0e8] px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Simple & Easy</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-12">How It Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-14 h-14 rounded-full bg-[#1a5c38] text-white text-xl font-bold flex items-center justify-center mx-auto mb-5">1</div>
              <h4 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">Sign Up Free</h4>
              <p className="text-gray-500 text-sm">Create your account in under a minute. No fees, no commitments.</p>
            </div>
            <div>
              <div className="w-14 h-14 rounded-full bg-[#d4a017] text-white text-xl font-bold flex items-center justify-center mx-auto mb-5">2</div>
              <h4 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">Choose Your Plan</h4>
              <p className="text-gray-500 text-sm">Pick your quantity, delivery slot — one time order or prepaid subscription.</p>
            </div>
            <div>
              <div className="w-14 h-14 rounded-full bg-[#1a5c38] text-white text-xl font-bold flex items-center justify-center mx-auto mb-5">3</div>
              <h4 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">Get Fresh Milk</h4>
              <p className="text-gray-500 text-sm">Fresh milk delivered to your doorstep every morning. Pure & natural.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Why Choose Us</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-12">The Sri Krishnaa Promise</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { icon: '🌿', title: '100% Pure', desc: 'No additives or preservatives' },
            { icon: '🚴', title: 'Daily Delivery', desc: 'Fresh every morning' },
            { icon: '🐄', title: 'Farm Direct', desc: 'Straight from our farm' },
            { icon: '📅', title: 'Pause Anytime', desc: 'Flexible subscriptions' },
            { icon: '💵', title: 'COD Available', desc: 'Pay on one-time orders' },
            { icon: '💳', title: 'Prepaid Subscription', desc: 'Save more, worry less' },
            { icon: '🧪', title: 'Quality Tested', desc: 'Every batch checked' },
            { icon: '💚', title: 'Ethical Farming', desc: 'Cows treated with love' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#e8e0d0] rounded-lg p-5 hover:shadow-md transition">
              <div className="text-3xl mb-3">{icon}</div>
              <p className="font-semibold text-[#1c1c1c] text-sm">{title}</p>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our Guarantee */}
      <section className="bg-[#1a5c38] px-6 py-20 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Our Promise</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold mb-6">The Sri Krishnaa Guarantee 🛡️</h3>
          <p className="text-green-100 text-lg mb-8 leading-relaxed">
            We take quality seriously. If you ever receive milk that doesn't meet our freshness standards —
            spoiled, sour, or incorrectly delivered — report it to us within 2 hours of delivery
            and we will replace it the very next delivery at no charge.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: '✅', title: 'Quality Guarantee', desc: 'Report within 2 hours — we replace it next delivery' },
              { icon: '⏰', title: 'On-Time Guarantee', desc: 'Delivered within your chosen slot, every day' },
              { icon: '🔄', title: 'Flexibility Guarantee', desc: 'Pause or cancel anytime with 12 hours notice' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-[#14472c] rounded-lg p-6">
                <div className="text-3xl mb-3">{icon}</div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-green-300 text-sm mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="px-6 py-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Our Story</p>
            <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c] mb-5">More Than Just Milk</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Sri Krishnaa Dairy Farms has been nurturing cows with love and care for over 5 years.
              What started as a passion for pure, natural milk is now a movement — bringing
              farm-fresh goodness directly to families in Bangalore, cutting out the middleman completely.
            </p>
            <p className="text-gray-500 leading-relaxed mb-4">
              We believe you deserve to know exactly where your milk comes from. No processing units,
              no long supply chains — just pure, fresh milk from our farm to your doorstep every single morning.
            </p>
            <p className="text-[#1a5c38] font-semibold leading-relaxed">
              🐄 Coming Soon — Our A2 Desi Cow Dairy, where you can visit our farm,
              meet our cows and experience the true meaning of pure milk.
            </p>
          </div>
          <div className="bg-[#f5f0e8] rounded-lg p-8 text-center">
            <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-40 w-40 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg mb-5" />
            <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c]">Sri Krishnaa Dairy Farms</p>
            <p className="text-[#d4a017] text-sm font-medium mt-1">Est. 2019 • Bangalore</p>
            <div className="flex justify-center gap-6 mt-5">
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">5+</p>
                <p className="text-xs text-gray-400 font-[family-name:var(--font-playfair)]">Years of Farming</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">100%</p>
                <p className="text-xs text-gray-400 font-[family-name:var(--font-playfair)]">Pure & Natural</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">Daily</p>
                <p className="text-xs text-gray-400 font-[family-name:var(--font-playfair)]">Fresh Delivery</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f5f0e8] px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Got Questions?</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-12">Frequently Asked Questions</h3>
          <div className="flex flex-col gap-4">
            {[
              {
                q: 'Where do you deliver?',
                a: 'We deliver to homes, apartments, gated communities, and housing societies in and around Kattigenahalli, Bangalore. We also accept bulk orders for schools, hotels, resorts, offices and other institutions — on separate bulk delivery timings. Contact us for bulk enquiries.'
              },
              {
                q: 'What time is milk delivered?',
                a: 'Morning slot: 5AM – 8AM. Evening slot: 5PM – 7PM. We always aim to deliver within your chosen slot. Bulk institutional orders may have different delivery timings.'
              },
              {
                q: 'Can I pause my subscription?',
                a: 'Yes! You can pause delivery for any specific date directly from your dashboard, at least 12 hours in advance. You can also resume anytime.'
              },
              {
                q: 'What is the bottle deposit?',
                a: 'We charge ₹100 per bottle as a refundable security deposit. Minimum deposit is ₹200 (for 2 bottles). The full deposit is refunded when bottles are returned in good condition. Alternatively, choose our Direct Delivery option where our delivery person collects the bottle immediately — no deposit needed.'
              },
              {
                q: 'How do I pay?',
                a: 'For one-time orders: Cash on Delivery (COD) — pay when you receive your milk. For subscriptions: Prepaid payment — pay in advance weekly or monthly and enjoy uninterrupted daily delivery without any hassle.'
              },
              {
                q: 'Is the milk pasteurized?',
                a: 'Our milk is farm-fresh and pure, delivered straight from our farm. We follow strict hygiene and quality standards at every step of the process to ensure you receive the safest, freshest milk possible.'
              },
              {
                q: 'Do you take bulk orders?',
                a: 'Yes! We supply bulk milk to schools, hotels, resorts, hostels, canteens and other institutions. Bulk orders have special pricing and dedicated delivery timings. Please contact us on WhatsApp or call us for bulk order enquiries.'
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white border border-[#e8e0d0] rounded-lg p-5">
                <p className="font-semibold text-[#1c1c1c] mb-2 font-[family-name:var(--font-playfair)]">Q: {q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">A: {a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-6 py-20 max-w-4xl mx-auto text-center">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Get In Touch</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c] mb-5">Contact Us</h3>
        <p className="text-gray-500 mb-10">Have questions? We're always happy to help!</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-[#e8e0d0] rounded-lg p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">📞</div>
            <p className="font-semibold text-[#1c1c1c] mb-1">Call Us</p>
            <a href="tel:8553666002" className="text-[#1a5c38] font-bold hover:underline">8553666002</a>
            <p className="text-gray-400 text-xs mt-1">Mon–Sun, 6AM–8PM</p>
          </div>
          <div className="bg-white border border-[#e8e0d0] rounded-lg p-6 hover:shadow-md transition">
            <div className="mb-3 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <p className="font-semibold text-[#1c1c1c] mb-1">WhatsApp</p>
            <a href="https://wa.me/918553666002" target="_blank" className="text-[#1a5c38] font-bold hover:underline">Chat with us</a>
            <p className="text-gray-400 text-xs mt-1">Quick replies guaranteed</p>
          </div>
          <div className="bg-white border border-[#e8e0d0] rounded-lg p-6 hover:shadow-md transition">
            <div className="text-3xl mb-3">📍</div>
            <p className="font-semibold text-[#1c1c1c] mb-1">Location</p>
            <p className="text-gray-500 text-sm">Kattigenahalli,<br />Bangalore, Karnataka</p>
            <p className="text-gray-400 text-xs mt-1">Delivery: 5AM–8AM & 5PM–7PM</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-20 text-center"
        style={{background: 'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
        <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full opacity-10"
          style={{background: 'radial-gradient(circle, #d4a017, transparent)'}}></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Get Started Today</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white mb-4">
            Start Your Daily Milk<br />Subscription Today
          </h3>
          <p className="text-green-200 text-lg mb-8">
            Join happy families in Kattigenahalli getting fresh, pure milk every morning
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/subscribe" className="bg-[#d4a017] text-white px-10 py-4 rounded font-bold text-lg hover:bg-[#b8860b] transition shadow-lg">
              Subscribe Now →
            </Link>
            <Link href="/order" className="border-2 border-white text-white px-10 py-4 rounded font-bold text-lg hover:bg-white hover:text-[#1a5c38] transition">
              Order Once
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d1f13] text-white px-6 pt-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 pb-12 border-b border-gray-800">

            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/Logo.jpg" alt="Logo" className="h-14 w-14 rounded-full object-cover border-2 border-[#d4a017]" />
                <div>
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-lg leading-tight">Sri Krishnaa<br />Dairy Farms</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Pure, fresh cow milk delivered straight from our farm to your doorstep every morning.
              </p>
              <div className="flex gap-3">
                <a href="https://wa.me/918553666002" target="_blank"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-semibold px-4 py-2 rounded transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a href="tel:8553666002"
                  className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded transition">
                  📞 Call Us
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Quick Links</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="#about" className="hover:text-[#d4a017] transition">About Us</a></li>
                <li><a href="#how-it-works" className="hover:text-[#d4a017] transition">How It Works</a></li>
                <li><a href="#products" className="hover:text-[#d4a017] transition">Our Products</a></li>
                <li><a href="#contact" className="hover:text-[#d4a017] transition">Contact Us</a></li>
                <li><a href="/signup" className="hover:text-[#d4a017] transition">Sign Up Free</a></li>
                <li><a href="/login" className="hover:text-[#d4a017] transition">Login</a></li>
              </ul>
            </div>

            {/* Products */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Our Products</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li className="flex justify-between">
                  <span>Fresh Cow Milk 500ml</span>
                  <span className="text-[#d4a017] font-semibold">₹30</span>
                </li>
                <li className="flex justify-between">
                  <span>Fresh Cow Milk 1000ml</span>
                  <span className="text-[#d4a017] font-semibold">₹55</span>
                </li>
                <li className="border-t border-gray-800 pt-3 mt-1">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Coming Soon</p>
                </li>
                <li className="text-green-500 text-xs flex items-center gap-2">🐄 A2 Desi Cow Milk</li>
                <li className="text-green-500 text-xs flex items-center gap-2">🧈 Pure Desi Ghee</li>
                <li className="text-green-500 text-xs flex items-center gap-2">🥛 Fresh Curd</li>
                <li className="text-green-500 text-xs flex items-center gap-2">🧀 Homemade Paneer</li>
                <li className="text-green-500 text-xs flex items-center gap-2">🍦 Fresh Butter</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Contact Us</p>
              <ul className="flex flex-col gap-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📞</span>
                  <a href="tel:8553666002" className="hover:text-white transition">8553666002</a>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <a href="https://wa.me/918553666002" target="_blank" className="hover:text-white transition">WhatsApp Us</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📍</span>
                  <span>Kattigenahalli,<br />Bangalore, Karnataka</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">🕐</span>
                  <span>Morning: 5AM – 8AM<br />Evening: 5PM – 7PM</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Middle Footer */}
          <div className="py-8 border-b border-gray-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: '🌿', text: 'No Preservatives' },
                { icon: '🐄', text: 'Farm Direct' },
                { icon: '✅', text: 'Quality Tested' },
                { icon: '💚', text: 'Ethically Farmed' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center justify-center gap-2">
                  <span>{icon}</span>
                  <span className="text-gray-400 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
            <p>© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
            <p className="text-gray-600">Made with ❤️ in Bangalore</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-gray-300 transition">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}