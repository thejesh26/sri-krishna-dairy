'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import DisclaimerPopup from '../components/DisclaimerPopup'
import PushNotificationPrompt from '../components/PushNotificationPrompt'
import { SkeletonCard, SkeletonStatCard } from '../components/Skeleton'
import ReviewForm from '../components/ReviewForm'
import Footer from '../components/Footer'

const BADGE_INFO = {
  fresh_start:    { emoji: '🥛', label: 'Fresh Start',      days: 7,   color: '#d4a017' },
  milk_lover:     { emoji: '🌟', label: 'Milk Lover',       days: 30,  color: '#1a5c38' },
  health_champion:{ emoji: '💪', label: 'Health Champion',  days: 90,  color: '#0d3320' },
  dairy_legend:   { emoji: '🏆', label: 'Dairy Legend',     days: 365, color: '#d4a017' },
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [walletBalance, setWalletBalance] = useState(0)
  const [depositBalance, setDepositBalance] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [referrals, setReferrals] = useState([])
  const [openFaq, setOpenFaq] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [copyMsg, setCopyMsg] = useState('')
  const [redeemMsg, setRedeemMsg] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [inactiveSubs, setInactiveSubs] = useState([])
  const [subDeliveries, setSubDeliveries] = useState([])
  const [reactivatingId, setReactivatingId] = useState(null)
  const [reactivateMsg, setReactivateMsg] = useState('')
  const [reportedOrders, setReportedOrders] = useState(new Set())
  const [qualityFeedbackOpen, setQualityFeedbackOpen] = useState(null) // order id
  const [qualityIssue, setQualityIssue] = useState('')
  const [qualitySubmitted, setQualitySubmitted] = useState(new Set())
  const [cancelPopup, setCancelPopup] = useState(null) // order object
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => { getUser() }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { text: 'Good Morning', icon: '🌅' }
    if (hour < 17) return { text: 'Good Afternoon', icon: '☀️' }
    return { text: 'Good Evening', icon: '🌙' }
  }

  const getUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const u = session.user
    setUser(u)

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(prof)

    const { data: recentOrders } = await supabase.from('orders').select('*, products(*)')
      .eq('user_id', u.id).order('created_at', { ascending: false }).limit(3)
    setOrders(recentOrders || [])

    const { data: allOrd } = await supabase.from('orders').select('*, products(*)')
      .eq('user_id', u.id).order('created_at', { ascending: false })
    setAllOrders(allOrd || [])

    const { data: subs } = await supabase.from('subscriptions').select('*, products(*)')
      .eq('user_id', u.id).eq('is_active', true)
    setSubscriptions(subs || [])

    const { data: inactiveSubs } = await supabase.from('subscriptions').select('*, products(*)')
      .eq('user_id', u.id).eq('is_active', false).order('created_at', { ascending: false }).limit(5)
    setInactiveSubs(inactiveSubs || [])

    const { data: subDels } = await supabase.from('subscription_deliveries')
      .select('delivery_date, subscriptions(quantity)')
      .eq('user_id', u.id)
    setSubDeliveries(subDels || [])

    const { data: walletData } = await supabase.from('wallet').select('*').eq('user_id', u.id).limit(1)
    setWalletBalance(walletData?.[0]?.balance || 0)
    setDepositBalance(walletData?.[0]?.deposit_balance || 0)

    const { data: txns } = await supabase.from('wallet_transactions').select('*')
      .eq('user_id', u.id).order('created_at', { ascending: false }).limit(50)
    setTransactions(txns || [])

    const { data: refs } = await supabase.from('referrals').select('*, profiles!referrals_referred_id_fkey(full_name)')
      .eq('referrer_id', u.id).order('created_at', { ascending: false })
    setReferrals(refs || [])

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleReactivate = async (subId) => {
    setReactivatingId(subId)
    setReactivateMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ subscription_id: subId }),
    })
    const result = await res.json()
    if (!res.ok) {
      setReactivateMsg('❌ ' + (result.error || 'Could not reactivate.'))
    } else {
      // Move sub from inactive to active list
      const reactivated = inactiveSubs.find(s => s.id === subId)
      if (reactivated) {
        setSubscriptions(prev => [...prev, { ...reactivated, is_active: true }])
        setInactiveSubs(prev => prev.filter(s => s.id !== subId))
      }
      setReactivateMsg('✅ Subscription reactivated!')
    }
    setReactivatingId(null)
    setTimeout(() => setReactivateMsg(''), 4000)
  }

  const copyReferralCode = () => {
    if (!profile?.referral_code) return
    navigator.clipboard.writeText(profile.referral_code).then(() => {
      setCopyMsg('Copied!')
      setTimeout(() => setCopyMsg(''), 2000)
    })
  }

  const handleRedeemPoints = async () => {
    if (!profile || profile.loyalty_points < 100) {
      setRedeemMsg('❌ You need at least 100 points to redeem.')
      return
    }
    setRedeemLoading(true)
    setRedeemMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/loyalty/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
    })
    const result = await res.json()
    if (res.ok) {
      setRedeemMsg('🥛 Success! A free 1L milk order has been placed for tomorrow.')
      setProfile(p => ({ ...p, loyalty_points: p.loyalty_points - 100 }))
    } else {
      setRedeemMsg('❌ ' + (result.error || 'Could not redeem points.'))
    }
    setRedeemLoading(false)
  }

  // Monthly report calculations (IST-aware, delivery_date based)
  const getMonthlyReport = () => {
    const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const monthPrefix = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}`

    // Only non-cancelled orders whose delivery_date falls in this month
    const monthOrders = allOrders.filter(o =>
      o.delivery_date?.startsWith(monthPrefix) && o.status !== 'cancelled'
    )
    const deliveredOrders = monthOrders.filter(o => o.status === 'delivered')

    const orderBottles = monthOrders.reduce((s, o) => s + (o.quantity || 0), 0)
    // Count subscription deliveries this month
    const subBottles = subDeliveries
      .filter(d => d.delivery_date?.startsWith(monthPrefix))
      .reduce((s, d) => s + (d.subscriptions?.quantity || 0), 0)
    const totalBottles = orderBottles + subBottles
    // Total spent: only actually-delivered orders (exclude pending/future)
    const totalSpent = deliveredOrders.reduce((s, o) => s + (o.total_price || 0), 0)
    // Market prices: 500ml = Rs.50, 1000ml = Rs.90
    const moneySaved = deliveredOrders.reduce((s, o) => {
      const market = o.products?.size === '500ml' ? 50 : 90
      const ours = o.products?.price || 0
      return s + Math.max(0, (market - ours) * (o.quantity || 0))
    }, 0)
    return { totalBottles, totalSpent, moneySaved, orderCount: monthOrders.length }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 14, borderRadius: 6, width: '40%', background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear' }} />
          <div style={{ height: 12, borderRadius: 6, width: '25%', background: 'linear-gradient(90deg, #f5f0e8 25%, #e8e0d0 50%, #f5f0e8 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite linear' }} />
        </div>
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
      </div>
      <SkeletonCard style={{ marginBottom: 12 }} />
      <SkeletonCard />
    </div>
  )

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'Customer'
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  // Only subscriptions that have actually started (start_date <= today IST)
  const activeSubscriptions = subscriptions.filter(s =>
    s.start_date <= todayIST && (!s.end_date || s.end_date >= todayIST)
  )
  const totalDailyValue = activeSubscriptions.reduce((sum, sub) => sum + Math.round((sub.products?.price || 0) * sub.quantity * (1 - (sub.discount_percent || 0) / 100)), 0)
  const nextDelivery = activeSubscriptions[0]
  const report = getMonthlyReport()

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-2">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-[#d4a017] flex-shrink-0" />
          <div>
            <h1 className="text-sm sm:text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)] leading-tight">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium hidden sm:block">Farm Fresh - Pure - Natural</p>
          </div>
        </a>
        <div className="flex items-center gap-4">
          <a href="/profile"
            className="flex items-center gap-2 border border-[#e8e0d0] rounded-full px-4 py-2 hover:border-[#d4a017] transition">
            <div className="w-7 h-7 rounded-full bg-[#1a5c38] flex items-center justify-center text-white text-xs font-bold">
              {firstName[0]}
            </div>
            <span className="text-sm font-medium text-[#1c1c1c]">{firstName}</span>
          </a>
          <button onClick={handleLogout}
            className="border border-red-200 text-red-400 font-medium px-4 py-2 rounded-full text-sm hover:bg-red-50 transition">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Welcome Banner */}
        <div className="rounded-2xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden shadow-lg"
          style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #d4a017, transparent)'}}></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-10"
            style={{background:'radial-gradient(circle, #d4a017, transparent)'}}></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm font-medium mb-2">{greeting.icon} {greeting.text}</p>
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-white mb-1">{firstName}!</h2>
              <p className="text-green-200 text-sm">{profile?.area || profile?.apartment_name || 'Kattigenahalli'}, Bangalore</p>
              {profile?.loyalty_points > 0 && (
                <p className="text-[#d4a017] text-xs font-semibold mt-1">⭐ {profile.loyalty_points} loyalty points</p>
              )}
            </div>
            <img src="/Logo.jpg" alt="Logo"
              className="h-20 w-20 rounded-full object-cover border-4 border-[#d4a017] border-opacity-60 shadow-xl hidden sm:block" />
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white border-opacity-20">
            <div className="text-center">
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#d4a017]">{activeSubscriptions.length}</p>
              <p className="text-green-300 text-xs mt-1 uppercase tracking-widest">Active Plans</p>
            </div>
            <div className="text-center border-x border-white border-opacity-20">
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#d4a017]">₹{totalDailyValue}</p>
              <p className="text-green-300 text-xs mt-1 uppercase tracking-widest">Per Day</p>
            </div>
            <div className="text-center cursor-pointer" onClick={() => router.push('/wallet')}>
              <p className={`font-[family-name:var(--font-playfair)] text-2xl font-bold ${walletBalance < 300 ? 'text-red-300' : 'text-[#d4a017]'}`}>
                ₹{walletBalance}
              </p>
              <p className="text-green-300 text-xs mt-1 uppercase tracking-widest">Wallet</p>
              {depositBalance > 0 && (
                <p className="text-[#d4a017] text-[10px] mt-0.5 opacity-80">+₹{depositBalance} deposit</p>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Low Balance Warning */}
        {walletBalance === 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🚨</span>
            <div className="flex-1">
              <p className="text-red-700 font-bold text-sm">Wallet Empty — Deliveries Paused!</p>
              <p className="text-red-600 text-xs mt-1">Your wallet is at ₹0. All subscription deliveries are on hold. Add balance immediately to resume.</p>
            </div>
            <a href="/wallet" className="bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0 hover:bg-red-700 transition">Top Up →</a>
          </div>
        )}
        {walletBalance > 0 && walletBalance < 300 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-5 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-orange-700 font-bold text-sm">Low Wallet Balance — Top Up Soon!</p>
              <p className="text-orange-600 text-xs mt-1">Balance ₹{walletBalance} is below the required ₹300 minimum. Deliveries may pause if not topped up.</p>
            </div>
            <a href="/wallet" className="bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0 hover:bg-orange-600 transition">Add Balance →</a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'overview', label: '🏠 Overview' },
            { id: 'rewards',  label: '⭐ Rewards' },
            { id: 'history',  label: '📋 History' },
            { id: 'report',   label: '📊 Report' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                activeTab === id
                  ? 'bg-[#1a5c38] text-white shadow'
                  : 'text-gray-500 hover:text-[#1a5c38]'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">

            {/* Today's Delivery Status */}
            {nextDelivery && (
              <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Today's Delivery</h3>
                  <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-full border border-[#c8e6d4]">Scheduled</span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 p-2">
                    <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c] text-base">{nextDelivery.products?.size} Fresh Cow Milk</p>
                    <p className="text-gray-400 text-sm mt-1">{nextDelivery.quantity} bottle(s) per day</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-semibold px-3 py-1 rounded-full">
                        {nextDelivery.delivery_slot === 'morning' ? '🌅 7AM - 9AM' : '🌆 5PM - 7PM'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">
                      ₹{nextDelivery.products?.price * nextDelivery.quantity}
                    </p>
                    <p className="text-xs text-gray-400">per day</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { href: '/order',     icon: '🛒', label: 'Order Now',   desc: 'One time delivery', color: '#f0faf4', border: '#c8e6d4' },
                { href: '/subscribe', icon: '📅', label: 'Subscribe',   desc: 'Daily milk plan',   color: '#fdf6e3', border: '#f0dfa0' },
                { href: '/pause',     icon: '⏸️', label: 'Manage Plan', desc: 'Pause or cancel',   color: '#f5f0e8', border: '#e8e0d0' },
                { href: '/wallet',    icon: '💰', label: 'Wallet',      desc: 'Add balance',       color: '#f0faf4', border: '#c8e6d4' },
                { href: '/addon',     icon: '➕', label: 'Extra Milk',  desc: 'Add-on for subscribers', color: '#fdf6e3', border: '#f0dfa0' },
                { href: '/',          icon: '🏠', label: 'Our Website', desc: 'View homepage',     color: '#f5f0e8', border: '#e8e0d0' },
              ].map(({ href, icon, label, desc, color, border }) => (
                <a key={label} href={href}
                  className="rounded-2xl p-4 border hover:shadow-md transition group"
                  style={{background: color, borderColor: border}}>
                  <div className="text-3xl mb-2">{icon}</div>
                  <p className="font-semibold text-[#1c1c1c] text-sm group-hover:text-[#1a5c38] transition">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </a>
              ))}
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">My Subscriptions</h3>
                <a href="/subscribe"
                  className="text-xs text-[#1a5c38] font-semibold bg-[#f0faf4] border border-[#c8e6d4] px-4 py-2 rounded-full hover:bg-[#d4eddf] transition">
                  + New Plan
                </a>
              </div>
              {subscriptions.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="flex justify-center mb-3"><img src="/bottle.png" alt="Milk" className="h-20 object-contain opacity-50" /></div>
                  <p className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">No Active Subscriptions</p>
                  <p className="text-gray-400 text-sm mb-5">Subscribe for daily fresh milk delivery</p>
                  <a href="/subscribe" className="inline-block text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow"
                    style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>Subscribe Now</a>
                </div>
              ) : (
                subscriptions.map((sub, index) => {
                  const fullPrice = sub.products?.price * sub.quantity
                  const discountedPrice = sub.discount_percent > 0
                    ? Math.round(fullPrice * (1 - sub.discount_percent / 100))
                    : fullPrice
                  const monthlyCost = discountedPrice * 30
                  return (
                  <div key={sub.id}
                    className={`px-6 py-5 flex items-center gap-5 ${index !== subscriptions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-16 h-16 rounded-2xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 p-2">
                      <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c]">{sub.products?.size} Fresh Cow Milk</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {sub.quantity} bottle/day • {sub.start_date > todayIST ? 'Starts' : 'Started'} {new Date(sub.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${sub.start_date > todayIST ? 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]' : 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'}`}>
                          {sub.start_date > todayIST ? 'Upcoming' : 'Active'}
                        </span>
                        <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-3 py-1 rounded-full border border-[#f0dfa0]">
                          {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        </span>
                        {sub.discount_percent > 0 && (
                          <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
                            {sub.discount_percent}% off
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">₹{discountedPrice}</p>
                      <p className="text-xs text-gray-400 mb-0.5">/day</p>
                      <p className="text-xs text-gray-400 mb-2">~₹{monthlyCost}/mo</p>
                      <a href="/pause" className="text-xs text-[#d4a017] font-semibold border border-[#f0dfa0] px-3 py-1 rounded-full hover:bg-[#fdf6e3] transition">Manage</a>
                    </div>
                  </div>
                )})
              )}
            </div>

            {/* Inactive Subscriptions */}
            {inactiveSubs.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-[#f5f0e8]">
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Inactive Subscriptions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Deactivated due to low wallet balance — top up and reactivate</p>
                </div>
                {reactivateMsg && (
                  <div className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm font-medium ${reactivateMsg.startsWith('✅') ? 'bg-[#f0faf4] text-[#1a5c38]' : 'bg-red-50 text-red-700'}`}>
                    {reactivateMsg}
                  </div>
                )}
                {inactiveSubs.map((sub, index) => {
                  const dailyCost = Math.round(sub.products?.price * sub.quantity * (1 - (sub.discount_percent || 0) / 100))
                  const canReactivate = walletBalance >= dailyCost
                  return (
                    <div key={sub.id}
                      className={`px-6 py-5 flex items-center gap-5 ${index !== inactiveSubs.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 p-2 opacity-60">
                        <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[#1c1c1c]">{sub.products?.size} Fresh Cow Milk</p>
                        <p className="text-sm text-gray-400 mt-1">{sub.quantity} bottle/day • ₹{dailyCost}/day</p>
                        <span className="inline-block mt-2 bg-red-50 text-red-600 text-xs font-medium px-3 py-1 rounded-full border border-red-200">Inactive</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {canReactivate ? (
                          <button
                            onClick={() => handleReactivate(sub.id)}
                            disabled={reactivatingId === sub.id}
                            className="bg-[#1a5c38] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#14472c] transition disabled:opacity-50">
                            {reactivatingId === sub.id ? 'Reactivating...' : 'Reactivate'}
                          </button>
                        ) : (
                          <div className="text-right">
                            <p className="text-xs text-red-500 font-semibold mb-1">Need ₹{dailyCost} balance</p>
                            <a href="/wallet" className="text-xs text-[#d4a017] font-semibold border border-[#f0dfa0] px-3 py-1.5 rounded-lg hover:bg-[#fdf6e3] transition">Top Up Wallet</a>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Recent Orders</h3>
                <button onClick={() => setActiveTab('history')}
                  className="text-xs text-[#1a5c38] font-semibold bg-[#f0faf4] border border-[#c8e6d4] px-4 py-2 rounded-full hover:bg-[#d4eddf] transition">
                  View All →
                </button>
              </div>
              {orders.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-5xl mb-3">📦</div>
                  <p className="text-gray-400 text-sm mb-4">No orders yet. Place your first order today!</p>
                  <a href="/order" className="inline-block text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition shadow text-sm"
                    style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>Order Now</a>
                </div>
              ) : (
                orders.map((order, index) => (
                  <div key={order.id}
                    className={`${index !== orders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="px-6 py-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 p-2">
                      <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c] text-sm">{order.products?.size} Fresh Cow Milk</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        order.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' :
                        order.status === 'pending'   ? 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]' :
                        'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}>{order.status}</span>
                      <p className="font-bold text-[#1a5c38] text-base">₹{order.total_price}</p>
                      <button onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession()
                        const res = await fetch(`/api/invoice/${order.id}`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
                        const html = await res.text()
                        const blob = new Blob([html], { type: 'text/html' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.click()
                        setTimeout(() => URL.revokeObjectURL(url), 5000)
                      }} className="text-[10px] text-[#1a5c38] underline underline-offset-2 hover:text-[#14472c]">
                        Invoice
                      </button>
                      {order.status === 'delivered' && !reportedOrders.has(order.id) && (
                        <button onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession()
                          await fetch('/api/missed-delivery', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                            body: JSON.stringify({ order_id: order.id }),
                          })
                          setReportedOrders(prev => new Set([...prev, order.id]))
                        }} className="text-[10px] text-red-500 underline underline-offset-2 hover:text-red-700">
                          Report Issue
                        </button>
                      )}
                      {reportedOrders.has(order.id) && (
                        <span className="text-[10px] text-gray-400">Reported ✓</span>
                      )}
                      {order.status === 'delivered' && !qualitySubmitted.has(order.id) && (
                        <button onClick={() => setQualityFeedbackOpen(qualityFeedbackOpen === order.id ? null : order.id)}
                          className="text-[10px] text-orange-500 underline underline-offset-2 hover:text-orange-700">
                          👎 Quality Issue
                        </button>
                      )}
                      {qualitySubmitted.has(order.id) && (
                        <span className="text-[10px] text-gray-400">Feedback sent ✓</span>
                      )}
                    </div>
                    </div>
                  {qualityFeedbackOpen === order.id && (
                    <div className="mx-6 mb-4 bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col gap-2">
                      <p className="text-xs font-semibold text-orange-700">Describe the quality issue</p>
                      <textarea rows={2} placeholder="e.g. Milk smelled off, bottle was cracked..."
                        value={qualityIssue}
                        onChange={e => setQualityIssue(e.target.value)}
                        className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-400 resize-none bg-white" />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setQualityFeedbackOpen(null); setQualityIssue('') }}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Cancel</button>
                        <button onClick={async () => {
                          if (!qualityIssue.trim()) return
                          const { data: { session } } = await supabase.auth.getSession()
                          await fetch('/api/quality-feedback', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                            body: JSON.stringify({ order_id: order.id, issue: qualityIssue }),
                          })
                          setQualitySubmitted(prev => new Set([...prev, order.id]))
                          setQualityFeedbackOpen(null)
                          setQualityIssue('')
                        }} className="text-xs bg-orange-500 text-white font-bold px-3 py-1 rounded-lg hover:bg-orange-600 transition">
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                ))
              )}
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8]">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">❓ Frequently Asked Questions</h3>
              </div>
              <div className="px-6 py-4 flex flex-col gap-2">
                {[
                  { q: 'What time is milk delivered?', a: 'Morning slot: 7AM – 9AM. Evening slot: 5PM – 7PM. We guarantee delivery within your chosen slot.' },
                  { q: 'What is the bottle deposit?', a: 'A one-time refundable deposit of ₹200 per bottle. The full deposit is returned when bottles are given back in good condition. Choose Direct Delivery mode to skip the deposit — our agent collects the bottle right after delivery.' },
                  { q: 'What is the minimum wallet balance?', a: 'Your wallet must have sufficient balance to cover the day\'s delivery cost. If your balance is insufficient, your subscription will be automatically deactivated. We send you an email alert when your balance drops below ₹300 — top up in advance to stay uninterrupted.' },
                  { q: 'Is the milk safe to drink directly?', a: '⚠️ Our milk is farm-fresh and raw — NOT pasteurized. Always boil before consuming, especially for children, elderly, pregnant women, and immunocompromised individuals. FSSAI Lic. No: 21225008004544.' },
                  { q: 'Can I pause my subscription?', a: 'Yes! Go to Manage Plan and select a single date or a date range to pause. Must be done at least 12 hours in advance. Great for holidays or travel.' },
                  { q: 'How do I add wallet balance?', a: 'Go to your Wallet page and use the Add Money section. Pay securely via Razorpay (UPI, card, netbanking) and your balance is credited instantly.' },
                  { q: 'How do I reactivate a deactivated subscription?', a: 'Go to your Dashboard. Deactivated subscriptions appear in the "Inactive Subscriptions" section. Top up your wallet first, then click Reactivate.' },
                  { q: 'Can I change my delivery quantity?', a: 'Yes! Go to Manage Plan and use the "Change Quantity" section to increase or decrease your daily bottles. Changes take effect from the next delivery.' },
                ].map(({ q, a }, i) => (
                  <div key={q} className="border border-[#e8e0d0] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between font-semibold text-[#1c1c1c] text-sm hover:bg-[#fdfbf7] transition">
                      <span>{q}</span>
                      <span className={`text-[#d4a017] text-xl font-bold flex-shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-4 pt-1 border-t border-[#e8e0d0]">
                        <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">Need Help?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <a href="tel:9980166221" className="flex items-center gap-4 border border-[#e8e0d0] rounded-xl p-4 hover:border-[#1a5c38] transition">
                  <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center text-2xl">📞</div>
                  <div><p className="font-semibold text-[#1c1c1c]">Call Us</p><p className="text-sm text-gray-400">9980166221</p></div>
                </a>
                <a href="https://wa.me/919980166221" target="_blank" className="flex items-center gap-4 border border-[#e8e0d0] rounded-xl p-4 hover:border-[#25D366] transition">
                  <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div><p className="font-semibold text-[#1c1c1c]">WhatsApp</p><p className="text-sm text-gray-400">Chat with us</p></div>
                </a>
              </div>
            </div>

            {/* Review Prompt — show if sub > 7 days old and hasn't reviewed */}
            {!profile?.has_reviewed && subscriptions.length > 0 && (() => {
              const subAge = subscriptions[0]?.created_at
                ? (Date.now() - new Date(subscriptions[0].created_at)) / (1000 * 60 * 60 * 24)
                : 0
              return subAge >= 7
            })() && (
              <ReviewForm onSubmit={() => setProfile(p => ({ ...p, has_reviewed: true }))} />
            )}

          </div>
        )}

        {/* ─── REWARDS TAB ─── */}
        {activeTab === 'rewards' && (
          <div className="flex flex-col gap-5">

            {/* Loyalty Points */}
            <div className="rounded-2xl p-6 text-white shadow-lg"
              style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-1">Loyalty Points</p>
                  <p className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-[#d4a017]">
                    {profile?.loyalty_points || 0}
                  </p>
                  <p className="text-green-200 text-sm mt-1">points earned</p>
                </div>
                <div className="text-6xl">⭐</div>
              </div>
              <div className="bg-white rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 font-medium">Progress to next reward</span>
                  <span className="text-[#1a5c38] font-bold">{(profile?.loyalty_points || 0) % 100}/100</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-[#d4a017] h-2 rounded-full transition-all"
                    style={{width: `${((profile?.loyalty_points || 0) % 100)}%`}}></div>
                </div>
                <p className="text-gray-500 text-xs mt-2">Every ₹100 spent = 1 point • 100 points = 1 litre free milk</p>
              </div>
              <button onClick={handleRedeemPoints} disabled={redeemLoading || (profile?.loyalty_points || 0) < 100}
                className="w-full text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                {redeemLoading ? 'Redeeming...' : `🥛 Redeem 100 Points for Free 1L Milk`}
              </button>
              {redeemMsg && <p className="text-center text-sm mt-3 font-medium">{redeemMsg}</p>}
            </div>

            {/* Streak & Badges */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8]">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">🔥 Delivery Streak</h3>
                <p className="text-xs text-gray-400 mt-0.5">Keep your streak going to unlock badges!</p>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold"
                    style={{background:'linear-gradient(135deg, #0d3320, #1a5c38)', color:'#d4a017'}}>
                    {profile?.streak_count || 0}
                  </div>
                  <div>
                    <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c]">{profile?.streak_count || 0} Day Streak</p>
                    <p className="text-gray-400 text-sm">consecutive delivery days</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(BADGE_INFO).map(([key, badge]) => {
                    const earned = (profile?.badges || []).includes(key)
                    return (
                      <div key={key}
                        className={`rounded-xl p-4 border-2 ${earned ? 'border-[#d4a017] bg-[#fdf6e3]' : 'border-[#e8e0d0]'}`}
                        style={!earned ? {backgroundColor:'#f5f5f5'} : {}}>
                        <div className="text-3xl mb-2">{earned ? badge.emoji : '🔒'}</div>
                        <p className="font-bold text-sm" style={{color: earned ? '#1c1c1c' : '#666'}}>{badge.label}</p>
                        <p className="text-xs mt-0.5" style={{color: earned ? '#888' : '#999'}}>{badge.days} days</p>
                        {earned && <span className="inline-block mt-1 text-[#d4a017] text-xs font-bold">✓ Earned!</span>}
                        {!earned && <span className="inline-block mt-1 text-xs" style={{color:'#999'}}>{Math.max(0, badge.days - (profile?.streak_count || 0))} days to go</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Points Expiry Warning */}
            {profile?.loyalty_points_expiry && (() => {
              const daysLeft = Math.ceil((new Date(profile.loyalty_points_expiry) - new Date()) / (1000 * 60 * 60 * 24))
              if (daysLeft > 30) return null
              return (
                <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⏰</span>
                  <div>
                    <p className="text-orange-700 font-bold text-sm">Points expire in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!</p>
                    <p className="text-orange-600 text-xs mt-1">Your {profile.loyalty_points} points expire on {new Date(profile.loyalty_points_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Redeem before they expire!</p>
                  </div>
                </div>
              )
            })()}

            {/* Refer & Earn */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8]">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">🎁 Refer & Earn</h3>
                <p className="text-sm text-gray-600 mt-1">Share your referral code. <strong>Both you and your friend earn 100 reward points</strong> after your friend subscribes for 30 days! 🎉</p>
              </div>
              <div className="px-6 py-5">
                <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-widest">Your Referral Code</p>
                  <div className="flex items-center gap-3">
                    <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#1a5c38] tracking-widest">
                      {profile?.referral_code || '---'}
                    </p>
                    <button onClick={copyReferralCode}
                      className="bg-[#1a5c38] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#14472c] transition">
                      {copyMsg || 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  {[
                    { icon: '📤', label: 'Share code' },
                    { icon: '📅', label: 'Friend subscribes 30 days' },
                    { icon: '⭐', label: 'Both get 100 pts' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="bg-[#fdfbf7] rounded-xl p-3 border border-[#e8e0d0]">
                      <div className="text-2xl mb-1">{icon}</div>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                <a href={`https://wa.me/?text=Get fresh farm milk delivered daily! Use my referral code ${profile?.referral_code || ''} when signing up at Sri Krishnaa Dairy. We both earn 100 reward points after you subscribe for 30 days! srikrishnaadairy.in`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl hover:bg-[#1da851] transition text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Share via WhatsApp
                </a>
              </div>
              {referrals.length > 0 && (
                <div className="border-t border-[#f5f0e8]">
                  <div className="px-6 py-4">
                    <p className="text-sm font-bold text-[#1c1c1c] mb-3">Your Referrals ({referrals.length})</p>
                    {referrals.map((ref) => {
                      const days = ref.subscription_days_count || 0
                      const isComplete = ref.status === 'completed'
                      const daysLeft = Math.max(0, 30 - days)
                      return (
                        <div key={ref.id} className="py-3 border-b border-[#f5f0e8] last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-[#1c1c1c]">{ref.profiles?.full_name || 'Friend'}</p>
                              <p className="text-xs text-gray-400">{new Date(ref.created_at).toLocaleDateString('en-IN')}</p>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              isComplete ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' :
                              'bg-gray-50 text-gray-500 border border-gray-200'
                            }`}>{isComplete ? '✓ Bonus earned!' : 'Pending'}</span>
                          </div>
                          {!isComplete && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Your friend has subscribed for {days}/30 days</span>
                                <span>{daysLeft} days to go</span>
                              </div>
                              <div className="bg-gray-100 rounded-full h-1.5">
                                <div className="bg-[#1a5c38] h-1.5 rounded-full transition-all"
                                  style={{width: `${Math.min(100, (days / 30) * 100)}%`}}></div>
                              </div>
                              <p className="text-xs text-[#d4a017] font-medium mt-1">Referral bonus pending — {daysLeft} day{daysLeft !== 1 ? 's' : ''} to go!</p>
                            </div>
                          )}
                          {isComplete && (
                            <p className="text-xs text-[#1a5c38] font-semibold">Referral bonus earned! +100 points credited</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ─── HISTORY TAB ─── */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-5">

            {/* Wallet Transactions */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">💰 Wallet Transactions</h3>
                <a href="/wallet" className="text-xs text-[#1a5c38] font-semibold bg-[#f0faf4] border border-[#c8e6d4] px-3 py-1.5 rounded-full hover:bg-[#d4eddf] transition">
                  Wallet →
                </a>
              </div>
              {transactions.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">No transactions yet.</div>
              ) : (
                transactions.slice(0, 20).map((txn, index) => (
                  <div key={txn.id}
                    className={`px-5 py-4 flex items-center justify-between ${index !== Math.min(transactions.length, 20) - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${txn.type === 'credit' ? 'bg-[#f0faf4]' : 'bg-red-50'}`}>
                        {txn.type === 'credit' ? '💰' : <img src="/bottle.png" alt="Milk" className="w-6 h-6 object-contain" />}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1c1c1c] text-sm">{txn.description}</p>
                        <p className="text-xs text-gray-400">{new Date(txn.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <p className={`font-bold ${txn.type === 'credit' ? 'text-[#1a5c38]' : 'text-red-500'}`}>
                      {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* All Orders */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8]">
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">📦 Order History</h3>
                <p className="text-xs text-gray-400 mt-0.5">{allOrders.length} total orders</p>
              </div>
              {allOrders.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">No orders placed yet.</div>
              ) : (
                allOrders.map((order, index) => (
                  <div key={order.id}
                    className={`px-6 py-4 flex items-center gap-4 ${index !== allOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 p-1.5">
                      <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c] text-sm">{order.products?.size} x {order.quantity}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.delivery_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} •
                        {order.delivery_slot === 'morning' ? ' 🌅 Morning' : ' 🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        order.status === 'delivered'  ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' :
                        order.status === 'pending'    ? 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]' :
                        order.status === 'cancelled'  ? 'bg-red-50 text-red-500 border border-red-200' :
                        'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}>{order.status}</span>
                      <p className="font-bold text-[#1a5c38] text-sm">₹{order.total_price}</p>
                      {order.status === 'pending' && (() => {
                        const cutoff = new Date(`${order.delivery_date}T06:00:00+05:30`)
                        return new Date() < cutoff ? (
                          <button onClick={() => { setCancelPopup(order); setCancelReason('') }}
                            className="text-[10px] text-red-500 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50 transition">
                            Cancel Order
                          </button>
                        ) : null
                      })()}
                      {order.status === 'delivered' && !reportedOrders.has(order.id) && (
                        <button onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession()
                          await fetch('/api/missed-delivery', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                            body: JSON.stringify({ order_id: order.id }),
                          })
                          setReportedOrders(prev => new Set([...prev, order.id]))
                        }} className="text-[10px] text-red-500 underline underline-offset-2 hover:text-red-700">
                          Report Issue
                        </button>
                      )}
                      {reportedOrders.has(order.id) && (
                        <span className="text-[10px] text-gray-400">Reported ✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ─── REPORT TAB ─── */}
        {activeTab === 'report' && (
          <div className="flex flex-col gap-5">

            {/* Monthly Summary */}
            <div className="rounded-2xl p-6 text-white shadow-lg"
              style={{background:'linear-gradient(135deg, #0d3320 0%, #1a5c38 100%)'}}>
              <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-1">Monthly Milk Report</p>
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white mb-5">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Bottles Ordered', value: report.totalBottles, unit: 'bottles', icon: <img src="/bottle.png" alt="Milk" className="w-8 h-8 object-contain" /> },
                  { label: 'Total Orders',     value: report.orderCount,  unit: 'orders',  icon: '📦' },
                  { label: 'Total Spent',      value: `₹${report.totalSpent}`, unit: 'this month', icon: '💰' },
                  { label: 'Money Saved',      value: `₹${report.moneySaved}`, unit: 'vs market',  icon: '🎉' },
                ].map(({ label, value, unit, icon }) => (
                  <div key={label} className="bg-white rounded-xl p-4">
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1c1c1c]">{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                    <p className="text-gray-400 text-xs">{unit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Breakdown */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">💡 Your Savings Insight</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-[#f5f0e8]">
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-sm">Milk from Us</p>
                    <p className="text-xs text-gray-400">Farm-fresh, direct delivery</p>
                  </div>
                  <p className="font-bold text-[#1a5c38]">₹{report.totalSpent}</p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[#f5f0e8]">
                  <div>
                    <p className="font-semibold text-[#1c1c1c] text-sm">Market Price Equivalent</p>
                    <p className="text-xs text-gray-400">Approx. retail / packaged milk cost</p>
                  </div>
                  <p className="font-bold text-gray-500">₹{report.totalSpent + report.moneySaved}</p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-[#d4a017] text-sm">You Saved!</p>
                    <p className="text-xs text-gray-400">This month with Sri Krishnaa Dairy</p>
                  </div>
                  <p className="font-bold text-[#d4a017] text-lg">₹{report.moneySaved}</p>
                </div>
              </div>
              <div className="bg-[#f0faf4] rounded-xl p-4 mt-2">
                <p className="text-[#1a5c38] text-xs font-semibold">
                  🌿 Plus you're getting fresher, preservative-free milk directly from the farm — no middlemen, no processing!
                </p>
              </div>
            </div>

            {/* Monthly Delivery Calendar hint */}
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-4">📅 This Month's Orders</h3>
              {(() => {
                const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
                const monthPrefix = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}`
                const thisMonthOrders = allOrders.filter(o => o.delivery_date?.startsWith(monthPrefix) && o.status !== 'cancelled')
                return thisMonthOrders.length === 0 ? (
                <p className="text-gray-400 text-sm">No orders this month yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {thisMonthOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2 border-b border-[#f5f0e8] last:border-0">
                      <span className="text-sm text-[#1c1c1c] font-medium">
                        {new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-sm text-gray-500">{order.products?.size} x{order.quantity}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        order.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38]' : 'bg-[#fdf6e3] text-[#d4a017]'
                      }`}>{order.status}</span>
                      <span className="font-bold text-[#1a5c38] text-sm">₹{order.total_price}</span>
                    </div>
                  ))}
                </div>
              )
              })()}
            </div>

          </div>
        )}

      </div>

      <Footer variant="app" />

      <DisclaimerPopup />
      <PushNotificationPrompt />

      {/* Cancel Order Confirmation Modal */}
      {cancelPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-[#1c1c1c] mb-2">Cancel Order?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to cancel your order for{' '}
              <strong>{new Date(cancelPopup.delivery_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>?<br/>
              <span className="text-xs text-gray-400">Cancellations are only allowed before 6AM on delivery day.</span>
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-[#1c1c1c] uppercase tracking-widest mb-1 block">Reason</label>
              <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                className="w-full border border-[#e8e0d0] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38]">
                <option value="">Select a reason</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Wrong date selected">Wrong date selected</option>
                <option value="Other plans">Other plans</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {cancelPopup.payment_method !== 'COD' && (
              <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-3 mb-4">
                <p className="text-xs text-[#1a5c38] font-semibold">₹{cancelPopup.total_price} will be refunded to your wallet</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCancelPopup(null)}
                className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
                Keep Order
              </button>
              <button
                disabled={cancelLoading}
                onClick={async () => {
                  setCancelLoading(true)
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/orders/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ order_id: cancelPopup.id, reason: cancelReason }),
                  })
                  if (res.ok) {
                    setAllOrders(prev => prev.map(o => o.id === cancelPopup.id ? { ...o, status: 'cancelled' } : o))
                    setCancelPopup(null)
                  }
                  setCancelLoading(false)
                }}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-600 transition disabled:opacity-50">
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
