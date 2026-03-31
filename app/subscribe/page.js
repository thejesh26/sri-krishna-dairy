'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Subscribe() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [deliverySlot, setDeliverySlot] = useState('morning')
  const [subscriptionType, setSubscriptionType] = useState('ongoing')
  const [deliveryMode, setDeliveryMode] = useState('keep_bottle')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const BOTTLE_DEPOSIT = 100

  useEffect(() => {
    getUser()
    getProducts()
    const minDate = new Date()
    minDate.setHours(minDate.getHours() + 12)
    setStartDate(minDate.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const user = session.user
    setUser(user)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
  }

  const getProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', true)
    setProducts(data || [])
    if (data && data.length > 0) setSelectedProduct(data[0])
  }

  const applyDiscount = async () => {
    if (!discountCode.trim()) return
    setMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/validate-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ code: discountCode }),
      })
      const result = await res.json()
      setDiscount(result.valid ? result.percent : 0)
      setMessage(result.message)
    } catch {
      setMessage('Could not validate discount code. Please try again.')
    }
  }

  const isValidBooking = () => {
    const now = new Date()
    const selected = new Date(startDate)
    return (selected - now) / (1000 * 60 * 60) >= 12
  }

  const dailyPrice = selectedProduct
    ? Math.round(selectedProduct.price * quantity * (1 - discount / 100))
    : 0

  const bottleDeposit = deliveryMode === 'keep_bottle' ? BOTTLE_DEPOSIT * Math.max(2, quantity) : 0
  const firstPayment = dailyPrice + bottleDeposit

  const totalDays = subscriptionType === 'oneday' ? 1
    : subscriptionType === 'fixed' && endDate
      ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1)
      : 30

  const totalPrice = dailyPrice * totalDays + bottleDeposit

  const handleSubscribe = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!agreedToTerms) {
      setMessage('Please accept the terms and conditions to proceed.')
      setLoading(false)
      return
    }

    if (!isValidBooking()) {
      setMessage('Please book at least 12 hours in advance!')
      setLoading(false)
      return
    }

    if (subscriptionType === 'fixed' && !endDate) {
      setMessage('Please select an end date!')
      setLoading(false)
      return
    }

    if (subscriptionType === 'fixed' && new Date(endDate) <= new Date(startDate)) {
      setMessage('End date must be after start date!')
      setLoading(false)
      return
    }

// Check if active subscription already exists
const { data: existingSub } = await supabase
  .from('subscriptions')
  .select('id')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .single()

