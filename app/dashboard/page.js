'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    setUser(user)

    const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
console.log('Profile data:', profile)
console.log('Profile error:', profileError)
setProfile(profile)

    const { data: orders } = await supabase
      .from('orders')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setOrders(orders || [])

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
    setSubscriptions(subscriptions || [])

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-green-600 font-bold text-xl">Loading... 🥛</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-green-50">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-yellow-400" />
          <div>
            <h1 className="text-lg font-extrabold text-green-800">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-gray-400">Welcome, {profile?.full_name || 'Customer'}! 👋</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="border-2 border-red-400 text-red-500 font-semibold px-4 py-2 rounded-full text-sm hover:bg-red-50 transition">
          Logout
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Welcome Card */}
        <div className="bg-green-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-2xl font-extrabold mb-1">Good Morning, {profile?.full_name?.split(' ')[0]}! ☀️</h2>
          <p className="text-green-100 text-sm">{profile?.apartment_name}, Flat {profile?.flat_number}</p>
          <p className="text-green-100 text-sm mt-1">📞 {profile?.phone}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <a href="/order" className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">🛒</div>
            <p className="text-sm font-semibold text-green-800">Order Now</p>
          </a>
          <a href="/subscribe" className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm font-semibold text-green-800">Subscribe</p>
          </a>
          <a href="/wallet" className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">💰</div>
            <p className="text-sm font-semibold text-green-800">Wallet</p>
          </a>
          <a href="/profile" className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm font-semibold text-green-800">Profile</p>
          </a>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">📅 Active Subscriptions</h3>
          {subscriptions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">No active subscriptions yet</p>
              <a href="/subscribe" className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition">
                Subscribe Now
              </a>
            </div>
          ) : (
            subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between border border-green-100 rounded-xl p-4 mb-3">
                <div>
                  <p className="font-semibold text-green-800">{sub.products?.name} — {sub.products?.size}</p>
                  <p className="text-sm text-gray-400">Qty: {sub.quantity} bottles/day</p>
                  <p className="text-sm text-gray-400">Started: {new Date(sub.start_date).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">Active ✅</span>
                  <p className="text-sm font-bold text-green-700 mt-2">₹{sub.products?.price * sub.quantity}/day</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-green-800 mb-4">📦 Recent Orders</h3>
          {orders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">No orders yet</p>
              <a href="/order" className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition">
                Order Now
              </a>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-4 mb-3">
                <div>
                  <p className="font-semibold text-green-800">{order.products?.name} — {order.products?.size}</p>
                  <p className="text-sm text-gray-400">Qty: {order.quantity} bottles</p>
                  <p className="text-sm text-gray-400">Date: {new Date(order.delivery_date).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status === 'delivered' ? 'Delivered ✅' :
                     order.status === 'pending' ? 'Pending ⏳' : order.status}
                  </span>
                  <p className="text-sm font-bold text-green-700 mt-2">₹{order.total_price}</p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}