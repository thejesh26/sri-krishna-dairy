'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Subscribe() {
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

  const BOTTLE_DEPOSIT = 100

  useEffect(() => {
    getUser()
    getProducts()
    const minDate = new Date()
    minDate.setHours(minDate.getHours() + 12)
    setStartDate(minDate.toISOString().split('T')[0])
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
  }

  const getProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_available', true)
    setProducts(data || [])
    if (data && data.length > 0) setSelectedProduct(data[0])
  }

  const applyDiscount = () => {
    if (discountCode === 'NEWMILK10') {
      setDiscount(10); setMessage('Discount applied! 10% off')
    } else if (discountCode === 'KRISHNA20') {
      setDiscount(20); setMessage('Discount applied! 20% off')
    } else {
      setDiscount(0); setMessage('Invalid discount code')
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

const { error } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      product_id: selectedProduct.id,
      quantity,
      start_date: startDate,
      end_date: subscriptionType === 'oneday' ? startDate : subscriptionType === 'fixed' ? endDate : null,
      delivery_slot: deliverySlot,
      subscription_type: subscriptionType,
      delivery_mode: deliveryMode,
      bottle_deposit: bottleDeposit,
      is_active: true,
      paused_dates: []
    })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      window.location.href = '/confirmation?type=subscription'
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

          <button type="submit" disabled={loading || !selectedProduct}
            className="text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {loading ? 'Processing...' :
              subscriptionType === 'oneday' ? 'Book One Day Delivery' :
              subscriptionType === 'fixed' ? 'Start Fixed Subscription' :
              'Start Ongoing Subscription'}
          </button>

        </form>
      </div>
    </div>
  )
}