if (existingSub) {
  setMessage('You already have an active subscription! Please manage your existing plan first.')
  setLoading(false)
  return
}

    // SECURITY: Subscription created server-side; price/deposit cannot be injected
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        quantity,
        start_date: startDate,
        end_date: endDate || null,
        delivery_slot: deliverySlot,
        subscription_type: subscriptionType,
        delivery_mode: deliveryMode,
        discount_code: discountCode || null,
      }),
    })
    const result = await res.json()

    if (!res.ok) {
      setMessage('Error: ' + (result.error || 'Could not create subscription.'))
    } else {
      router.push('/confirmation?type=subscription')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/dashboard" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh - Pure - Natural</p>
          </div>
        </a>
        <a href="/dashboard" className="border border-[#1a5c38] text-[#1a5c38] font-semibold px-4 py-2 rounded text-sm hover:bg-[#1a5c38] hover:text-white transition">
          Back to Dashboard
        </a>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Page Title */}
        <div className="mb-6">
          <p className="text-[#d4a017] font-semibold text-xs tracking-widest uppercase mb-1">Daily Milk</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Subscribe Now</h2>
          <p className="text-gray-400 text-sm mt-1">Fresh milk delivered to your doorstep every day</p>
        </div>

        {/* 12 hour notice */}
        <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="text-[#d4a017] text-sm font-semibold">Book at least 12 hours in advance</p>
            <p className="text-yellow-600 text-xs mt-0.5">Orders placed after 8PM will be delivered day after tomorrow</p>
          </div>
        </div>

        {/* Delivery Address */}
        {profile && (
          <div className="bg-white rounded-xl p-4 mb-6 border border-[#e8e0d0] shadow-sm flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Delivering to</p>
              <p className="font-semibold text-[#1a5c38]">{profile.apartment_name}, Flat {profile.flat_number}</p>
              <p className="text-sm text-gray-500">{profile.area}, Bangalore</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubscribe} className="flex flex-col gap-5">

          {/* Subscription Type */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Subscription Type</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: 'oneday', icon: '1️⃣', label: 'One Day', sub: 'Try us!' },
                { type: 'fixed', icon: '📆', label: 'Fixed Period', sub: 'Set end date' },
                { type: 'ongoing', icon: '♾️', label: 'Ongoing', sub: 'Until cancelled' },
              ].map(({ type, icon, label, sub }) => (
                <button type="button" key={type}
                  onClick={() => setSubscriptionType(type)}
                  className={`border-2 rounded-xl p-3 text-center transition ${
                    subscriptionType === type
                      ? 'border-[#1a5c38] bg-[#f0faf4]'
                      : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="font-bold text-[#1c1c1c] text-xs">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Select Product</p>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <button type="button" key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    selectedProduct?.id === product.id
                      ? 'border-[#1a5c38] bg-[#f0faf4]'
                      : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                  }`}>
                  <div className="text-3xl mb-2">🥛</div>
                  <p className="font-bold text-[#1c1c1c] text-sm">{product.size}</p>
                  <p className="text-[#1a5c38] font-extrabold">Rs.{product.price}/day</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Quantity (Bottles per day)</p>
            <div className="flex items-center justify-center gap-6">
              <button type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border-2 border-[#e8e0d0] text-[#1a5c38] font-bold text-xl hover:border-[#1a5c38] hover:bg-[#f0faf4] transition">
                -
              </button>
              <span className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#1c1c1c]">{quantity}</span>
              <button type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-10 h-10 rounded-full border-2 border-[#e8e0d0] text-[#1a5c38] font-bold text-xl hover:border-[#1a5c38] hover:bg-[#f0faf4] transition">
                +
              </button>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4 font-[family-name:var(--font-playfair)]">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliverySlot('morning')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliverySlot === 'morning' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                }`}>
                <div className="text-3xl mb-1">🌅</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Morning</p>
                <p className="text-xs text-gray-400">5AM - 8AM</p>
              </button>
              <button type="button" onClick={() => setDeliverySlot('evening')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliverySlot === 'evening' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                }`}>
                <div className="text-3xl mb-1">🌆</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Evening</p>
                <p className="text-xs text-gray-400">5PM - 7PM</p>
              </button>
            </div>
          </div>

          {/* Bottle Delivery Mode */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1 font-[family-name:var(--font-playfair)]">Bottle Delivery Mode</p>
            <p className="text-xs text-gray-400 mb-4">Choose how you want to receive your milk</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliveryMode('keep_bottle')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliveryMode === 'keep_bottle' ? 'border-[#1a5c38] bg-[#f0faf4]' : 'border-[#e8e0d0] hover:border-[#1a5c38]'
                }`}>
                <div className="text-3xl mb-1">🏺</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Keep Bottle</p>
                <p className="text-xs text-gray-400 mt-1">Rs.100/bottle deposit</p>
                <p className="text-xs text-[#1a5c38] font-semibold">Refundable</p>
              </button>
              <button type="button" onClick={() => setDeliveryMode('direct')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliveryMode === 'direct' ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0] hover:border-[#d4a017]'
                }`}>
                <div className="text-3xl mb-1">🔄</div>
                <p className="font-bold text-[#1c1c1c] text-sm">Direct Delivery</p>
                <p className="text-xs text-gray-400 mt-1">Bottle taken back</p>
                <p className="text-xs text-[#d4a017] font-semibold">No deposit</p>
              </button>
            </div>
            {deliveryMode === 'keep_bottle' && (
              <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-lg p-3 mt-3">
                <p className="text-xs text-[#1a5c38] font-semibold">
                  Bottle deposit: Rs.{BOTTLE_DEPOSIT} x {Math.max(2, quantity)} = Rs.{bottleDeposit}
                </p>
                <p className="text-xs text-[#1a5c38] mt-1">Minimum deposit is for 2 bottles (Rs.200). Fully refundable.</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">
              {subscriptionType === 'oneday' ? 'Delivery Date' : 'Start Date'}
            </p>
            <input type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            {subscriptionType === 'fixed' && (
              <>
                <p className="text-sm font-bold text-[#1c1c1c] mb-3 mt-4 font-[family-name:var(--font-playfair)]">End Date</p>
                <input type="date" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
              </>
            )}
          </div>

          {/* Discount Code */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-3 font-[family-name:var(--font-playfair)]">Discount Code</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter code" value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
              <button type="button" onClick={applyDiscount}
                className="bg-[#d4a017] text-white font-bold px-5 py-2 rounded-lg hover:bg-[#b8860b] transition text-sm">
                Apply
              </button>
            </div>
          </div>

          {/* Our Milk Journey */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e8e0d0]">
            <p className="text-sm font-bold text-[#1c1c1c] mb-1 font-[family-name:var(--font-playfair)]">🐄 From Farm to Your Door</p>
            <p className="text-xs text-gray-400 mb-4">How your milk travels before reaching you every day</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {[
                { icon: '🐄', title: 'Milking', desc: 'Cows milked hygienically at 4–6 AM' },
                { icon: '🧪', title: 'Quality Check', desc: 'Tested for freshness, purity & fat content' },
                { icon: '🫧', title: 'Bottle Cleaning', desc: 'Returned bottles washed, sanitized & sterilized' },
                { icon: '🥛', title: 'Filling & Sealing', desc: 'Measured & hygienically sealed in bottles' },
                { icon: '📦', title: 'Packing', desc: 'Labelled & packed in insulated delivery bags' },
                { icon: '🛵', title: 'Route Dispatch', desc: 'Delivery agents dispatched by 5 AM' },
                { icon: '🏠', title: 'Door Delivery', desc: 'Fresh at your doorstep by your chosen slot' },
              ].map(({ icon, title, desc }, i, arr) => (
                <div key={title} className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#f0faf4] border-2 border-[#c8e6d4] flex items-center justify-center text-sm flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-xs">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl p-6 text-white shadow-lg"
            style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
            <p className="text-xs font-semibold text-green-200 uppercase tracking-widest mb-4">Payment Summary</p>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-green-200">{selectedProduct?.size} x {quantity}/day</span>
              <span>Rs.{selectedProduct?.price * quantity}/day</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-2 text-[#d4a017]">
                <span>Discount ({discount}%)</span>
                <span>- Rs.{Math.round(selectedProduct?.price * quantity * discount / 100)}/day</span>
              </div>
            )}
            {bottleDeposit > 0 && (
              <div className="flex justify-between text-sm mb-2 text-yellow-200">
                <span>Bottle Deposit (refundable)</span>
                <span>Rs.{bottleDeposit}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-2 text-green-200">
              <span>Delivery Slot</span>
              <span>{deliverySlot === 'morning' ? '🌅 5-8AM' : '🌆 5-7PM'}</span>
            </div>
            <div className="flex justify-between text-sm mb-2 text-green-200">
              <span>Type</span>
              <span>{subscriptionType === 'oneday' ? '1 Day' : subscriptionType === 'fixed' ? 'Fixed Period' : 'Ongoing'}</span>
            </div>
            <div className="border-t border-green-700 mt-4 pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>First Day Total</span>
                <span>Rs.{firstPayment}</span>
              </div>
              <div className="flex justify-between text-sm text-[#d4a017] mt-1">
                <span>Daily from Day 2</span>
                <span>Rs.{dailyPrice}/day</span>
              </div>
              {subscriptionType === 'ongoing' && (
                <div className="flex justify-between text-sm text-green-300 mt-1">
                  <span>Monthly estimate</span>
                  <span>Rs.{dailyPrice * 30 + bottleDeposit}</span>
                </div>
              )}
              {subscriptionType !== 'ongoing' && (
                <div className="flex justify-between text-sm text-green-300 mt-1">
                  <span>{subscriptionType === 'oneday' ? 'One time' : totalDays + ' days total'}</span>
                  <span>Rs.{totalPrice}</span>
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium ${
              message.includes('activated') || message.includes('booked') || message.includes('Discount')
                ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#1a5c38] cursor-pointer"
              />
              <span className="text-xs text-[#4a4a4a] leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/terms-of-service" target="_blank" className="text-[#1a5c38] font-semibold underline">Terms of Service</Link>,{' '}
                <Link href="/privacy-policy" target="_blank" className="text-[#1a5c38] font-semibold underline">Privacy Policy</Link>,{' '}
                <Link href="/refund-policy" target="_blank" className="text-[#1a5c38] font-semibold underline">Refund Policy</Link>, and{' '}
                <Link href="/health-disclaimer" target="_blank" className="text-[#1a5c38] font-semibold underline">Health Disclaimer</Link>.
                I understand this milk is fresh and minimally processed, and I accept the bottle deposit and subscription cancellation terms.
              </span>
            </label>
          </div>

          <button type="submit" disabled={loading || !selectedProduct || !agreedToTerms}
            className="text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg disabled:opacity-50"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {loading ? 'Processing...' :
              subscriptionType === 'oneday' ? 'Book One Day Delivery' :
              subscriptionType === 'fixed' ? 'Start Fixed Subscription' :
              'Start Ongoing Subscription'}
          </button>

        </form>
      </div>

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
                <li><a href="/dashboard" className="hover:text-[#d4a017] transition">Dashboard</a></li>
                <li><a href="/subscribe" className="hover:text-[#d4a017] transition">Subscribe</a></li>
                <li><a href="/order" className="hover:text-[#d4a017] transition">Order Now</a></li>
                <li><a href="/wallet" className="hover:text-[#d4a017] transition">Wallet</a></li>
                <li><a href="/profile" className="hover:text-[#d4a017] transition">My Profile</a></li>
              </ul>
            </div>

            {/* Explore */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Explore</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="/#how-it-works" className="hover:text-[#d4a017] transition">How It Works</a></li>
                <li><a href="/#why-us" className="hover:text-[#d4a017] transition">Why Choose Us</a></li>
                <li><a href="/#faq" className="hover:text-[#d4a017] transition">FAQ</a></li>
                <li><a href="/#products" className="hover:text-[#d4a017] transition">Our Products</a></li>
                <li><a href="/#contact" className="hover:text-[#d4a017] transition">Contact Us</a></li>
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
            <div className="text-center sm:text-left">
              <p>© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
              <p className="text-gray-600 mt-0.5">FSSAI Lic. No: <span className="text-gray-400">21225008004544</span></p>
            </div>
            <p className="text-gray-600">Made with ❤️ in Bangalore</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/privacy-policy" className="hover:text-gray-300 transition">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-gray-300 transition">Terms of Service</a>
              <a href="/refund-policy" className="hover:text-gray-300 transition">Refund Policy</a>
              <a href="/health-disclaimer" className="hover:text-gray-300 transition">Health Disclaimer</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}