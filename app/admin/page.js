'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonStatCard } from '../components/Skeleton'

export default function AdminDashboard() {
  const router = useRouter()
  const { showSuccess } = useToast()
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
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [missedReports, setMissedReports] = useState([])
  const [bulkEnquiries, setBulkEnquiries] = useState([])
  const [qualityReports, setQualityReports] = useState([])
  const [refundingUserId, setRefundingUserId] = useState(null)
  const [refundModal, setRefundModal] = useState(null) // { customer, depositBalance }
  const [refundGoodBottles, setRefundGoodBottles] = useState('')
  const [refundDamagedBottles, setRefundDamagedBottles] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [discountCodes, setDiscountCodes] = useState([])
  const [newCode, setNewCode] = useState({ code: '', percent: '', description: '' })
  const [discountSaving, setDiscountSaving] = useState(false)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSubscriptions: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  })

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const user = session.user
    setUser(user)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      router.push('/')
      return
    }

    if (!profile.is_admin) {
      router.push('/')
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

    // Load reviews
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false })
    setReviews(allReviews || [])

    // Load missed delivery reports
    const { data: allReports } = await supabase
      .from('missed_delivery_reports')
      .select('*, profiles(full_name, phone, apartment_name, flat_number, area), orders(delivery_date, delivery_slot, products(size))')
      .order('reported_at', { ascending: false })
    setMissedReports(allReports || [])

    // Load bulk enquiries
    const { data: enquiries } = await supabase
      .from('bulk_enquiries')
      .select('*')
      .order('created_at', { ascending: false })
    setBulkEnquiries(enquiries || [])

    // Load quality feedback
    const { data: qFeedback } = await supabase
      .from('quality_feedback')
      .select('*, profiles(full_name, phone), orders(delivery_date, products(size))')
      .order('reported_at', { ascending: false })
    setQualityReports(qFeedback || [])

    // Load discount codes
    const { data: codes } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false })
    setDiscountCodes(codes || [])

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

    // SECURITY: Deduction logic now runs server-side via an admin-verified endpoint.
    // Previously this entire loop ran in the browser using the anon key, allowing
    // any authenticated user to trigger wallet mutations from the console.
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/run-deductions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const result = await res.json()

    if (res.ok) {
      // Refresh wallet balances shown in the panel
      const { data: freshWallets } = await supabase.from('wallet').select('*')
      setWallets(freshWallets || [])
      setDeductionResult({
        date: result.date,
        total: result.summary?.eligible || 0,
        deducted: result.summary?.deducted || 0,
        skipped: result.summary?.skipped || 0,
        failed: result.summary?.failed || 0,
        failedUsers: result.failed || [],
      })
    } else {
      setDeductionResult({ error: result.error || 'Deduction failed.' })
    }
    setDeductionLoading(false)
  }

  const updateOrderStatus = async (orderId, status) => {
    // SECURITY: Status update goes through a server-side route that re-verifies
    // is_admin from the DB on every request — not relying on a cached UI flag.
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/update-order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ order_id: orderId, status }),
    })
    if (res.ok) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
      setTodayOrders(todayOrders.map(o => o.id === orderId ? { ...o, status } : o))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] px-4 py-8 max-w-5xl mx-auto">
      <style>{`@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }`}</style>
      <div style={{ height: 32, borderRadius: 8, width: '30%', marginBottom: 24, background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
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

        {/* Revenue Chart — last 7 days */}
        {(() => {
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
          })
          const dayRevenue = days.map(day => ({
            label: new Date(day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
            rev: orders.filter(o => (o.delivery_date || o.created_at?.split('T')[0]) === day)
                       .reduce((s, o) => s + (o.total_price || 0), 0),
          }))
          const maxRev = Math.max(...dayRevenue.map(d => d.rev), 1)
          return (
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 mb-6 shadow-sm">
              <h3 className="font-[family-name:var(--font-playfair)] text-base font-bold text-[#1c1c1c] mb-4">📈 Revenue — Last 7 Days</h3>
              <div className="flex items-end gap-2 h-28">
                {dayRevenue.map(({ label, rev }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-[#1a5c38]">{rev > 0 ? `₹${rev}` : ''}</span>
                    <div className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.round((rev / maxRev) * 80)}px`,
                        minHeight: rev > 0 ? '4px' : '0',
                        background: 'linear-gradient(to top, #1a5c38, #2d7a50)',
                      }} />
                    <span className="text-[9px] text-gray-400 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Low Balance Alerts */}
        {(() => {
          const lowBalance = wallets
            .filter(w => w.balance < 300)
            .map(w => ({ ...w, customer: customers.find(c => c.id === w.user_id) }))
            .filter(w => w.customer)
          if (lowBalance.length === 0) return null
          return (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🚨</span>
                <p className="font-bold text-red-700">{lowBalance.length} Customer{lowBalance.length > 1 ? 's' : ''} with Low Wallet Balance</p>
              </div>
              <div className="flex flex-col gap-2">
                {lowBalance.map(w => (
                  <div key={w.user_id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-200">
                    <div>
                      <p className="font-semibold text-[#1c1c1c] text-sm">{w.customer.full_name}</p>
                      <p className="text-xs text-gray-400">📞 {w.customer.phone} • {w.customer.area}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${w.balance === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {w.balance === 0 ? '🚫 ₹0 — Paused' : `⚠️ ₹${w.balance}`}
                      </span>
                      <a href={`https://wa.me/91${w.customer.phone}?text=Hi ${w.customer.full_name}, your Sri Krishnaa Dairy wallet balance is low (Rs.${w.balance}). Please top up to continue daily deliveries.`}
                        target="_blank"
                        className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition">
                        Remind
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

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
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
    { id: 'discounts', label: 'Discount Codes', icon: '🏷️' },
    { id: 'reports', label: 'Issue Reports', icon: '⚠️' },
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
            <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">All Orders</h3>
                <p className="text-xs text-gray-400 mt-0.5">{orders.length} total orders</p>
              </div>
              <button onClick={() => {
                const headers = ['Customer Name','Phone','Product','Quantity','Delivery Date','Slot','Amount','Status','Payment Method','Delivery Mode']
                const rows = orders.map(o => [
                  o.profiles?.full_name || '',
                  o.profiles?.phone || '',
                  o.products?.name || o.products?.size || '',
                  o.quantity,
                  o.delivery_date,
                  o.delivery_slot,
                  o.total_price || o.total_amount || '',
                  o.status,
                  o.payment_method || 'COD',
                  o.delivery_mode || '',
                ])
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                setTimeout(() => URL.revokeObjectURL(url), 5000)
              }} className="text-sm bg-[#1a5c38] text-white px-4 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold flex-shrink-0">
                Export CSV
              </button>
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
                      <th className="px-6 py-3 text-left">Invoice</th>
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
                        <td className="px-6 py-4">
                          <button onClick={async () => {
                            const { data: { session } } = await supabase.auth.getSession()
                            const res = await fetch(`/api/invoice/${order.id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
                            const html = await res.text()
                            const blob = new Blob([html], { type: 'text/html' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.click()
                            setTimeout(() => URL.revokeObjectURL(url), 5000)
                          }} className="text-xs text-[#1a5c38] underline hover:text-[#14472c]">Invoice</button>
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
            <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">All Customers</h3>
                <p className="text-xs text-gray-400 mt-0.5">{customers.length} registered customers</p>
              </div>
              <button onClick={() => {
                const headers = ['Name','Phone','Email','Area','Building','Flat Number','Landmark','Joined Date']
                const rows = customers.map(c => [
                  c.full_name || '',
                  c.phone || '',
                  c.email || '',
                  c.area || '',
                  c.apartment_name || '',
                  c.flat_number || '',
                  c.landmark || '',
                  c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '',
                ])
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                setTimeout(() => URL.revokeObjectURL(url), 5000)
              }} className="text-sm bg-[#1a5c38] text-white px-4 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold flex-shrink-0">
                Export CSV
              </button>
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
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1c1c1c]">{customer.full_name}</p>
                        {(() => {
                          const w = wallets.find(w => w.user_id === customer.id)
                          if (!w || w.balance >= 300) return null
                          return (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${w.balance === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              {w.balance === 0 ? '🚫 ₹0' : `⚠️ ₹${w.balance}`}
                            </span>
                          )
                        })()}
                      </div>
                      <p className="text-sm text-gray-400">📞 {customer.phone}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {customer.area} • {customer.apartment_name}, Flat {customer.flat_number}
                      </p>
                      {customer.landmark && (
                        <p className="text-xs text-gray-400">Near: {customer.landmark}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="text-xs text-gray-400">Joined {new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {(() => {
                        const w = wallets.find(w => w.user_id === customer.id)
                        if (!w?.deposit_balance || w.deposit_balance <= 0) return null
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-[#d4a017] font-semibold">🍼 Deposit: ₹{w.deposit_balance}</span>
                            <button
                              onClick={() => {
                                setRefundModal({ customer, depositBalance: w.deposit_balance })
                                setRefundGoodBottles('')
                                setRefundDamagedBottles('')
                                setRefundNotes('')
                              }}
                              className="text-xs bg-[#d4a017] text-white px-3 py-1 rounded-lg hover:bg-[#b8860b] transition font-semibold">
                              Refund Deposit
                            </button>
                          </div>
                        )
                      })()}
                      <a href={'https://wa.me/91' + customer.phone} target="_blank"
                        className="flex items-center gap-1 text-xs text-[#25D366] font-semibold hover:underline">
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
                showSuccess(customer.full_name + ' is now a delivery agent!')
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

{activeTab === 'reviews' && (
  <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
    <div className="px-6 py-5 border-b border-[#f5f0e8]">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customer Reviews</h3>
      <p className="text-xs text-gray-400 mt-0.5">{reviews.length} total · {reviews.filter(r => r.is_approved).length} approved</p>
    </div>
    {reviews.length === 0 ? (
      <div className="px-6 py-12 text-center text-gray-400 text-sm">No reviews yet.</div>
    ) : (
      <div className="divide-y divide-[#f5f0e8]">
        {reviews.map((r) => (
          <div key={r.id} className="px-6 py-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {r.profiles?.full_name?.[0] || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-[#1c1c1c]">{r.profiles?.full_name || 'Customer'}</span>
                <span className="text-[#d4a017] text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              {r.review && <p className="text-sm text-gray-600">{r.review}</p>}
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_approved ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-[#fdf6e3] text-[#92400e] border border-[#f0dfa0]'}`}>
                {r.is_approved ? 'Approved' : 'Pending'}
              </span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!r.is_approved && (
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/reviews/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ reviewId: r.id, approved: true }),
                  })
                  if (res.ok) setReviews(reviews.map(x => x.id === r.id ? { ...x, is_approved: true } : x))
                }} className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
                  Approve
                </button>
              )}
              {r.is_approved && (
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/reviews/approve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ reviewId: r.id, approved: false }),
                  })
                  if (res.ok) setReviews(reviews.map(x => x.id === r.id ? { ...x, is_approved: false } : x))
                }} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-semibold">
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

