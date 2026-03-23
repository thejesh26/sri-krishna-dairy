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
      setDiscount(10); setMessage('✅ Discount applied! 10% off')
    } else if (discountCode === 'KRISHNA20') {
      setDiscount(20); setMessage('✅ Discount applied! 20% off')
    } else {
      setDiscount(0); setMessage('❌ Invalid discount code')
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
  const totalDays = subscriptionType === 'oneday' ? 1
    : subscriptionType === 'fixed' && endDate
      ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1)
      : 30

  const firstPayment = dailyPrice + bottleDeposit
  const totalPrice = dailyPrice * totalDays + bottleDeposit

  const handleSubscribe = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!isValidBooking()) {
      setMessage('❌ Please book at least 12 hours in advance!')
      setLoading(false)
      return
    }

    if (subscriptionType === 'fixed' && !endDate) {
      setMessage('❌ Please select an end date!')
      setLoading(false)
      return
    }

    if (subscriptionType === 'fixed' && new Date(endDate) <= new Date(startDate)) {
      setMessage('❌ End date must be after start date!')
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
      setMessage('❌ ' + error.message)
    } else {
      setMessage('✅ ' + (
        subscriptionType === 'oneday'
          ? 'One day delivery booked for ' + new Date(startDate).toLocaleDateString('en-IN')
          : subscriptionType === 'fixed'
            ? 'Subscription activated from ' + new Date(startDate).toLocaleDateString('en-IN') + ' to ' + new Date(endDate).toLocaleDateString('en-IN')
            : 'Ongoing subscription activated from ' + new Date(startDate).toLocaleDateString('en-IN')
      ))
      setTimeout(() => { window.location.href = '/dashboard' }, 2500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-green-50">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-yellow-400" />
          <div>
            <h1 className="text-lg font-extrabold text-green-800">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-gray-400">Subscribe for Daily Milk</p>
          </div>
        </div>
        <a href="/dashboard" className="border-2 border-green-600 text-green-700 font-semibold px-4 py-2 rounded-full text-sm hover:bg-green-50 transition">
          ← Dashboard
        </a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-2xl font-extrabold text-green-800 mb-2 text-center">Milk Subscription 📅</h2>
        <p className="text-center text-gray-400 text-sm mb-6">Fresh milk delivered to your doorstep!</p>

        {/* 12 hour notice */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6 text-center">
          <p className="text-yellow-700 text-sm font-semibold">⏰ Book at least 12 hours in advance</p>
          <p className="text-yellow-600 text-xs mt-1">Orders placed after 8PM will be delivered day after tomorrow</p>
        </div>

        {/* Delivery Address */}
        {profile && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-green-100">
            <p className="text-xs text-gray-400 mb-1">📍 Delivering to</p>
            <p className="font-semibold text-green-800">{profile.apartment_name}, Flat {profile.flat_number}</p>
            <p className="text-sm text-gray-500">{profile.address}</p>
          </div>
        )}

        <form onSubmit={handleSubscribe} className="flex flex-col gap-5">

          {/* Subscription Type */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Subscription Type</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'oneday', icon: '1️⃣', label: 'One Day', sub: 'Try us!' },
                { type: 'fixed', icon: '📆', label: 'Fixed Period', sub: 'Set end date' },
                { type: 'ongoing', icon: '♾️', label: 'Ongoing', sub: 'Until cancelled' },
              ].map(({ type, icon, label, sub }) => (
                <button type="button" key={type}
                  onClick={() => setSubscriptionType(type)}
                  className={`border-2 rounded-xl p-3 text-center transition ${
                    subscriptionType === type ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                  }`}>
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="font-bold text-green-800 text-xs">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Select Product</p>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <button type="button" key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    selectedProduct?.id === product.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                  }`}>
                  <div className="text-3xl mb-1">🥛</div>
                  <p className="font-bold text-green-800 text-sm">{product.size}</p>
                  <p className="text-green-600 font-extrabold">₹{product.price}/day</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Quantity (Bottles per day)</p>
            <div className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="bg-green-100 text-green-700 font-bold h-10 w-10 rounded-full text-xl hover:bg-green-200 transition">−</button>
              <span className="text-3xl font-extrabold text-green-800">{quantity}</span>
              <button type="button" onClick={() => setQuantity(q => q + 1)}
                className="bg-green-100 text-green-700 font-bold h-10 w-10 rounded-full text-xl hover:bg-green-200 transition">+</button>
            </div>
          </div>

          {/* Delivery Slot */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Delivery Slot</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliverySlot('morning')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliverySlot === 'morning' ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
                }`}>
                <div className="text-3xl mb-1">🌅</div>
                <p className="font-bold text-green-800 text-sm">Morning</p>
                <p className="text-xs text-gray-400">5AM – 8AM</p>
              </button>
              <button type="button" onClick={() => setDeliverySlot('evening')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliverySlot === 'evening' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}>
                <div className="text-3xl mb-1">🌆</div>
                <p className="font-bold text-green-800 text-sm">Evening</p>
                <p className="text-xs text-gray-400">5PM – 7PM</p>
              </button>
            </div>
          </div>

          {/* Bottle Delivery Mode */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-1">Bottle Delivery Mode 🍼</p>
            <p className="text-xs text-gray-400 mb-3">Choose how you want to receive your milk</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setDeliveryMode('keep_bottle')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliveryMode === 'keep_bottle' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
                }`}>
                <div className="text-3xl mb-1">🏺</div>
                <p className="font-bold text-green-800 text-sm">Keep Bottle</p>
                <p className="text-xs text-gray-400 mt-1">₹100 deposit/bottle</p>
<p className="text-xs text-gray-400">(min. 2 bottles = ₹200)</p>
                <p className="text-xs text-green-600 font-semibold mt-1">Refundable</p>
              </button>
              <button type="button" onClick={() => setDeliveryMode('direct')}
                className={`border-2 rounded-xl p-4 text-center transition ${
                  deliveryMode === 'direct' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}>
                <div className="text-3xl mb-1">🔄</div>
                <p className="font-bold text-green-800 text-sm">Direct Delivery</p>
                <p className="text-xs text-gray-400 mt-1">Bottle taken back</p>
                <p className="text-xs text-blue-600 font-semibold mt-1">No deposit</p>
              </button>
            </div>

            {/* Deposit info */}
            {deliveryMode === 'keep_bottle' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
                <p className="text-xs text-green-700 font-semibold">
  🍼 Bottle deposit: ₹{BOTTLE_DEPOSIT} × {Math.max(2, quantity)} bottles = ₹{bottleDeposit}
</p>
<p className="text-xs text-green-600 mt-1">Minimum deposit is for 2 bottles (₹200)</p>
                <p className="text-xs text-green-600 mt-1">
                  Fully refundable when bottles are returned in good condition
                </p>
              </div>
            )}
            {deliveryMode === 'direct' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
                <p className="text-xs text-blue-700 font-semibold">
                  🔄 Our delivery person will collect the empty bottle immediately after delivery
                </p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">
              {subscriptionType === 'oneday' ? 'Delivery Date' : 'Start Date'}
            </p>
            <input type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400" />
            {subscriptionType === 'fixed' && (
              <>
                <p className="text-sm font-bold text-green-800 mb-3 mt-4">End Date</p>
                <input type="date" value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400" />
              </>
            )}
          </div>

          {/* Discount Code */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Discount Code</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Enter code" value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400" />
              <button type="button" onClick={applyDiscount}
                className="bg-yellow-400 text-green-900 font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 transition text-sm">
                Apply
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-green-600 text-white rounded-2xl p-5 shadow-lg">
            <p className="text-sm font-semibold text-green-100 mb-3">Payment Summary</p>
            <div className="flex justify-between text-sm mb-1">
              <span>{selectedProduct?.size} x {quantity}/day</span>
              <span>₹{selectedProduct?.price * quantity}/day</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-yellow-300">
                <span>Discount ({discount}%)</span>
                <span>− ₹{Math.round(selectedProduct?.price * quantity * discount / 100)}/day</span>
              </div>
            )}
            {bottleDeposit > 0 && (
              <div className="flex justify-between text-sm mb-1 text-yellow-200">
                <span>🍼 Bottle Deposit (refundable)</span>
                <span>₹{bottleDeposit}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-1">
              <span>Delivery Slot</span>
              <span>{deliverySlot === 'morning' ? '🌅 5-8AM' : '🌆 5-7PM'}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Bottle Mode</span>
              <span>{deliveryMode === 'keep_bottle' ? '🏺 Keep Bottle' : '🔄 Direct Delivery'}</span>
            </div>
            <div className="border-t border-green-500 mt-3 pt-3">
              <div className="flex justify-between font-extrabold text-lg">
                <span>First Day Total</span>
                <span>₹{firstPayment}</span>
              </div>
              <div className="flex justify-between text-sm text-yellow-300 mt-1">
                <span>Daily from Day 2</span>
                <span>₹{dailyPrice}/day</span>
              </div>
              {subscriptionType !== 'ongoing' && (
                <div className="flex justify-between text-sm text-yellow-200 mt-1">
                  <span>{subscriptionType === 'oneday' ? 'One time total' : totalDays + ' days total'}</span>
                  <span>₹{totalPrice}</span>
                </div>
              )}
              {subscriptionType === 'ongoing' && (
                <div className="flex justify-between text-sm text-yellow-200 mt-1">
                  <span>Monthly estimate</span>
                  <span>₹{dailyPrice * 30 + bottleDeposit}</span>
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium ${
              message.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading || !selectedProduct}
            className="bg-green-600 text-white py-4 rounded-full font-extrabold text-lg hover:bg-green-700 transition shadow-lg">
            {loading ? 'Processing...' :
              subscriptionType === 'oneday' ? '🥛 Book One Day Delivery' :
              subscriptionType === 'fixed' ? '📆 Start Fixed Subscription' :
              '♾️ Start Ongoing Subscription'}
          </button>

        </form>
      </div>
    </div>
  )
}