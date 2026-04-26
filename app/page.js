'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function Home() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [products, setProducts] = useState([])
  const [dbReviews, setDbReviews] = useState([])
  const [bulkForm, setBulkForm] = useState({ name: '', phone: '', institution: '', quantity: '', message: '' })
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkSubmitted, setBulkSubmitted] = useState(false)
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkPhoneError, setBulkPhoneError] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, is_delivery')
          .eq('id', session.user.id)
          .single()

        if (profile?.is_admin) {
          router.push('/admin')
          return
        } else if (profile?.is_delivery) {
          router.push('/delivery')
          return
        }
      }
      setAuthChecked(true)
    }
    const loadProducts = async () => {
      const { data } = await supabase.from('products').select('*').eq('is_available', true).order('price')
      setProducts(data || [])
    }
    const loadReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('rating, review, profiles(full_name, area)')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6)
      if (data && data.length > 0) setDbReviews(data)
    }
    checkUser()
    loadProducts()
    loadReviews()
  }, [])

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
      setTimeout(() => setBulkModal(false), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] font-[family-name:var(--font-inter)]">

      {/* Bulk Enquiry Success Modal */}
      {bulkModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{background:'rgba(0,0,0,0.5)'}}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-[#e8e0d0]">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mb-3">
              Thank you for your enquiry!
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              We'll contact you within 24 hours to discuss your bulk milk requirements.
            </p>
            <p className="text-[#d4a017] font-semibold text-sm">— Sri Krishnaa Dairy Team</p>
            <button onClick={() => setBulkModal(false)}
              className="mt-5 text-xs text-gray-400 hover:text-[#1a5c38] transition underline">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#fdfbf7] px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-[#e8e0d0]">
  <a href="/" onClick={(e) => { if (window.location.pathname === '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) } }} className="flex items-center gap-2">
    <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover shadow border-2 border-[#d4a017]" />
    <div>
      <h1 className="text-sm sm:text-lg font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)] leading-tight">Sri Krishnaa Dairy</h1>
      <p className="text-xs text-[#d4a017] font-medium tracking-wide hidden sm:block">FARM FRESH • PURE • NATURAL</p>
    </div>
  </a>
  <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#1c1c1c]">
    <a href="#about" className="hover:text-[#1a5c38] transition">About</a>
    <a href="#how-it-works" className="hover:text-[#1a5c38] transition">How It Works</a>
    <a href="#products" className="hover:text-[#1a5c38] transition">Products</a>
    <a href="#contact" className="hover:text-[#1a5c38] transition">Contact</a>
  </nav>
  <div className="flex gap-2">
    {isLoggedIn ? (
      <Link href="/dashboard" className="bg-[#1a5c38] text-white font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#14472c] transition whitespace-nowrap">Dashboard</Link>
    ) : (
      <>
        <Link href="/login" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#1a5c38] hover:text-white transition whitespace-nowrap">Login</Link>
        <Link href="/signup" className="bg-[#1a5c38] text-white font-semibold px-3 py-1.5 rounded text-xs sm:text-sm sm:px-4 sm:py-2 hover:bg-[#14472c] transition whitespace-nowrap">Sign Up</Link>
      </>
    )}
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

        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 sm:px-16 py-12 sm:py-20 grid grid-cols-1 sm:grid-cols-[1fr_1.2fr] gap-8 sm:gap-4 items-center">

          {/* Left — lean copy + CTAs */}
          <div className="flex flex-col gap-7">
            <p style={{color:'#d4a017', fontWeight:'700', fontSize:'11px', letterSpacing:'3px', textTransform:'uppercase'}}>Pure · Fresh · Delivered Daily</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-5xl sm:text-7xl font-bold text-white leading-[1.05]">
              Farm-Fresh<br />
              Milk,{' '}
              <span className="text-[#d4a017]">Straight<br />to Your Door</span>
            </h2>
            <p className="text-green-200 text-base sm:text-lg leading-relaxed max-w-sm">
              Direct from our cows at 4 AM. No middlemen, no preservatives — at your doorstep by 9 AM.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link href="/order" className="bg-[#d4a017] text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-[#b8860b] transition shadow-lg">
                Order Now →
              </Link>
              <Link href="/subscribe" className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-white hover:text-[#1a5c38] transition" style={{borderColor:'rgba(255,255,255,0.55)'}}>
                Subscribe
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span style={{background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'999px', padding:'6px 14px', fontSize:'12px', color:'rgba(255,255,255,0.8)', fontWeight:'600'}}>
                📍 North &amp; East Bangalore
              </span>
              <span style={{background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'999px', padding:'6px 14px', fontSize:'12px', color:'rgba(255,255,255,0.8)', fontWeight:'600'}}>
                🥛 A1 Cow Milk
              </span>
            </div>
          </div>

          {/* Right — product image, no card background */}
          <div className="flex items-center justify-center relative">
            {/* Golden glow behind image */}
            <div style={{position:'absolute', width:'1000px', height:'1000px', borderRadius:'50%', background:'radial-gradient(circle, rgba(212,160,23,0.2) 0%, transparent 70%)', pointerEvents:'none', top:'50%', left:'50%', transform:'translate(-50%,-50%)'}} />

            <div className="relative flex items-center justify-center">
              {/* Image — no card, just drop shadow on the green bg */}
              <img
                src="/product-hero.png"
                alt="Sri Krishnaa Dairy — Fresh Milk Bottle and Glass"
                style={{
                  height:'520px',
                  width:'auto',
                  objectFit:'contain',
                  filter:'drop-shadow(0 32px 80px rgba(0,0,0,0.45)) drop-shadow(0 0 60px rgba(212,160,23,0.12))',
                  display:'block',
                  position:'relative',
                  zIndex:1,
                }}
              />

              {/* Floating chips */}
              <div style={{position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)', zIndex:2, background:'linear-gradient(135deg,#d4a017,#f0c040)', borderRadius:'999px', padding:'8px 22px', fontSize:'13px', fontWeight:'800', color:'white', boxShadow:'0 6px 20px rgba(212,160,23,0.6)', whiteSpace:'nowrap', letterSpacing:'0.05em'}}>
                ✦ Fresh Daily
              </div>

              <div style={{position:'absolute', top:'100px', right:'-64px', zIndex:2, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'999px', padding:'9px 16px', fontSize:'12px', fontWeight:'700', color:'white', whiteSpace:'nowrap'}}>
                🐄 Farm Direct
              </div>

              <div style={{position:'absolute', bottom:'130px', right:'-60px', zIndex:2, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'999px', padding:'9px 16px', fontSize:'12px', fontWeight:'700', color:'white', whiteSpace:'nowrap'}}>
                ⏰ By 9 AM
              </div>

              <div style={{position:'absolute', top:'100px', left:'-60px', zIndex:2, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:'999px', padding:'9px 16px', fontSize:'12px', fontWeight:'700', color:'white', whiteSpace:'nowrap'}}>
                🌿 No Additives
              </div>
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
      <section id="products" className="px-6 py-12 max-w-4xl mx-auto">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">What We Offer</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-8">Our Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {products.length > 0 ? products.map((product) => (
            <div key={product.id} className="border border-[#e8e0d0] rounded-lg p-8 hover:shadow-lg transition bg-white">
              <div className="flex justify-center mb-5"><img src="/bottle.png" alt="Fresh Cow Milk" className="h-28 object-contain drop-shadow-md" /></div>
              <h4 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] text-center mb-1">Fresh Cow Milk</h4>
              <p className="text-center text-[#d4a017] font-semibold text-sm mb-3">{product.size} Bottle</p>
              <p className="text-gray-400 text-center text-sm mb-5">{product.size === '500ml' ? 'Perfect trial · No deposit · COD' : 'Best value for families'}</p>
              <p className="text-3xl font-bold text-center text-[#1a5c38] mb-6">₹{product.price} <span className="text-sm font-normal text-gray-400">/ bottle</span></p>
              <Link href={`/order`} className="block bg-[#1a5c38] text-white text-center py-3 rounded font-semibold hover:bg-[#14472c] transition">Order Now</Link>
              <Link href={`/subscribe`} className="block mt-2 border border-[#d4a017] text-[#d4a017] text-center py-2 rounded font-semibold hover:bg-[#d4a017] hover:text-white transition text-sm">Subscribe (Prepaid)</Link>
            </div>
          )) : (
            // Fallback skeleton while products load
            [1, 2].map((i) => (
              <div key={i} className="border border-[#e8e0d0] rounded-lg p-8 bg-white animate-pulse">
                <div className="h-12 w-12 rounded-full bg-gray-100 mx-auto mb-5"></div>
                <div className="h-5 bg-gray-100 rounded mb-3 mx-8"></div>
                <div className="h-4 bg-gray-100 rounded mb-5 mx-12"></div>
                <div className="h-8 bg-gray-100 rounded mb-6 mx-16"></div>
                <div className="h-10 bg-gray-100 rounded mb-2"></div>
                <div className="h-8 bg-gray-100 rounded"></div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#f5f0e8] px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Simple & Easy</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-8">How It Works</h3>
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
              <p className="text-gray-500 text-sm">Fresh milk delivered to your doorstep every day. Pure & natural.</p>
            </div>
          </div>
        </div>
      </section>

      {/* From Farm to Your Door */}
      <section className="bg-white px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Hygiene & Transparency</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-3">From Farm to Your Door</h3>
          <p className="text-center text-gray-500 text-sm mb-8 max-w-lg mx-auto">
            Every bottle follows a strict 7-step journey — fresh, hygienic, and traceable from our cows to your doorstep.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            {[
              { icon: '🐄', step: '01', title: 'Milking', desc: 'Cows milked hygienically at 4–6 AM with sanitized equipment at our farm in Kammasandra, Bangalore Rural.' },
              { icon: '🧪', step: '02', title: 'Quality Check', desc: 'Each batch inspected and tested for freshness, purity, and fat content before bottling.' },
              { icon: '🫧', step: '03', title: 'Bottle Cleaning', desc: 'All returned bottles thoroughly washed with food-grade agents, rinsed, and sterilized.' },
              { icon: '🍼', step: '04', title: 'Filling & Sealing', desc: 'Measured quantities poured into sterilized bottles and hygienically sealed.' },
              { icon: '📦', step: '05', title: 'Packing', desc: 'Labelled with customer details and packed in insulated bags to retain freshness during transit.' },
              { icon: '🛵', step: '06', title: 'Farm Dispatch at 6AM', desc: 'Delivery agents dispatched by 6 AM with pre-planned routes for your area.' },
              { icon: '🏠', step: '07', title: 'Door Delivery', desc: 'Fresh milk at your doorstep by your chosen slot — 7–9 AM morning or 5–7 PM evening.' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#f0faf4] border-2 border-[#c8e6d4] flex items-center justify-center text-2xl flex-shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-xs text-[#d4a017] font-bold tracking-widest mb-0.5">STEP {step}</p>
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-base">{title}</p>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Why Us */}
      <section id="why-us" className="px-6 py-12 max-w-4xl mx-auto">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Why Choose Us</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-8">The Sri Krishnaa Promise</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { icon: '🌿', title: '100% Pure', desc: 'No additives or preservatives' },
            { icon: '🍼', title: 'Delivered on Time', desc: 'Fresh at your door every day' },
            { icon: '🐄', title: 'Farm to Door in 2hrs', desc: 'Straight from our farm' },
            { icon: '📅', title: 'Pause Anytime', desc: 'Flexible subscriptions' },
            { icon: '💳', title: 'Flexible Payment', desc: 'First order COD, then easy wallet top-ups' },
            { icon: '🛵', title: 'Reliable Delivery', desc: 'Every day without fail' },
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

      {/* Testimonials */}
      <section className="bg-[#f5f0e8] px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Happy Customers</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-8">What Our Customers Say</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(dbReviews.length > 0 ? dbReviews.map(r => ({
              name: r.profiles?.full_name || 'Customer',
              area: r.profiles?.area || 'Bangalore',
              text: r.review || 'Great fresh milk, highly recommended!',
              rating: r.rating,
            })) : [
              {
                name: 'Priya Sharma',
                area: 'Dwaraka Nagar, Bangalore',
                text: 'Been getting milk from Sri Krishnaa for 6 months now. Genuinely the freshest I have had in Bangalore. My kids love it and I feel good knowing exactly where it comes from.',
                rating: 5,
              },
              {
                name: 'Rajesh Kumar',
                area: 'Baba Nagar, Bangalore',
                text: 'The subscription model is super convenient. Wallet top-up once, milk delivered daily without any hassle. Customer service is responsive and very helpful.',
                rating: 5,
              },
              {
                name: 'Anitha Reddy',
                area: 'Kattigenahalli',
                text: 'Switched from packet milk to Sri Krishnaa and the difference in taste is night and day. Love the pause feature — used it during our holiday trip to Mysore.',
                rating: 5,
              },
            ]).map(({ name, area, text, rating }, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e0d0]">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: rating }).map((_, i) => (
                    <span key={i} className="text-[#d4a017] text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-sm">{name}</p>
                    <p className="text-xs text-gray-400">{area}, Bangalore</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Refer a Friend */}
      <section className="bg-white px-6 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Spread the Goodness</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c] mb-4">
            Refer a Friend, Earn a Free Delivery 🎁
          </h3>
          <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Love your milk? Share Sri Krishnaa with a friend. When they subscribe, you both get a free delivery credited to your wallet — no codes, no hassle.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              { icon: '📲', step: '1', title: 'Share Your Link', desc: 'Send your referral link to a friend via WhatsApp or any app' },
              { icon: '✅', step: '2', title: 'They Subscribe', desc: 'Your friend signs up and starts their first subscription' },
              { icon: '🎉', step: '3', title: 'You Both Win', desc: 'A free delivery is credited to both your wallets automatically' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="bg-[#f5f0e8] rounded-xl p-6 text-center border border-[#e8e0d0]">
                <div className="text-4xl mb-3">{icon}</div>
                <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-1">{title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <Link href="/dashboard" className="inline-block bg-[#1a5c38] text-white font-bold px-8 py-3 rounded hover:bg-[#14472c] transition shadow-md">
            Get Your Referral Link →
          </Link>
          <p className="text-xs text-gray-400 mt-3">Log in to your dashboard to find your personal referral link.</p>
        </div>
      </section>

      {/* Our Guarantee */}
      <section className="bg-[#1a5c38] px-6 py-12 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Our Promise</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold mb-6">The Sri Krishnaa Guarantee 🛡️</h3>
          <p className="text-green-100 text-lg mb-8 leading-relaxed">
            We take quality seriously. If you ever receive milk that doesn't meet our freshness standards —
            spoiled, sour, or incorrectly delivered — report it to us by 6PM the same day
            and we will replace it the very next delivery at no charge.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: '✅', title: 'Quality Guarantee', desc: 'Report by 6PM the same day — we replace it next delivery' },
              { icon: '⏰', title: 'On-Time Guarantee', desc: 'Delivered within your chosen slot (7AM–9AM or 5PM–7PM), guaranteed' },
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
      <section id="about" className="px-6 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Our Story</p>
            <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c] mb-5">More Than Just Milk</h3>
            <p className="text-gray-500 leading-relaxed mb-4">
              Sri Krishnaa Dairy Farms is a modern farm-to-home dairy service, bringing
              farm-fresh goodness directly to families in Bangalore — cutting out the middleman completely.
              Pure milk for modern families.
            </p>
            <p className="text-gray-500 leading-relaxed mb-4">
              We believe you deserve to know exactly where your milk comes from. No processing units,
              no long supply chains — just pure, fresh milk from our farm to your doorstep every single day.
            </p>
          </div>
          <div className="bg-[#f5f0e8] rounded-lg p-8 text-center">
            <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-40 w-40 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg mb-5" />
            <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c]">Sri Krishnaa Dairy Farms</p>
            <p className="text-[#d4a017] text-sm font-medium mt-1">Farm Fresh • Bangalore</p>
            <div className="flex justify-center gap-6 mt-5">
              <div>
                <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">2hrs</p>
                <p className="text-xs text-gray-400 font-[family-name:var(--font-playfair)]">Farm to Door</p>
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

      {/* Bulk Orders */}
<section className="px-6 py-12 bg-[#f5f0e8]">
  <div className="max-w-4xl mx-auto">
    <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Large Quantity?</p>
    <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-5">
      Bulk Milk Orders
    </h3>
    <p className="text-center text-gray-500 mb-10 max-w-2xl mx-auto">
      We supply fresh pure cow milk in bulk to institutions across Kattigenahalli and nearby areas in Bangalore. Special pricing and dedicated delivery timings available.
    </p>

    {/* Who we serve */}
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
      {[
        { icon: '🏫', title: 'Schools', desc: 'Daily morning supply' },
        { icon: '🏨', title: 'Hotels & Resorts', desc: 'Fresh daily delivery' },
        { icon: '🏥', title: 'Hospitals & Clinics', desc: 'Reliable supply' },
        { icon: '🏢', title: 'Offices & Corporates', desc: 'Bulk subscription' },
        { icon: '🏠', title: 'Hostels & PGs', desc: 'Daily delivery' },
        { icon: '🍽️', title: 'Restaurants & Cafes', desc: 'Fresh daily' },
      ].map(({ icon, title, desc }) => (
        <div key={title} className="bg-white border border-[#e8e0d0] rounded-xl p-5 text-center hover:shadow-md transition">
          <div className="text-4xl mb-3">{icon}</div>
          <p className="font-semibold text-[#1c1c1c]">{title}</p>
          <p className="text-xs text-gray-400 mt-1">{desc}</p>
        </div>
      ))}
    </div>

    {/* Benefits */}
    <div className="bg-white border border-[#e8e0d0] rounded-2xl p-8 mb-8">
      <h4 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] mb-6 text-center">
        Why Choose Us for Bulk Orders?
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        {[
          { icon: '💰', title: 'Special Pricing', desc: 'Discounted rates for bulk orders — the more you order, the more you save' },
          { icon: '🚴', title: 'Dedicated Delivery', desc: 'Separate delivery timings for bulk orders — no delay to your operations' },
          { icon: '📞', title: 'Account Manager', desc: 'Dedicated point of contact for all your bulk order needs' },
        ].map(({ icon, title, desc }) => (
          <div key={title}>
            <div className="text-4xl mb-3">{icon}</div>
            <p className="font-semibold text-[#1c1c1c] mb-2">{title}</p>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Bulk Enquiry Form */}
    <div className="mt-10 max-w-xl mx-auto">
      <h4 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1c1c1c] mb-2 text-center">Send a Bulk Enquiry</h4>
      <p className="text-gray-500 text-sm text-center mb-6">Fill in your details and we'll get back to you within 24 hours with a custom quote.</p>
      {bulkSubmitted ? (
        <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-[#1a5c38] text-lg">Enquiry Received!</p>
          <p className="text-gray-500 text-sm mt-2">We'll contact you within 24 hours. You can also reach us directly on WhatsApp.</p>
          <a href="https://wa.me/919980166221" target="_blank"
            className="inline-flex items-center gap-2 mt-4 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
            style={{background:'#25D366'}}>
            WhatsApp Us
          </a>
        </div>
      ) : (
        <form onSubmit={handleBulkEnquiry} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e0d0] flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Your Name *</label>
              <input required type="text" placeholder="Ravi Kumar"
                value={bulkForm.name} onChange={e => setBulkForm(f => ({...f, name: e.target.value}))}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Phone Number *</label>
              <input required type="tel" placeholder="9876543210"
                pattern="[0-9]{10}" maxLength={10} inputMode="numeric"
                value={bulkForm.phone}
                onChange={e => { const v = e.target.value.replace(/\D/g, ''); setBulkForm(f => ({...f, phone: v})); setBulkPhoneError('') }}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none ${bulkPhoneError ? 'border-red-400 focus:border-red-400' : 'border-[#e8e0d0] focus:border-[#1a5c38]'}`} />
              {bulkPhoneError && <p className="text-red-500 text-xs mt-1">{bulkPhoneError}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Institution / Business Name *</label>
            <input required type="text" placeholder="Hotel Sunshine, ABC School, etc."
              value={bulkForm.institution} onChange={e => setBulkForm(f => ({...f, institution: e.target.value}))}
              className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Approximate Daily Quantity (litres)</label>
            <input type="text" placeholder="e.g. 20 litres/day"
              value={bulkForm.quantity} onChange={e => setBulkForm(f => ({...f, quantity: e.target.value}))}
              className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Message (optional)</label>
            <textarea rows={3} placeholder="Any special requirements, delivery timing preferences..."
              value={bulkForm.message} onChange={e => setBulkForm(f => ({...f, message: e.target.value}))}
              className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] resize-none" />
          </div>
          <button type="submit" disabled={bulkSubmitting}
            className="text-white py-3 rounded-lg font-bold transition disabled:opacity-60"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {bulkSubmitting ? 'Sending...' : '📩 Send Enquiry'}
          </button>
          <p className="text-xs text-gray-400 text-center">We'll respond within 24 hours. Prefer instant help? <a href="https://wa.me/919980166221" target="_blank" className="text-[#25D366] font-semibold">Chat on WhatsApp</a></p>
        </form>
      )}
    </div>
  </div>
</section>

{/* FAQ */}
<section id="faq" className="bg-white px-6 py-12">
  <div className="max-w-3xl mx-auto">
    <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Got Questions?</p>
    <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-8">Frequently Asked Questions</h3>
    <div className="flex flex-col gap-3">
      {[
        { q: 'Where do we deliver?', a: 'We deliver to homes, apartments, gated communities, and housing societies across North & East Bangalore. We also accept bulk orders for schools, hotels, resorts, offices and other institutions — on separate bulk delivery timings. Contact us for bulk enquiries.' },
        { q: 'What time is milk delivered?', a: 'Morning slot: 7AM – 9AM. Evening slot: 5PM – 7PM. We always aim to deliver within your chosen slot. Bulk institutional orders may have different delivery timings.' },
        { q: 'Can I pause my subscription?', a: 'Yes! You can pause delivery for any specific date directly from your dashboard, at least 12 hours in advance. You can also resume anytime.' },
        { q: 'What is the bottle deposit?', a: 'We charge a refundable bottle deposit of ₹200 per bottle. The full deposit is returned when bottles are given back in good condition. Our 500ml trial pack has no deposit required. Choose Direct Delivery mode to skip the deposit — our delivery person collects the bottle right after delivery.' },
        { q: 'How do I pay?', a: 'Your first order can be paid via Cash on Delivery (COD). For subscriptions and subsequent orders, we use a prepaid wallet system — add balance once and enjoy uninterrupted daily delivery without cash hassles!' },
        { q: 'What is the minimum wallet balance?', a: 'Your wallet must maintain a minimum balance of ₹300 for subscriptions to remain active. If your balance is insufficient for the day\'s delivery, your subscription will be automatically deactivated. Top up your wallet in advance to avoid interruptions — we send a low-balance alert email when your balance drops below ₹300.' },
        { q: 'Is the milk pasteurised and safe to drink directly?', a: 'Our milk is farm-fresh and pure, delivered straight from our farm. It is NOT pasteurised — it is raw, natural cow milk. We strongly recommend boiling the milk before consumption for safety. Boiling ensures any harmful bacteria are eliminated while preserving the natural goodness of the milk.' },
        { q: 'Do you take bulk orders?', a: 'Yes! We supply bulk milk to schools, hotels, resorts, hostels, canteens and other institutions. Bulk orders have special pricing and dedicated delivery timings. Please contact us on WhatsApp or call us for bulk order enquiries.' },
        { q: 'How do I install this as an app on my phone?', a: 'On iPhone: Open the website in Safari, tap the Share button (box with arrow) at the bottom, then tap "Add to Home Screen". On Android: Open in Chrome, tap the 3 dots menu, then tap "Add to Home Screen". The app icon will appear on your home screen!' },
        { q: 'Do I need to download an app from Play Store?', a: 'No! Our website works like an app directly from your browser. Just add it to your home screen and it opens instantly like a native app — no Play Store download needed!' },
      ].map(({ q, a }, index) => (
        <details key={q} className="bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl overflow-hidden group">
          <summary className="px-5 py-4 cursor-pointer flex items-center justify-between font-semibold text-[#1c1c1c] font-[family-name:var(--font-playfair)] list-none hover:bg-[#f5f0e8] transition">
            <span>{q}</span>
            <span className="text-[#d4a017] text-xl font-bold group-open:rotate-45 transition-transform duration-200 flex-shrink-0 ml-4">+</span>
          </summary>
          <div className="px-5 pb-4 pt-1 border-t border-[#e8e0d0]">
            <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
          </div>
        </details>
      ))}
    </div>
  </div>
</section>
      
      {/* Delivery Zones */}
      <section className="bg-[#fdfbf7] px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase text-center mb-3">Where We Deliver</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-center text-[#1c1c1c] mb-2">Our Delivery Zones</h3>
          <p className="text-center text-gray-500 text-sm mb-8 max-w-lg mx-auto">
            We currently serve North Bangalore — Yelahanka and surrounding neighbourhoods. Not sure if we cover your area? <a href="https://wa.me/919980166221" target="_blank" className="text-[#1a5c38] font-semibold hover:underline">WhatsApp us</a>.
          </p>

          {/* Map-style graphic */}
          <div className="relative rounded-2xl overflow-hidden border border-[#e8e0d0] shadow-md"
            style={{background: 'linear-gradient(160deg, #eef7f0 0%, #f5f0e8 50%, #eef7f0 100%)'}}>

            {/* Grid lines for map feel */}
            <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a5c38" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Compass rose */}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-[#e8e0d0] shadow flex items-center justify-center text-xs font-bold text-[#1a5c38] flex-col leading-none select-none">
              <span className="text-[10px]">N</span>
              <span className="text-[8px] text-gray-400">↑</span>
            </div>

            {/* Farm origin badge */}
            <div className="absolute top-4 left-4 bg-[#1a5c38] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
              <span>🐄</span> Our Farm · Kattigenahalli
            </div>

            {/* Zone pins laid out geographically */}
            <div className="relative pt-16 pb-8 px-6">
              {/* Row 1 — North */}
              <div className="flex justify-center gap-4 mb-4">
                {['Bagalur Cross', 'Hunasamaranahalli'].map(area => (
                  <div key={area} className="flex flex-col items-center">
                    <div className="bg-white border-2 border-[#1a5c38] rounded-xl px-3 py-2 text-center shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                      <p className="text-[#1a5c38] font-bold text-xs">📍 {area}</p>
                    </div>
                    <div className="w-0.5 h-3 bg-[#1a5c38] opacity-30 mt-1" />
                    <div className="w-2 h-2 rounded-full bg-[#1a5c38]" />
                  </div>
                ))}
              </div>

              {/* Row 2 */}
              <div className="flex justify-center gap-4 mb-4">
                {['Srinivasapura', 'Sathanur', 'Kogilu'].map(area => (
                  <div key={area} className="flex flex-col items-center">
                    <div className="bg-white border-2 border-[#1a5c38] rounded-xl px-3 py-2 text-center shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                      <p className="text-[#1a5c38] font-bold text-xs">📍 {area}</p>
                    </div>
                    <div className="w-0.5 h-3 bg-[#1a5c38] opacity-30 mt-1" />
                    <div className="w-2 h-2 rounded-full bg-[#1a5c38]" />
                  </div>
                ))}
              </div>

              {/* Row 3 — Centre (farm cluster) */}
              <div className="flex justify-center gap-4 mb-4 relative">
                {/* Pulse ring on farm area */}
                <div className="flex flex-col items-center relative">
                  <div className="absolute -inset-2 rounded-2xl animate-pulse opacity-20 bg-[#1a5c38]" />
                  <div className="relative bg-[#1a5c38] text-white border-2 border-[#d4a017] rounded-xl px-4 py-2.5 text-center shadow-lg">
                    <p className="font-bold text-xs">⭐ Kattigenahalli</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Farm Origin</p>
                  </div>
                  <div className="w-0.5 h-3 bg-[#d4a017] opacity-60 mt-1" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d4a017]" />
                </div>
                {['Venkatala', 'Palahalli'].map(area => (
                  <div key={area} className="flex flex-col items-center">
                    <div className="bg-white border-2 border-[#1a5c38] rounded-xl px-3 py-2 text-center shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                      <p className="text-[#1a5c38] font-bold text-xs">📍 {area}</p>
                    </div>
                    <div className="w-0.5 h-3 bg-[#1a5c38] opacity-30 mt-1" />
                    <div className="w-2 h-2 rounded-full bg-[#1a5c38]" />
                  </div>
                ))}
              </div>

              {/* Row 4 — South */}
              <div className="flex justify-center gap-4 mb-6">
                {['Chidananda Reddy Layout', 'Niranthara Layout', 'Muneshwar Nagar'].map(area => (
                  <div key={area} className="flex flex-col items-center">
                    <div className="bg-white border-2 border-[#1a5c38] rounded-xl px-3 py-2 text-center shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                      <p className="text-[#1a5c38] font-bold text-xs">📍 {area}</p>
                    </div>
                    <div className="w-0.5 h-3 bg-[#1a5c38] opacity-30 mt-1" />
                    <div className="w-2 h-2 rounded-full bg-[#1a5c38]" />
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#1a5c38] inline-block" /> Active delivery area
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#d4a017] inline-block" /> Farm origin
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Expanding soon — <a href="/waitlist" className="text-[#1a5c38] font-semibold hover:underline">join the priority list</a> to be first in your area.
          </p>
        </div>
      </section>

      {/* Contact */}
<section id="contact" className="bg-[#f5f0e8] px-6 py-12">
<div className="max-w-4xl mx-auto text-center">
        <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Get In Touch</p>
        <h3 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c] mb-5">Contact Us</h3>
        <p className="text-gray-500 mb-10">Have questions? We're always happy to help!</p>
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
          <span className="flex items-center gap-2">📞 <a href="tel:9980166221" className="text-[#1a5c38] font-semibold hover:underline">9980166221</a> <span className="text-gray-400 text-xs">(Mon–Sun, 6AM–8PM)</span></span>
          <span className="flex items-center gap-2">💬 <a href="https://wa.me/919980166221" target="_blank" className="text-[#1a5c38] font-semibold hover:underline">WhatsApp Us</a></span>
          <span className="flex items-center gap-2">✉️ <a href="mailto:hello@srikrishnaadairy.in" className="text-[#1a5c38] font-semibold hover:underline">hello@srikrishnaadairy.in</a></span>
          <span className="flex items-center gap-2">📍 <span>Kattigenahalli, Bangalore, Karnataka</span></span>
        </div>
      </div>
</section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-12 text-center"
        style={{background: 'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
        <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full opacity-10"
          style={{background: 'radial-gradient(circle, #d4a017, transparent)'}}></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-[#d4a017] font-semibold text-sm tracking-widest uppercase mb-3">Get Started Today</p>
          <h3 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white mb-4">
            Start Your Daily Milk<br />Subscription Today
          </h3>
          <p className="text-green-200 text-lg mb-8">
            Join happy families in Kattigenahalli getting fresh, pure milk every day
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
              <p className="text-gray-400 text-sm leading-relaxed">
                Pure, fresh cow milk delivered straight from our farm to your doorstep every day.
              </p>
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
                {products.length > 0 ? products.map(p => (
                  <li key={p.id} className="flex justify-between">
                    <span>Fresh Cow Milk {p.size}</span>
                    <span className="text-[#d4a017] font-semibold">₹{p.price}</span>
                  </li>
                )) : (
                  <>
                    <li className="flex justify-between">
                      <span>Fresh Cow Milk 500ml</span>
                      <span className="text-[#d4a017] font-semibold animate-pulse">—</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Fresh Cow Milk 1000ml</span>
                      <span className="text-[#d4a017] font-semibold animate-pulse">—</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Contact Us</p>
              <ul className="flex flex-col gap-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📞</span>
                  <a href="tel:9980166221" className="hover:text-white transition">9980166221</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">✉️</span>
                  <a href="mailto:hello@srikrishnaadairy.in" className="hover:text-white transition">hello@srikrishnaadairy.in</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📍</span>
                  <span>Kattigenahalli,<br />Bangalore, Karnataka</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">🕐</span>
                  <span>Morning: 7AM – 9AM<br />Evening: 5PM – 7PM</span>
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
            <div className="text-center sm:text-left">
              <p>© 2026 Sri Krishnaa Dairy Farms. All rights reserved.</p>
              <p className="text-gray-600 mt-0.5">FSSAI Lic. No: <span className="text-gray-400">21225008004544</span></p>
            </div>
            <p className="text-gray-600">Made with ❤️ in Bangalore</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/privacy-policy" className="hover:text-gray-300 transition">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-gray-300 transition">Terms of Service</Link>
              <Link href="/refund-policy" className="hover:text-gray-300 transition">Refund Policy</Link>
              <Link href="/health-disclaimer" className="hover:text-gray-300 transition">Health Disclaimer</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}