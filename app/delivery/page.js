'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DeliveryDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    out: 0,
    delivered: 0
  })

  useEffect(() => { checkDelivery() }, [])

  const checkDelivery = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (!profile?.is_delivery && !profile?.is_admin) {
      window.location.href = '/'
      return
    }

    setProfile(profile)
    await loadDeliveries(user.id, profile)
    setLoading(false)
  }

  const loadDeliveries = async (userId, profile) => {
    const today = new Date().toLocaleDateString('en-CA')

    // Load today's orders assigned to this agent
    let ordersQuery = supabase
      .from('orders')
      .select('*, products(*), profiles(*)')
      .eq('delivery_date', today)
      .order('delivery_slot', { ascending: true })

    // If not admin, only show assigned orders
    if (!profile?.is_admin) {
      ordersQuery = ordersQuery.eq('assigned_to', userId)
    }

    const { data: allOrders } = await ordersQuery
    setOrders(allOrders || [])

    // Load today's subscriptions assigned to this agent
    let subsQuery = supabase
      .from('subscriptions')
      .select('*, products(*), profiles(*)')
      .eq('is_active', true)
      .order('delivery_slot', { ascending: true })

    if (!profile?.is_admin) {
      subsQuery = subsQuery.eq('assigned_to', userId)
    }

    const { data: allSubs } = await subsQuery
    setSubscriptions(allSubs || [])

    // Calculate stats
    const allDeliveries = [...(allOrders || [])]
    setStats({
      total: allDeliveries.length,
      pending: allDeliveries.filter(o => o.status === 'pending').length,
      out: allDeliveries.filter(o => o.status === 'out_for_delivery').length,
      delivered: allDeliveries.filter(o => o.status === 'delivered').length,
    })
  }

  const updateStatus = async (orderId, status) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
      // Update stats
      const updated = orders.map(o => o.id === orderId ? { ...o, status } : o)
      setStats({
        total: updated.length,
        pending: updated.filter(o => o.status === 'pending').length,
        out: updated.filter(o => o.status === 'out_for_delivery').length,
        delivered: updated.filter(o => o.status === 'delivered').length,
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <div className="text-center">
        <img src="/Logo.jpg" alt="Sri Krishnaa Dairy"
          className="h-20 w-20 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg mb-4" />
        <p className="text-[#1a5c38] font-semibold">Loading deliveries...</p>
      </div>
    </div>
  )

  const filteredOrders = activeTab === 'pending'
    ? orders.filter(o => o.status === 'pending')
    : activeTab === 'out'
    ? orders.filter(o => o.status === 'out_for_delivery')
    : activeTab === 'delivered'
    ? orders.filter(o => o.status === 'delivered')
    : orders

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 rounded-full object-cover border-2 border-[#d4a017]" />
          <div>
            <h1 className="text-sm font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Delivery Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] text-xs font-semibold px-3 py-1 rounded-full">
            🚴 {profile?.full_name?.split(' ')[0]}
          </span>
          <button onClick={handleLogout}
            className="border border-red-200 text-red-400 font-medium px-3 py-1.5 rounded text-xs hover:bg-red-50 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Date & Summary */}
        <div className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden shadow-lg"
          style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #d4a017, transparent)'}}></div>
          <div className="relative z-10">
            <p className="text-green-300 text-xs font-medium uppercase tracking-widest mb-1">Today's Deliveries</p>
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white mb-4">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-white' },
                { label: 'Pending', value: stats.pending, color: 'text-yellow-300' },
                { label: 'Out', value: stats.out, color: 'text-blue-300' },
                { label: 'Done', value: stats.delivered, color: 'text-[#d4a017]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className={`font-[family-name:var(--font-playfair)] text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-green-300 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription Deliveries */}
        {subscriptions.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden mb-5 shadow-sm">
            <div className="px-5 py-4 border-b border-[#f5f0e8] flex items-center justify-between">
              <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">
                Subscription Deliveries
              </h3>
              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1 rounded-full border border-[#f0dfa0]">
                {subscriptions.length} customers
              </span>
            </div>
            {subscriptions.map((sub, index) => (
              <div key={sub.id}
                className={`px-5 py-4 ${index !== subscriptions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {sub.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c] text-sm">{sub.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{sub.profiles?.apartment_name}, Flat {sub.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{sub.profiles?.area}</p>
                    {sub.profiles?.landmark && (
                      <p className="text-xs text-[#d4a017]">📍 Near: {sub.profiles?.landmark}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs px-2 py-0.5 rounded-full">
                        {sub.products?.size} x {sub.quantity}
                      </span>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full">
                        {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={`tel:${sub.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    <a href={`https://wa.me/91${sub.profiles?.phone}`} target="_blank"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition text-center">
                      💬 WA
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Tabs */}
        <div className="flex gap-2 mb-4 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'out', label: 'Out', count: stats.out },
            { id: 'delivered', label: 'Delivered', count: stats.delivered },
          ].map(({ id, label, count }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#1a5c38] text-white shadow'
                  : 'text-gray-500 hover:text-[#1a5c38]'
              }`}>
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === id ? 'bg-white text-[#1a5c38]' : 'bg-gray-100'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
          {filteredOrders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-5xl mb-3">
                {activeTab === 'delivered' ? '🎉' : '📭'}
              </div>
              <p className="text-gray-400 text-sm">
                {activeTab === 'delivered' ? 'No deliveries completed yet' :
                 activeTab === 'pending' ? 'No pending deliveries!' :
                 activeTab === 'out' ? 'No deliveries out yet' :
                 'No orders for today'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order, index) => (
              <div key={order.id}
                className={`px-5 py-4 ${index !== filteredOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {order.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c] text-sm">{order.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{order.profiles?.apartment_name}, Flat {order.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{order.profiles?.area}</p>
                    {order.profiles?.landmark && (
                      <p className="text-xs text-[#d4a017]">📍 Near: {order.profiles?.landmark}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs px-2 py-0.5 rounded-full">
                        {order.products?.size} x {order.quantity}
                      </span>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full">
                        {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </span>
                      <span className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                        COD ₹{order.total_price}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <a href={`tel:${order.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    <a href={`https://wa.me/91${order.profiles?.phone}`} target="_blank"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition text-center">
                      💬 WA
                    </a>
                  </div>
                </div>

                {/* Status Buttons */}
                <div className="flex gap-2 mt-3 ml-13">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(order.id, 'out_for_delivery')}
                      className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded-lg hover:bg-blue-100 transition">
                      🚴 Out for Delivery
                    </button>
                  )}
                  {(order.status === 'pending' || order.status === 'out_for_delivery') && (
                    <button
                      onClick={() => updateStatus(order.id, 'delivered')}
                      className="flex-1 text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition"
                      style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                      ✅ Mark Delivered
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <span className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded-lg text-center">
                      🚴 Out for Delivery
                    </span>
                  )}
                  {order.status === 'delivered' && (
                    <span className="flex-1 bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] text-xs font-bold py-2 rounded-lg text-center">
                      ✅ Delivered
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}