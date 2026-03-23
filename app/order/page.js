'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Order() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getUser()
    getProducts()
    // Set default delivery date to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDeliveryDate(tomorrow.toISOString().split('T')[0])
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
      setDiscount(10)
      setMessage('✅ Discount applied! 10% off')
    } else if (discountCode === 'KRISHNA20') {
      setDiscount(20)
      setMessage('✅ Discount applied! 20% off')
    } else {
      setDiscount(0)
      setMessage('❌ Invalid discount code')
    }
  }

  const totalPrice = selectedProduct
    ? Math.round(selectedProduct.price * quantity * (1 - discount / 100))
    : 0

  const handleOrder = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.from('orders').insert({
      user_id: user.id,
      product_id: selectedProduct.id,
      quantity,
      total_price: totalPrice,
      delivery_date: deliveryDate,
      status: 'pending',
      payment_method: 'COD'
    })

    if (error) {
      setMessage('❌ ' + error.message)
    } else {
      setMessage('✅ Order placed successfully! We will deliver tomorrow morning.')
      setQuantity(1)
      setDiscount(0)
      setDiscountCode('')
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
            <p className="text-xs text-gray-400">Place Your Order</p>
          </div>
        </div>
        <a href="/dashboard" className="border-2 border-green-600 text-green-700 font-semibold px-4 py-2 rounded-full text-sm hover:bg-green-50 transition">
          ← Dashboard
        </a>
      </header>

      <div className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-2xl font-extrabold text-green-800 mb-6 text-center">Place Your Order 🥛</h2>

        {/* Delivery Address */}
        {profile && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 border border-green-100">
            <p className="text-xs text-gray-400 mb-1">📍 Delivering to</p>
            <p className="font-semibold text-green-800">{profile.apartment_name}, Flat {profile.flat_number}</p>
            <p className="text-sm text-gray-500">{profile.address}</p>
          </div>
        )}

        <form onSubmit={handleOrder} className="flex flex-col gap-5">

          {/* Product Selection */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Select Product</p>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <button type="button" key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`border-2 rounded-xl p-4 text-center transition ${
                    selectedProduct?.id === product.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}>
                  <div className="text-3xl mb-1">🥛</div>
                  <p className="font-bold text-green-800 text-sm">{product.size}</p>
                  <p className="text-green-600 font-extrabold">₹{product.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Quantity (Bottles)</p>
            <div className="flex items-center justify-center gap-4">
              <button type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="bg-green-100 text-green-700 font-bold h-10 w-10 rounded-full text-xl hover:bg-green-200 transition">
                −
              </button>
              <span className="text-3xl font-extrabold text-green-800">{quantity}</span>
              <button type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="bg-green-100 text-green-700 font-bold h-10 w-10 rounded-full text-xl hover:bg-green-200 transition">
                +
              </button>
            </div>
          </div>

          {/* Delivery Date */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
            <p className="text-sm font-bold text-green-800 mb-3">Delivery Date</p>
            <input type="date" value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400" />
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

          {/* Order Summary */}
          <div className="bg-green-600 text-white rounded-2xl p-5 shadow-lg">
            <p className="text-sm font-semibold text-green-100 mb-3">Order Summary</p>
            <div className="flex justify-between text-sm mb-1">
              <span>{selectedProduct?.size} x {quantity}</span>
              <span>₹{selectedProduct?.price * quantity}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm mb-1 text-yellow-300">
                <span>Discount ({discount}%)</span>
                <span>− ₹{Math.round(selectedProduct?.price * quantity * discount / 100)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm mb-1">
              <span>Payment</span>
              <span>Cash on Delivery</span>
            </div>
            <div className="border-t border-green-500 mt-3 pt-3 flex justify-between font-extrabold text-lg">
              <span>Total</span>
              <span>₹{totalPrice}</span>
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
            {loading ? 'Placing Order...' : '🥛 Place Order (COD)'}
          </button>

        </form>
      </div>
    </div>
  )
}