{/* Discount Codes Tab */}
{activeTab === 'discounts' && (
  <div className="flex flex-col gap-6">
    {/* Add new code */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">🏷️ Add Discount Code</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Code *</label>
          <input type="text" placeholder="e.g. SUMMER20"
            value={newCode.code}
            onChange={e => setNewCode(c => ({ ...c, code: e.target.value.toUpperCase() }))}
            className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Discount % *</label>
          <input type="number" placeholder="e.g. 15" min="1" max="99"
            value={newCode.percent}
            onChange={e => setNewCode(c => ({ ...c, percent: e.target.value }))}
            className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Description (optional)</label>
          <input type="text" placeholder="e.g. Summer promotion"
            value={newCode.description}
            onChange={e => setNewCode(c => ({ ...c, description: e.target.value }))}
            className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
        </div>
      </div>
      <button
        disabled={discountSaving || !newCode.code.trim() || !newCode.percent}
        onClick={async () => {
          setDiscountSaving(true)
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('/api/admin/discount-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ code: newCode.code.trim(), percent: parseInt(newCode.percent), description: newCode.description.trim() }),
          })
          if (res.ok) {
            const { data } = await res.json()
            setDiscountCodes(prev => [data, ...prev])
            setNewCode({ code: '', percent: '', description: '' })
          }
          setDiscountSaving(false)
        }}
        className="bg-[#1a5c38] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#14472c] transition disabled:opacity-50">
        {discountSaving ? 'Saving...' : '+ Add Code'}
      </button>
    </div>

    {/* Existing codes */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Active Discount Codes</h3>
        <p className="text-xs text-gray-400 mt-0.5">{discountCodes.length} codes total</p>
      </div>
      {discountCodes.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">No discount codes yet. Add one above.</div>
      ) : (
        <div className="divide-y divide-[#f5f0e8]">
          {discountCodes.map((dc) => (
            <div key={dc.id} className="px-6 py-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#1a5c38] text-base">{dc.code}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dc.is_active ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-gray-100 text-gray-400'}`}>
                    {dc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-[#d4a017] font-bold mt-0.5">{dc.percent}% off</p>
                {dc.description && <p className="text-xs text-gray-400 mt-0.5">{dc.description}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/discount-codes', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ id: dc.id, is_active: !dc.is_active }),
                  })
                  if (res.ok) setDiscountCodes(prev => prev.map(x => x.id === dc.id ? { ...x, is_active: !dc.is_active } : x))
                }} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${dc.is_active ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] hover:bg-[#e0f5ea]'}`}>
                  {dc.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={async () => {
                  if (!confirm(`Delete code "${dc.code}"?`)) return
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/discount-codes', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ id: dc.id }),
                  })
                  if (res.ok) setDiscountCodes(prev => prev.filter(x => x.id !== dc.id))
                }} className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

{/* Issue Reports Tab */}
{activeTab === 'reports' && (
  <div className="flex flex-col gap-6">
    {/* Missed Delivery Reports */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">⚠️ Missed Delivery Reports</h3>
        <p className="text-xs text-gray-400 mt-0.5">{missedReports.length} reports total</p>
      </div>
      {missedReports.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">No missed delivery reports. Great!</div>
      ) : (
        <div className="divide-y divide-[#f5f0e8]">
          {missedReports.map((r) => {
            const profile = r.profiles
            const order = r.orders
            const dateStr = order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
            const slot = order?.delivery_slot === 'morning' ? 'Morning (7AM–9AM)' : 'Evening (5PM–7PM)'
            const address = [profile?.flat_number, profile?.apartment_name, profile?.area].filter(Boolean).join(', ')
            return (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-[#1c1c1c]">{profile?.full_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📞 {profile?.phone || 'N/A'} · 📍 {address || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">🥛 {order?.products?.size || 'Milk'} · 📅 {dateStr} · ⏰ {slot}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs bg-red-50 text-red-600 border border-red-200 font-semibold px-2 py-0.5 rounded-full">Reported</span>
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.reported_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* Quality Feedback */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">👎 Quality Feedback</h3>
        <p className="text-xs text-gray-400 mt-0.5">{qualityReports.length} reports</p>
      </div>
      {qualityReports.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">No quality complaints. Excellent!</div>
      ) : (
        <div className="divide-y divide-[#f5f0e8]">
          {qualityReports.map((r) => {
            const dateStr = r.orders?.delivery_date
              ? new Date(r.orders.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'
            return (
              <div key={r.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm text-[#1c1c1c]">{r.profiles?.full_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">📞 {r.profiles?.phone || 'N/A'} · 🥛 {r.orders?.products?.size || 'Milk'} · {dateStr}</p>
                    <p className="text-sm text-orange-700 mt-1 italic">"{r.issue}"</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{new Date(r.reported_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* Bulk Enquiries */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">📦 Bulk Order Enquiries</h3>
        <p className="text-xs text-gray-400 mt-0.5">{bulkEnquiries.length} enquiries total</p>
      </div>
      {bulkEnquiries.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">No bulk enquiries yet.</div>
      ) : (
        <div className="divide-y divide-[#f5f0e8]">
          {bulkEnquiries.map((e) => (
            <div key={e.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-[#1c1c1c]">{e.name}</p>
                  {e.institution && <p className="text-xs text-gray-500 mt-0.5">🏢 {e.institution}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">📞 {e.phone}{e.quantity ? ` · 🥛 ${e.quantity}` : ''}</p>
                  {e.message && <p className="text-xs text-gray-400 mt-1 italic">"{e.message}"</p>}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}

    </div>
    </div>

    {/* ── Deposit Refund Modal ── */}
    {refundModal && (() => {
      const good = Number(refundGoodBottles) || 0
      const damaged = Number(refundDamagedBottles) || 0
      const refundAmt = good * 100
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-[#1c1c1c]">Process Deposit Refund</h3>
              <button onClick={() => setRefundModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="bg-[#f5f0e8] rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-[#1c1c1c]">{refundModal.customer.full_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total deposit on account: <strong>₹{refundModal.depositBalance}</strong></p>
            </div>

            <div className="flex flex-col gap-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Bottles returned in good condition</label>
                <input type="number" min="0" value={refundGoodBottles}
                  onChange={e => setRefundGoodBottles(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Bottles damaged/broken</label>
                <input type="number" min="0" value={refundDamagedBottles}
                  onChange={e => setRefundDamagedBottles(e.target.value)}
                  placeholder="0"
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Notes (optional)</label>
                <input type="text" value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  placeholder="Condition notes or remarks..."
                  className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]" />
              </div>
            </div>

            <div className={`rounded-xl p-4 mb-5 ${refundAmt > 0 ? 'bg-[#f0faf4] border border-[#c8e6d4]' : 'bg-[#f5f0e8]'}`}>
              <p className="text-sm text-gray-600">{good} bottle(s) × ₹100 = <strong className={refundAmt > 0 ? 'text-[#1a5c38]' : 'text-gray-400'}>₹{refundAmt} refund</strong></p>
              {damaged > 0 && <p className="text-xs text-red-500 mt-1">{damaged} damaged bottle(s) — no refund for these</p>}
              {refundAmt > refundModal.depositBalance && <p className="text-xs text-red-500 mt-1">Refund exceeds deposit balance of ₹{refundModal.depositBalance}</p>}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRefundModal(null)}
                className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                Cancel
              </button>
              <button
                disabled={refundProcessing || refundAmt <= 0 || refundAmt > refundModal.depositBalance}
                onClick={async () => {
                  setRefundProcessing(true)
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/refund-deposit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({
                      user_id: refundModal.customer.id,
                      refund_amount: refundAmt,
                      good_bottles: good,
                      notes: refundNotes,
                    }),
                  })
                  if (res.ok) {
                    setWallets(prev => prev.map(ww => ww.user_id === refundModal.customer.id
                      ? { ...ww, deposit_balance: (ww.deposit_balance || 0) - refundAmt, balance: (ww.balance || 0) + refundAmt }
                      : ww
                    ))
                    showSuccess(`₹${refundAmt} deposit refunded to ${refundModal.customer.full_name}`)
                    setRefundModal(null)
                  }
                  setRefundProcessing(false)
                }}
                className="flex-1 bg-[#d4a017] text-white font-bold py-3 rounded-xl hover:bg-[#b8860b] transition text-sm disabled:opacity-50">
                {refundProcessing ? 'Processing...' : `Confirm Refund ₹${refundAmt}`}
              </button>
            </div>
          </div>
        </div>
      )
    })()}

  )
}