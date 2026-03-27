'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [customers, setCustomers] = useState([])
  const [todayOrders, setTodayOrders] = useState([])
  const [todaySubscriptions, setTodaySubscriptions] = useState([])
  const [subDeliveryStatuses, setSubDeliveryStatuses] = useState({})
  const [deliveryAgents, setDeliveryAgents] = useState([])
const [assigningOrder, setAssigningOrder] = useState(null)
  const [wallets, setWallets] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [walletAmount, setWalletAmount] = useState('')
  const [walletNote, setWalletNote] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletMessage, setWalletMessage] = useState('')
  const [deductionLoading, setDeductionLoading] = useState(false)
  const [deductionResult, setDeductionResult] = useState(null)
  const [products, setProducts] = useState([])
  const [editingProduct, setEditingProduct] = useState(null)
  const [productSaving, setProductSaving] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSubscriptions: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return 
    }
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      window.location.href = '/'
      return
    }

    if (!profile.is_admin) {
      window.location.href = '/'
      return
    }

    setProfile(profile)
    await loadAllData()
    setLoading(false)
  }

  const loadAllData = async () => {
    const today = new Date().toLocaleDateString('en-CA') // Returns YYYY-MM-DD in local timezone

    // Load all orders with profiles
    const { data: allOrders } = await supabase
      .from('orders')
      .select(`
        *,
        products(*),
        profiles(*)
      `)
      .order('created_at', { ascending: false })
    setOrders(allOrders || [])

    // Today's orders
    const todayO = (allOrders || []).filter(o => o.delivery_date === today)
    setTodayOrders(todayO)

    // Load all subscriptions with profiles
    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select(`
        *,
        products(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Fetch profiles separately for subscriptions
    if (allSubs && allSubs.length > 0) {
      const userIds = allSubs.map(s => s.user_id)
      const { data: subProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
      
      allSubs.forEach(sub => {
        sub.profiles = subProfiles?.find(p => p.id === sub.user_id) || null
      })
    }
    
    setSubscriptions(allSubs || [])

    // Today's active subscription deliveries
    const todaySubs = (allSubs || []).filter(sub =>
      sub.start_date <= today &&
      (!sub.end_date || sub.end_date >= today) &&
      !(sub.paused_dates || []).includes(today)
    )
    setTodaySubscriptions(todaySubs)

    // Load products
    const { data: allProducts } = await supabase.from('products').select('*').order('size')
    setProducts(allProducts || [])

    // Load all customers
    const { data: allCustomers } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setCustomers((allCustomers || []).filter(c => !c.is_admin))

    // Calculate stats
    const todayRevenue = todayO.reduce((sum, o) => sum + (o.total_price || 0), 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthOrders = (allOrders || []).filter(o =>
      new Date(o.created_at) >= monthStart
    )
    const monthlyRevenue = monthOrders.reduce((sum, o) => sum + (o.total_price || 0), 0)

    // Load all wallets
    const { data: allWallets } = await supabase
  .from('wallet')
  .select('*')
setWallets(allWallets || [])
    setStats({
      totalOrders: allOrders?.length || 0,
      totalSubscriptions: allSubs?.length || 0,
      totalCustomers: (allCustomers || []).filter(c => !c.is_admin).length,
      todayRevenue,
      monthlyRevenue,
    })
  }

  const saveProductPrice = async (productId, newPrice, newAvailable) => {
    setProductSaving(true)
    const { error } = await supabase
      .from('products')
      .update({ price: parseFloat(newPrice), is_available: newAvailable })
      .eq('id', productId)
    if (!error) {
      setProducts(products.map(p => p.id === productId ? { ...p, price: parseFloat(newPrice), is_available: newAvailable } : p))
      setEditingProduct(null)
    }
    setProductSaving(false)
  }

  const runDailyDeductions = async () => {
    setDeductionLoading(true)
    setDeductionResult(null)

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('*, products(*)')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)

    const eligible = (activeSubs || []).filter(sub =>
      sub.products && !(sub.paused_dates || []).includes(today)
    )

    let deducted = 0
    let skipped = 0
    const failedUsers = []

    for (const sub of eligible) {
      const dailyAmount = sub.products.price * sub.quantity
      const description = `Daily subscription ${sub.id} [${today}]`

      // Skip if already deducted today for this subscription
      const { data: existing } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('description', description)
        .limit(1)

      if (existing?.length > 0) { skipped++; continue }

      const { data: wallet } = await supabase
        .from('wallet')
        .select('id, balance')
        .eq('user_id', sub.user_id)
        .maybeSingle()

      const balance = wallet?.balance || 0

      if (balance < dailyAmount) {
        failedUsers.push({ userId: sub.user_id, balance, required: dailyAmount })
        continue
      }

      if (wallet) {
        await supabase.from('wallet').update({ balance: balance - dailyAmount }).eq('user_id', sub.user_id)
      } else {
        await supabase.from('wallet').insert({ user_id: sub.user_id, balance: 0 - dailyAmount })
      }

      await supabase.from('wallet_transactions').insert({
        user_id: sub.user_id,
        amount: dailyAmount,
        type: 'debit',
        description,
      })

      deducted++
    }

    // Refresh wallet balances shown in the panel
    const { data: freshWallets } = await supabase.from('wallet').select('*')
    setWallets(freshWallets || [])

    setDeductionResult({
      date: today,
      total: eligible.length,
      deducted,
      skipped,
      failed: failedUsers.length,
      failedUsers,
    })
    setDeductionLoading(false)
  }

  const updateOrderStatus = async (orderId, status) => {
    const { error } = await supabase
      .from('orders').update({ status }).eq('id', orderId)
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
      setTodayOrders(todayOrders.map(o => o.id === orderId ? { ...o, status } : o))
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
        <p className="text-[#1a5c38] font-semibold font-[family-name:var(--font-playfair)]">Loading Admin Panel...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f0e8]">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/admin" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017]" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-red-500 font-semibold tracking-widest uppercase">Admin Panel</p>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <span className="bg-red-50 text-red-500 border border-red-200 text-xs font-semibold px-3 py-1 rounded-full">
            Admin
          </span>
          <button onClick={handleLogout}
            className="border border-red-200 text-red-400 font-medium px-4 py-2 rounded-full text-sm hover:bg-red-50 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1c1c1c]">Admin Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Today's Revenue", value: 'Rs.' + stats.todayRevenue, icon: '💰', color: '#f0faf4', border: '#c8e6d4' },
            { label: 'Monthly Revenue', value: 'Rs.' + stats.monthlyRevenue, icon: '📈', color: '#fdf6e3', border: '#f0dfa0' },
            { label: 'Active Subscriptions', value: stats.totalSubscriptions, icon: '📅', color: '#f0faf4', border: '#c8e6d4' },
            { label: 'Total Orders', value: stats.totalOrders, icon: '📦', color: '#fdf6e3', border: '#f0dfa0' },
            { label: 'Total Customers', value: stats.totalCustomers, icon: '👥', color: '#f0faf4', border: '#c8e6d4' },
          ].map(({ label, value, icon, color, border }) => (
            <div key={label} className="rounded-2xl p-5 border shadow-sm"
              style={{background: color, borderColor: border}}>
              <div className="text-2xl mb-2">{icon}</div>
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c]">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
    { id: 'overview', label: "Today's Deliveries", icon: '🚴' },
    { id: 'orders', label: 'All Orders', icon: '📦' },
    { id: 'subscriptions', label: 'Subscriptions', icon: '📅' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'wallet', label: 'Wallet', icon: '💰' },
    { id: 'delivery', label: 'Delivery Agents', icon: '🚴' },
    { id: 'products', label: 'Products & Pricing', icon: '🥛' },
  ].map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#1a5c38] text-white shadow'
                  : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#f0faf4]'
              }`}>
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Today's Deliveries Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">
                  Today's Deliveries
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{todayOrders.length + todaySubscriptions.length} deliveries today ({todaySubscriptions.length} subscriptions, {todayOrders.length} one-time)</p>
              </div>
              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1.5 rounded-full border border-[#f0dfa0]">
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {todayOrders.length === 0 && todaySubscriptions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-gray-400">No deliveries scheduled for today</p>
              </div>
            ) : (
              <div>
                {/* Subscription deliveries */}
                {todaySubscriptions.map((sub) => (
                  <div key={sub.id}
                    className={`px-6 py-5 flex items-center gap-4 border-b border-[#f5f0e8]`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center text-2xl flex-shrink-0">🥛</div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                      <p className="text-sm text-gray-400">{sub.profiles?.apartment_name}, Flat {sub.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub.profiles?.area} • 📞 {sub.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-1">
                        {sub.products?.size} x {sub.quantity} • {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#1a5c38] mb-2">Rs.{(sub.products?.price || 0) * sub.quantity}</p>
                      <select
                        value={subDeliveryStatuses[sub.id] || 'pending'}
                        onChange={(e) => setSubDeliveryStatuses(prev => ({ ...prev, [sub.id]: e.target.value }))}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${
                          subDeliveryStatuses[sub.id] === 'delivered'
                            ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                            : subDeliveryStatuses[sub.id] === 'out_for_delivery'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : subDeliveryStatuses[sub.id] === 'missed'
                            ? 'bg-red-50 text-red-500 border-red-200'
                            : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                        }`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="missed">Missed</option>
                      </select>
                    </div>
                  </div>
                ))}
                {/* One-time orders */}
                {todayOrders.map((order, index) => (
                  <div key={order.id}
                    className={`px-6 py-5 flex items-center gap-4 ${index !== todayOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-2xl flex-shrink-0">🛒</div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c]">{order.profiles?.full_name}</p>
                      <p className="text-sm text-gray-400">{order.profiles?.apartment_name}, Flat {order.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.profiles?.area} • 📞 {order.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-1">
                        {order.products?.size} x {order.quantity} • {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#1a5c38] mb-2">Rs.{order.total_price}</p>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${
                          order.status === 'delivered'
                            ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                            : order.status === 'pending'
                            ? 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#f5f0e8]">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">All Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">{orders.length} total orders</p>
            </div>
            {orders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">📦</div>
                <p className="text-gray-400">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f0e8] text-xs uppercase tracking-widest text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left">Customer</th>
                      <th className="px-6 py-3 text-left">Product</th>
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Slot</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => (
                      <tr key={order.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]'}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#1c1c1c]">{order.profiles?.full_name}</p>
                          <p className="text-xs text-gray-400">{order.profiles?.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[#1c1c1c]">{order.products?.size}</p>
                          <p className="text-xs text-gray-400">x{order.quantity}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#1a5c38]">Rs.{order.total_price}</td>
                        <td className="px-6 py-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${
                              order.status === 'delivered'
                                ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                                : order.status === 'pending'
                                ? 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                            <option value="pending">Pending</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {todaySubscriptions.map((sub, index) => (
                      <tr key={'sub-' + sub.id} className={orders.length % 2 === 0 && index % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]'}>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                          <p className="text-xs text-gray-400">{sub.profiles?.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[#1c1c1c]">{sub.products?.size}</p>
                          <p className="text-xs text-gray-400">x{sub.quantity}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          Today <span className="text-xs bg-[#f0faf4] text-[#1a5c38] px-1.5 py-0.5 rounded-full border border-[#c8e6d4] ml-1">📅 Sub</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        </td>
                        <td className="px-6 py-4 font-bold text-[#1a5c38]">Rs.{(sub.products?.price || 0) * sub.quantity}</td>
                        <td className="px-6 py-4">
                          <select
                            value={subDeliveryStatuses[sub.id] || 'pending'}
                            onChange={(e) => setSubDeliveryStatuses(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${
                              subDeliveryStatuses[sub.id] === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                              : subDeliveryStatuses[sub.id] === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : subDeliveryStatuses[sub.id] === 'missed' ? 'bg-red-50 text-red-500 border-red-200'
                              : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                            }`}>
                            <option value="pending">Pending</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="missed">Missed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#f5f0e8]">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Active Subscriptions</h3>
              <p className="text-xs text-gray-400 mt-0.5">{subscriptions.length} active plans</p>
            </div>
            {subscriptions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">📅</div>
                <p className="text-gray-400">No active subscriptions</p>
              </div>
            ) : (
              <div>
                {subscriptions.map((sub, index) => (
                  <div key={sub.id}
                    className={`px-6 py-5 flex items-center gap-4 ${index !== subscriptions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-2xl flex-shrink-0">🥛</div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                      <p className="text-sm text-gray-400">{sub.profiles?.area}, {sub.profiles?.apartment_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">📞 {sub.profiles?.phone}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-medium px-2 py-0.5 rounded-full border border-[#c8e6d4]">
                          {sub.products?.size} x {sub.quantity}/day
                        </span>
                        <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                          {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        </span>
                        <span className="bg-[#f5f0e8] text-[#1c1c1c] text-xs font-medium px-2 py-0.5 rounded-full">
                          {sub.subscription_type === 'ongoing' ? 'Ongoing' : sub.subscription_type === 'fixed' ? 'Fixed' : '1 Day'}
                        </span>
                        {sub.paused_dates?.length > 0 && (
                          <span className="bg-yellow-50 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-200">
                            {sub.paused_dates.length} paused
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#1a5c38]">Rs.{sub.products?.price * sub.quantity}/day</p>
                      <p className="text-xs text-gray-400 mt-1">Since {new Date(sub.start_date).toLocaleDateString('en-IN')}</p>
                      {sub.bottle_deposit > 0 && (
                        <p className="text-xs text-[#d4a017] mt-1">Deposit: Rs.{sub.bottle_deposit}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-[#f5f0e8]">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">All Customers</h3>
              <p className="text-xs text-gray-400 mt-0.5">{customers.length} registered customers</p>
            </div>
            {customers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-gray-400">No customers yet</p>
              </div>
            ) : (
              <div>
                {customers.map((customer, index) => (
                  <div key={customer.id}
                    className={`px-6 py-5 flex items-center gap-4 ${index !== customers.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {customer.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c]">{customer.full_name}</p>
                      <p className="text-sm text-gray-400">📞 {customer.phone}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {customer.area} • {customer.apartment_name}, Flat {customer.flat_number}
                      </p>
                      {customer.landmark && (
                        <p className="text-xs text-gray-400">Near: {customer.landmark}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Joined</p>
                      <p className="text-xs font-semibold text-[#1c1c1c]">
                        {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <a href={'https://wa.me/91' + customer.phone} target="_blank"
                        className="mt-2 flex items-center gap-1 text-xs text-[#25D366] font-semibold hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3 h-3" fill="#25D366">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    )}

{/* Wallet Tab */}
{activeTab === 'wallet' && (
  <div className="flex flex-col gap-6">

  {/* Daily Auto-Deduction */}
  <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
    <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Daily Auto-Deduction</h3>
        <p className="text-xs text-gray-400 mt-0.5">Deduct today&apos;s subscription charges from customer wallets</p>
      </div>
      <button
        onClick={runDailyDeductions}
        disabled={deductionLoading}
        className="text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow text-sm disabled:opacity-60"
        style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
        {deductionLoading ? 'Running...' : 'Run Today\'s Deductions'}
      </button>
    </div>
    {deductionResult && (
      <div className="px-6 pb-5 border-t border-[#f5f0e8] pt-4">
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div className="bg-[#f0faf4] rounded-xl p-3">
            <p className="text-2xl font-bold text-[#1a5c38]">{deductionResult.deducted}</p>
            <p className="text-xs text-gray-500 mt-0.5">Deducted</p>
          </div>
          <div className="bg-[#fdfbf7] rounded-xl p-3">
            <p className="text-2xl font-bold text-gray-400">{deductionResult.skipped}</p>
            <p className="text-xs text-gray-500 mt-0.5">Already done</p>
          </div>
          <div className={`rounded-xl p-3 ${deductionResult.failed > 0 ? 'bg-red-50' : 'bg-[#fdfbf7]'}`}>
            <p className={`text-2xl font-bold ${deductionResult.failed > 0 ? 'text-red-500' : 'text-gray-400'}`}>{deductionResult.failed}</p>
            <p className="text-xs text-gray-500 mt-0.5">Low balance</p>
          </div>
        </div>
        {deductionResult.failed > 0 && (
          <p className="text-xs text-red-500 text-center mb-1">
            {deductionResult.failed} customer{deductionResult.failed > 1 ? 's' : ''} have insufficient wallet balance — please top up their wallets.
          </p>
        )}
        <p className="text-xs text-gray-400 text-center">
          {deductionResult.date} &middot; {deductionResult.total} active subscription{deductionResult.total !== 1 ? 's' : ''}
        </p>
      </div>
    )}
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

    {/* Customer Wallet List */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customer Wallets</h3>
        <p className="text-xs text-gray-400 mt-0.5">Click customer to add balance</p>
      </div>
      {customers.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-400">No customers yet</p>
        </div>
      ) : (
        customers.map((customer, index) => {
          const customerWallet = wallets.find(w => w.user_id === customer.id)
          return (
            <div key={customer.id}
              onClick={() => { setSelectedCustomer(customer); setWalletMessage('') }}
              className={`px-6 py-4 flex items-center justify-between cursor-pointer transition ${
                selectedCustomer?.id === customer.id
                  ? 'bg-[#f0faf4] border-l-4 border-[#1a5c38]'
                  : 'hover:bg-[#fdfbf7]'
              } ${index !== customers.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {customer.full_name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-semibold text-[#1c1c1c] text-sm">{customer.full_name}</p>
                  <p className="text-xs text-gray-400">{customer.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1a5c38]">Rs.{customerWallet?.balance || 0}</p>
                <p className="text-xs text-gray-400">balance</p>
              </div>
            </div>
          )
        })
      )}
    </div>

    {/* Add Balance Form */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Add / Deduct Balance</h3>
      </div>
      <div className="px-6 py-5">
        {!selectedCustomer ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👆</div>
            <p className="text-gray-400 text-sm">Select a customer from the left to manage their wallet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-[#f5f0e8] rounded-xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg">
                {selectedCustomer.full_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-[#1c1c1c]">{selectedCustomer.full_name}</p>
                <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                <p className="text-sm font-bold text-[#1a5c38]">
                  Current Balance: Rs.{wallets.find(w => w.user_id === selectedCustomer.id)?.balance || 0}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Amount (Rs.)</label>
              <input type="number" placeholder="Enter amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Note</label>
              <input type="text" placeholder="Eg: Monthly recharge, Bonus credit"
                value={walletNote}
                onChange={(e) => setWalletNote(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>

            {walletMessage && (
              <div className={`rounded-lg px-4 py-3 text-sm text-center font-medium ${
                walletMessage.includes('Error') || walletMessage.includes('Insufficient') || walletMessage.includes('Please')
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
              }`}>
                {walletMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  if (!walletAmount || walletAmount <= 0) { setWalletMessage('Please enter a valid amount!'); return }
                  setWalletLoading(true)
                  setWalletMessage('')
                  const customerWallet = wallets.find(w => w.user_id === selectedCustomer.id)
                  const newBalance = (customerWallet?.balance || 0) + parseFloat(walletAmount)

                  if (customerWallet) {
                    await supabase.from('wallet').update({ balance: newBalance }).eq('user_id', selectedCustomer.id)
                  } else {
                    await supabase.from('wallet').insert({ user_id: selectedCustomer.id, balance: newBalance })
                  }

                  await supabase.from('wallet_transactions').insert({
                    user_id: selectedCustomer.id,
                    amount: parseFloat(walletAmount),
                    type: 'credit',
                    description: walletNote || 'Added by admin'
                  })
                  
                  const { data: freshWallets } = await supabase.from('wallet').select('*')
                  setWallets(freshWallets || [])
                  setWalletAmount('')
                  setWalletNote('')
                  setWalletMessage('Rs.' + walletAmount + ' added successfully!')
                  setWalletLoading(false)
                }}
                disabled={walletLoading}
                className="text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow text-sm"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                + Add Balance
              </button>
              <button
                onClick={async () => {
                  if (!walletAmount || walletAmount <= 0) { setWalletMessage('Please enter a valid amount!'); return }
                  const customerWallet = wallets.find(w => w.user_id === selectedCustomer.id)
                  if ((customerWallet?.balance || 0) < parseFloat(walletAmount)) {
                    setWalletMessage('Insufficient balance!')
                    return
                  }
                  setWalletLoading(true)
                  setWalletMessage('')
                  const newBalance = (customerWallet?.balance || 0) - parseFloat(walletAmount)
                  await supabase.from('wallet').update({ balance: newBalance }).eq('user_id', selectedCustomer.id)
                  await supabase.from('wallet_transactions').insert({
                    user_id: selectedCustomer.id,
                    amount: parseFloat(walletAmount),
                    type: 'debit',
                    description: walletNote || 'Deducted by admin'
                  })
                  const { data: freshWallets } = await supabase.from('wallet').select('*')
                  setWallets(freshWallets || [])
                  setWalletAmount('')
                  setWalletNote('')
                  setWalletMessage('Rs.' + walletAmount + ' deducted successfully!')
                  setWalletLoading(false)
                }}
                disabled={walletLoading}
                className="border-2 border-red-300 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition text-sm">
                - Deduct
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  </div>
)}

{/* Delivery Agents Tab */}
{activeTab === 'delivery' && (
  <div className="flex flex-col gap-6">

    {/* Delivery Agents List */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">
        Delivery Agents
      </h3>
      {deliveryAgents.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🚴</div>
          <p className="text-gray-400 text-sm mb-2">No delivery agents yet</p>
          <p className="text-gray-400 text-xs">Promote a customer to delivery agent below</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {deliveryAgents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between border border-[#e8e0d0] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold">
                  {agent.full_name?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-[#1c1c1c]">{agent.full_name}</p>
                  <p className="text-sm text-gray-400">{agent.phone}</p>
                  <p className="text-xs text-[#d4a017]">{agent.area}</p>
                </div>
              </div>
              <button
  onClick={async () => {
    await supabase.from('profiles')
      .update({ is_delivery: false })
      .eq('id', agent.id)
    setDeliveryAgents(deliveryAgents.filter(a => a.id !== agent.id))
  }}
  className="text-xs border border-red-300 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition font-semibold">
  Remove
</button>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Assign Today's Orders */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">
          Assign Today's Orders
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">Assign orders to delivery agents</p>
      </div>
      {orders.filter(o => o.delivery_date === new Date().toLocaleDateString('en-CA')).length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-400">No orders for today</p>
        </div>
      ) : (
        <div>
          {orders
            .filter(o => o.delivery_date === new Date().toLocaleDateString('en-CA'))
            .map((order, index) => (
            <div key={order.id}
              className={`px-6 py-4 flex items-center gap-4 ${index !== orders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-2xl flex-shrink-0">🥛</div>
              <div className="flex-1">
                <p className="font-semibold text-[#1c1c1c]">{order.profiles?.full_name}</p>
                <p className="text-sm text-gray-400">{order.profiles?.apartment_name}, {order.profiles?.area}</p>
                <p className="text-xs text-gray-400">{order.products?.size} x {order.quantity} • {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</p>
              </div>
              <div className="flex-shrink-0">
                {deliveryAgents.length === 0 ? (
                  <span className="text-xs text-gray-400 border border-[#e8e0d0] px-3 py-1.5 rounded-lg">No agents</span>
                ) : (
                  <select
                    value={order.assigned_to || ''}
                    onChange={async (e) => {
                      const agentId = e.target.value
                      await supabase.from('orders')
                        .update({ assigned_to: agentId || null })
                        .eq('id', order.id)
                      setOrders(orders.map(o =>
                        o.id === order.id ? { ...o, assigned_to: agentId } : o
                      ))
                    }}
                    className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                    <option value="">Unassigned</option>
                    {deliveryAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Promote to Delivery Agent */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">
        Promote to Delivery Agent
      </h3>
      <p className="text-sm text-gray-400 mb-4">Select a customer to make them a delivery agent</p>
      <div className="flex flex-col gap-2">
        {customers.filter(c => !c.is_delivery && !c.is_admin).map((customer) => (
          <div key={customer.id} className="flex items-center justify-between border border-[#e8e0d0] rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1a5c38] flex items-center justify-center text-white text-xs font-bold">
                {customer.full_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-[#1c1c1c] text-sm">{customer.full_name}</p>
                <p className="text-xs text-gray-400">{customer.phone}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.from('profiles')
                  .update({ is_delivery: true })
                  .eq('id', customer.id)
                setDeliveryAgents([...deliveryAgents, { ...customer, is_delivery: true }])
                alert(customer.full_name + ' is now a delivery agent!')
              }}
              className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
              Make Agent
            </button>
          </div>
        ))}
      </div>
    </div>

  </div>
)}

{activeTab === 'products' && (
  <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
    <div className="px-6 py-5 border-b border-[#f5f0e8]">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Products & Pricing</h3>
      <p className="text-xs text-gray-400 mt-0.5">Update prices here — deductions use these values directly</p>
    </div>
    {products.length === 0 ? (
      <div className="px-6 py-12 text-center text-gray-400">No products found</div>
    ) : (
      <div>
        {products.map((product, index) => (
          <div key={product.id}
            className={`px-6 py-5 flex items-center gap-4 ${index !== products.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
            <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center text-2xl flex-shrink-0">🥛</div>
            <div className="flex-1">
              <p className="font-semibold text-[#1c1c1c]">{product.name || `Fresh Cow Milk ${product.size}`}</p>
              <p className="text-xs text-gray-400 mt-0.5">Size: {product.size}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${product.is_available ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                {product.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            {editingProduct?.id === product.id ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Price (Rs.)</p>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="border border-[#1a5c38] rounded-lg px-3 py-2 text-sm w-24 focus:outline-none"
                  />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <select
                    value={editingProduct.is_available ? 'true' : 'false'}
                    onChange={e => setEditingProduct({ ...editingProduct, is_available: e.target.value === 'true' })}
                    className="border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none">
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 mt-4">
                  <button
                    onClick={() => saveProductPrice(product.id, editingProduct.price, editingProduct.is_available)}
                    disabled={productSaving}
                    className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold disabled:opacity-50">
                    {productSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="text-xs border border-[#e8e0d0] text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-right flex-shrink-0">
                <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">Rs.{product.price}</p>
                <p className="text-xs text-gray-400 mb-2">per bottle/day</p>
                <button
                  onClick={() => setEditingProduct({ ...product })}
                  className="text-xs bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0] px-3 py-1.5 rounded-lg hover:bg-[#f5e9a0] transition font-semibold">
                  Edit Price
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
    <div className="px-6 py-4 bg-[#fdf6e3] border-t border-[#f0dfa0]">
      <p className="text-xs text-[#8a6e0a]">⚠️ Changing a price here immediately affects all future wallet deductions for active subscriptions.</p>
    </div>
  </div>
)}

    </div>
    </div>
  )
}