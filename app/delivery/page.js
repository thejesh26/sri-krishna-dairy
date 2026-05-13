'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'

function isDeliveryDay(sub) {
  const freq = sub.delivery_frequency || 'daily'
  if (freq === 'daily') return true
  const start = new Date(sub.start_date)
  const today = new Date()
  const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  if (freq === 'alternate') return daysDiff % 2 === 0
  if (freq === 'weekly') return daysDiff % 7 === 0
  return true
}

export default function DeliveryDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [stats, setStats] = useState({ total: 0, pending: 0, out: 0, delivered: 0 })
  const [historyOrders, setHistoryOrders] = useState([])
  const [historySubDeliveries, setHistorySubDeliveries] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [deliverySort, setDeliverySort] = useState('area')
  const [deliveringId, setDeliveringId] = useState(null)
  const [deliveredSubs, setDeliveredSubs] = useState(new Set())
  const [addonOrders, setAddonOrders] = useState([])
  const [deliveredAddons, setDeliveredAddons] = useState(new Set())

  // Photo modal
  const [photoModal, setPhotoModal] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [bottleReturnedModal, setBottleReturnedModal] = useState(true)
  const [notDeliveredConfirm, setNotDeliveredConfirm] = useState(null)

  // Wallet request
  const [walletReqSearch, setWalletReqSearch] = useState('')
  const [walletReqCustomer, setWalletReqCustomer] = useState(null)
  const [walletReqAction, setWalletReqAction] = useState('add')
  const [walletReqAmount, setWalletReqAmount] = useState('')
  const [walletReqNote, setWalletReqNote] = useState('')
  const [walletReqLoading, setWalletReqLoading] = useState(false)
  const [walletRequests, setWalletRequests] = useState([])
  const [walletReqsLoaded, setWalletReqsLoaded] = useState(false)

  // Report
  const [reportTab, setReportTab] = useState('issue')
  const [reportMessage, setReportMessage] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [pastReports, setPastReports] = useState([])
  const [reportsLoaded, setReportsLoaded] = useState(false)

  const { showSuccess, showError, showInfo } = useToast()

  useEffect(() => { checkDelivery() }, [])

  const checkDelivery = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const u = session.user
    setUser(u)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!prof?.is_delivery && !prof?.is_admin) { router.push('/'); return }
    setProfile(prof)
    await loadDeliveries(u.id, prof)
    setLoading(false)
  }

  const loadDeliveries = async (userId, prof) => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    let ordersQuery = supabase
      .from('orders')
      .select('*, products(*), profiles(*)')
      .eq('delivery_date', today)
      .in('status', ['pending', 'out_for_delivery'])
      .order('delivery_slot', { ascending: true })
    if (!prof?.is_admin) ordersQuery = ordersQuery.eq('assigned_to', userId)
    const { data: allOrders } = await ordersQuery
    setOrders(allOrders || [])

    let subsQuery = supabase
      .from('subscriptions')
      .select('*, products(*), profiles(*)')
      .eq('is_active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('delivery_slot', { ascending: true })
    if (!prof?.is_admin) subsQuery = subsQuery.eq('assigned_to', userId)
    const { data: allSubs } = await subsQuery
    const activeSubs = (allSubs || []).filter(sub =>
      !(sub.paused_dates || []).includes(today) && isDeliveryDay(sub)
    )
    setSubscriptions(activeSubs)

    const { data: allAddons } = await supabase
      .from('addon_orders')
      .select('*, products(*), profiles!addon_orders_user_id_fkey(*)')
      .eq('delivery_date', today)
      .eq('status', 'pending')
    setAddonOrders(allAddons || [])

    const allDeliveries = [...(allOrders || [])]
    setStats({
      total: allDeliveries.length + activeSubs.length,
      pending: allDeliveries.filter(o => o.status === 'pending').length + activeSubs.length,
      out: allDeliveries.filter(o => o.status === 'out_for_delivery').length,
      delivered: allDeliveries.filter(o => o.status === 'delivered').length,
    })
  }

  const updateStatus = async (orderId, status) => {
    const ownershipFilter = profile?.is_admin
      ? supabase.from('orders').update({ status }).eq('id', orderId)
      : supabase.from('orders').update({ status }).eq('id', orderId).eq('assigned_to', user.id)
    const { error } = await ownershipFilter
    if (!error) {
      if (status === 'delivered') {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/delivery/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ type: 'order', order_id: orderId }),
        })
      }
      const updated = orders.map(o => o.id === orderId ? { ...o, status } : o)
      setOrders(updated)
      setStats({
        total: updated.length,
        pending: updated.filter(o => o.status === 'pending').length,
        out: updated.filter(o => o.status === 'out_for_delivery').length,
        delivered: updated.filter(o => o.status === 'delivered').length,
      })
    }
  }

  const loadHistory = async () => {
    if (historyLoaded) return
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    let q = supabase
      .from('orders')
      .select('*, products(*), profiles(*)')
      .eq('status', 'delivered')
      .lt('delivery_date', today)
      .order('delivery_date', { ascending: false })
      .limit(100)
    if (!profile?.is_admin) q = q.eq('assigned_to', user.id)
    const { data: orderHistory } = await q
    setHistoryOrders(orderHistory || [])

    let sdQuery = supabase
      .from('subscription_deliveries')
      .select('*, subscriptions(*, products(*), profiles(*))')
      .lt('delivery_date', today)
      .order('delivery_date', { ascending: false })
      .limit(100)
    if (!profile?.is_admin) sdQuery = sdQuery.eq('delivered_by', profile?.full_name)
    const { data: sdHistory } = await sdQuery
    setHistorySubDeliveries(sdHistory || [])
    setHistoryLoaded(true)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'history') loadHistory()
    if (tab === 'report' && !reportsLoaded) loadReports()
    if (tab === 'wallet' && !walletReqsLoaded) loadWalletRequests()
  }

  // ── Wallet Request ──────────────────────────────────────────────────────────

  const loadWalletRequests = async () => {
    if (!user) return
    const { data } = await supabase
      .from('wallet_requests')
      .select('*, profiles!wallet_requests_target_user_id_fkey(full_name)')
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setWalletRequests(data || [])
    setWalletReqsLoaded(true)
  }

  const searchWalletReqCustomer = async () => {
    if (!walletReqSearch.trim()) return
    setWalletReqCustomer(null)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, apartment_name, flat_number')
      .or(`phone.ilike.%${walletReqSearch.trim()}%,full_name.ilike.%${walletReqSearch.trim()}%`)
      .limit(5)
    if (!profiles || profiles.length === 0) { showInfo('No customer found.'); return }
    const p = profiles[0]
    const { data: wallet } = await supabase.from('wallet').select('balance').eq('user_id', p.id).maybeSingle()
    setWalletReqCustomer({ ...p, balance: wallet?.balance || 0 })
  }

  const handleWalletRequest = async () => {
    if (!walletReqCustomer) return
    const amt = parseFloat(walletReqAmount)
    if (!walletReqAmount || isNaN(amt) || amt <= 0) { showError('Enter a valid amount.'); return }
    setWalletReqLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/delivery/wallet-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ target_user_id: walletReqCustomer.id, action: walletReqAction, amount: amt, note: walletReqNote || undefined }),
    })
    const result = await res.json()
    if (!res.ok) {
      showError(result.error || 'Could not submit request.')
    } else {
      showSuccess('Request submitted! Admin will review it.')
      setWalletReqAmount('')
      setWalletReqNote('')
      setWalletReqCustomer(null)
      setWalletReqSearch('')
      setWalletReqsLoaded(false)
      await loadWalletRequests()
    }
    setWalletReqLoading(false)
  }

  // ── Photo proof delivery ────────────────────────────────────────────────────

  const handlePhotoConfirm = async () => {
    if (!photoModal || !photoFile) return
    setPhotoUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const ts = Date.now()
      const filePath = `delivery-photos/${today}/${photoModal.subId}_${ts}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from('delivery-agent-docs')
        .upload(filePath, photoFile, { contentType: photoFile.type || 'image/jpeg', upsert: true })
      if (uploadErr) { showError('Photo upload failed. Please try again.'); setPhotoUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('delivery-agent-docs').getPublicUrl(filePath)
      const res = await fetch('/api/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: 'subscription',
          subscription_id: photoModal.subId,
          delivery_date: today,
          bottle_returned: bottleReturnedModal,
          not_delivered: false,
          photo_url: publicUrl,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showError(err.error || 'Failed to confirm delivery.')
        setPhotoUploading(false)
        return
      }
      setDeliveredSubs(prev => new Set([...prev, photoModal.subId]))
      setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1), delivered: s.delivered + 1 }))
      setPhotoModal(null)
      setPhotoFile(null)
      setBottleReturnedModal(true)
      showSuccess('Delivery confirmed!')
    } catch { showError('Something went wrong.') }
    setPhotoUploading(false)
  }

  const handleNotDelivered = async (subId) => {
    setDeliveringId(subId)
    const { data: { session } } = await supabase.auth.getSession()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const res = await fetch('/api/delivery/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ type: 'subscription', subscription_id: subId, delivery_date: today, bottle_returned: false, not_delivered: true }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      showError(err.error || 'Failed. Please try again.')
    } else {
      setDeliveredSubs(prev => new Set([...prev, subId]))
    }
    setNotDeliveredConfirm(null)
    setDeliveringId(null)
  }

  // ── Report ──────────────────────────────────────────────────────────────────

  const loadReports = async () => {
    if (!user) return
    const { data } = await supabase
      .from('delivery_issues')
      .select('*')
      .eq('reported_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setPastReports(data || [])
    setReportsLoaded(true)
  }

  const handleSubmitReport = async () => {
    if (!reportMessage.trim()) { showError('Please enter a message.'); return }
    setReportSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/delivery/submit-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ type: reportTab, message: reportMessage }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      showError(err.error || 'Could not submit.')
    } else {
      showSuccess('Submitted! Thank you.')
      setReportMessage('')
      setReportsLoaded(false)
      await loadReports()
    }
    setReportSubmitting(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <div className="text-center">
        <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-20 w-20 rounded-full mx-auto border-4 border-[#d4a017] object-cover shadow-lg mb-4" />
        <p className="text-[#1a5c38] font-semibold">Loading deliveries...</p>
      </div>
    </div>
  )

  const filteredOrders = (activeTab === 'pending'
    ? orders.filter(o => o.status === 'pending')
    : activeTab === 'out'
    ? orders.filter(o => o.status === 'out_for_delivery')
    : activeTab === 'delivered'
    ? orders.filter(o => o.status === 'delivered')
    : orders
  ).slice().sort((a, b) => {
    const pa = a.profiles, pb = b.profiles
    if (deliverySort === 'area') return (pa?.area || '').localeCompare(pb?.area || '')
    if (deliverySort === 'building') return (pa?.apartment_name || '').localeCompare(pb?.apartment_name || '')
    return (pa?.full_name || '').localeCompare(pb?.full_name || '')
  })

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Photo proof modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-1">Confirm Delivery</h3>
            <p className="text-xs text-gray-500 mb-4">{photoModal.customerName}</p>
            <label className="block w-full border-2 border-dashed border-[#e8e0d0] rounded-xl p-4 text-center cursor-pointer hover:border-[#1a5c38] transition mb-3">
              {photoFile ? (
                <div>
                  <img src={URL.createObjectURL(photoFile)} alt="preview" className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                  <p className="text-xs text-[#1a5c38] font-semibold">Photo selected ✓</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl mb-1">📷</p>
                  <p className="text-sm text-gray-500">Tap to take / upload photo</p>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </label>
            <div className="flex items-center justify-between bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl p-3 mb-4">
              <span className="text-sm font-medium text-[#1c1c1c]">Bottle returned?</span>
              <button onClick={() => setBottleReturnedModal(!bottleReturnedModal)}
                className={`relative w-12 h-6 rounded-full transition-colors ${bottleReturnedModal ? 'bg-[#1a5c38]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${bottleReturnedModal ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPhotoModal(null); setPhotoFile(null); setBottleReturnedModal(true) }}
                className="flex-1 border border-[#e8e0d0] text-gray-500 font-bold py-3 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={handlePhotoConfirm} disabled={!photoFile || photoUploading}
                className="flex-1 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                {photoUploading ? 'Uploading...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Not Delivered confirm */}
      {notDeliveredConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <p className="text-3xl text-center mb-3">❌</p>
            <h3 className="font-bold text-[#1c1c1c] text-center mb-2">Mark as Not Delivered?</h3>
            <p className="text-xs text-gray-500 text-center mb-4">Customer will not be charged. Admin will be notified.</p>
            <div className="flex gap-2">
              <button onClick={() => setNotDeliveredConfirm(null)}
                className="flex-1 border border-[#e8e0d0] text-gray-500 font-bold py-3 rounded-xl text-sm">
                Cancel
              </button>
              <button onClick={() => handleNotDelivered(notDeliveredConfirm)}
                disabled={deliveringId === notDeliveredConfirm}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
                {deliveringId === notDeliveredConfirm ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-40">
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
            <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-white">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-green-200 text-xs mb-4 mt-0.5">
              Deliveries for: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total',   value: stats.total,     color: 'text-white'        },
                { label: 'Pending', value: stats.pending,   color: 'text-yellow-300'   },
                { label: 'Out',     value: stats.out,       color: 'text-blue-300'     },
                { label: 'Done',    value: stats.delivered, color: 'text-[#d4a017]'    },
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
            <div className="px-5 py-4 border-b border-[#f5f0e8] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Subscription Deliveries</h3>
                <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1 rounded-full border border-[#f0dfa0]">
                  {subscriptions.length} customers
                </span>
              </div>
              <select value={deliverySort} onChange={e => setDeliverySort(e.target.value)}
                className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-1.5 text-[#1c1c1c] bg-[#fdfbf7] focus:outline-none focus:border-[#1a5c38]">
                <option value="area">Sort by Area</option>
                <option value="building">Sort by Building</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
            {[...subscriptions].sort((a, b) => {
              const pa = a.profiles, pb = b.profiles
              if (deliverySort === 'area') return (pa?.area || '').localeCompare(pb?.area || '')
              if (deliverySort === 'building') return (pa?.apartment_name || '').localeCompare(pb?.apartment_name || '')
              return (pa?.full_name || '').localeCompare(pb?.full_name || '')
            }).map((sub, index) => (
              <div key={sub.id} className={`px-5 py-4 ${index !== subscriptions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {sub.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#1c1c1c] text-sm">{sub.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{sub.profiles?.apartment_name}, Flat {sub.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{sub.profiles?.area}</p>
                    {sub.profiles?.landmark && <p className="text-xs text-[#d4a017]">📍 Near: {sub.profiles?.landmark}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs px-2 py-0.5 rounded-full">{sub.products?.size} x {sub.quantity}</span>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full">{sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={`tel:${sub.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    <a href={`https://wa.me/91${sub.profiles?.phone}`} target="_blank"
                      className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 inline" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WA
                    </a>
                    {deliveredSubs.has(sub.id) ? (
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] text-center">✅ Done</span>
                    ) : deliveringId === sub.id ? (
                      <span className="text-xs text-gray-400 px-3 py-1.5">...</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => { setPhotoModal({ subId: sub.id, customerName: sub.profiles?.full_name || 'Customer' }); setBottleReturnedModal(true); setPhotoFile(null) }}
                          className="bg-[#1a5c38] text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-[#14472c] transition w-full">
                          📷 Mark Delivered
                        </button>
                        <button
                          onClick={() => setNotDeliveredConfirm(sub.id)}
                          className="bg-red-500 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-600 transition w-full">
                          ❌ Not Delivered
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add-on Orders */}
        {addonOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#f0dfa0] overflow-hidden mb-5 shadow-sm">
            <div className="px-5 py-4 border-b border-[#f5f0e8] flex items-center gap-2">
              <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">Extra Orders (Add-ons)</h3>
              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-bold px-3 py-1 rounded-full border border-[#f0dfa0]">EXTRA</span>
            </div>
            {addonOrders.map((addon, index) => (
              <div key={addon.id} className={`px-5 py-4 ${index !== addonOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#d4a017] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {addon.profiles?.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#1c1c1c] text-sm">{addon.profiles?.full_name}</p>
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#f0dfa0]">EXTRA</span>
                    </div>
                    <p className="text-xs text-gray-400">{addon.profiles?.apartment_name}, Flat {addon.profiles?.flat_number}</p>
                    <p className="text-xs text-gray-400">{addon.profiles?.area}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full border border-[#f0dfa0]">{addon.products?.size} × {addon.quantity}</span>
                      <span className="text-xs text-gray-400">{addon.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={`tel:${addon.profiles?.phone}`}
                      className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                      📞 Call
                    </a>
                    {deliveredAddons.has(addon.id) ? (
                      <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] text-center">✅ Done</span>
                    ) : (
                      <button onClick={async () => {
                        await supabase.from('addon_orders').update({ status: 'delivered' }).eq('id', addon.id)
                        setDeliveredAddons(prev => new Set([...prev, addon.id]))
                      }}
                        className="bg-[#d4a017] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#b8860b] transition">
                        ✓ Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <select value={deliverySort} onChange={e => setDeliverySort(e.target.value)}
            className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 text-[#1c1c1c] bg-white focus:outline-none focus:border-[#1a5c38] shadow-sm">
            <option value="area">Sort by Area</option>
            <option value="building">Sort by Building</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
        <div className="flex gap-1 mb-4 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'all',       label: 'All',        count: stats.total     },
            { id: 'pending',   label: 'Pending',    count: stats.pending   },
            { id: 'out',       label: 'Out',        count: stats.out       },
            { id: 'delivered', label: 'Done',       count: stats.delivered },
            { id: 'history',   label: '📋 History', count: null            },
            { id: 'wallet',    label: '💳 Wallet',  count: null            },
            { id: 'report',    label: '📝 Report',  count: null            },
          ].map(({ id, label, count }) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
              }`}>
              {label}
              {count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white text-[#1a5c38]' : 'bg-gray-100'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            {(() => {
              const allItems = [
                ...(historyOrders || []).map(o => ({
                  id: o.id, date: o.delivery_date, type: 'order',
                  name: o.profiles?.full_name || 'Customer',
                  area: `${o.profiles?.apartment_name || ''}, ${o.profiles?.area || ''}`,
                  product: `${o.products?.size || 'Milk'} x${o.quantity || 1}`,
                  slot: o.delivery_slot, photo_url: null,
                })),
                ...(historySubDeliveries || []).map(sd => ({
                  id: sd.id, date: sd.delivery_date, type: 'sub',
                  name: sd.subscriptions?.profiles?.full_name || 'Customer',
                  area: `${sd.subscriptions?.profiles?.apartment_name || ''}, ${sd.subscriptions?.profiles?.area || ''}`,
                  product: `${sd.subscriptions?.products?.size || 'Milk'} x${sd.subscriptions?.quantity || 1}`,
                  slot: sd.subscriptions?.delivery_slot, photo_url: sd.photo_url || null,
                })),
              ].sort((a, b) => b.date.localeCompare(a.date))

              if (allItems.length === 0) return (
                <div className="bg-white rounded-2xl border border-[#e8e0d0] px-5 py-12 text-center shadow-sm">
                  <div className="text-5xl mb-3">📋</div>
                  <p className="text-gray-400 text-sm">No delivery history yet.</p>
                </div>
              )

              const byDate = allItems.reduce((acc, item) => {
                if (!acc[item.date]) acc[item.date] = []
                acc[item.date].push(item)
                return acc
              }, {})

              return Object.entries(byDate).slice(0, 14).map(([date, items]) => (
                <div key={date} className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-[#f5f0e8] flex items-center justify-between bg-[#fdfbf7]">
                    <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] text-sm">
                      {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c8e6d4]">
                      ✅ {items.length} delivered
                    </span>
                  </div>
                  {items.map((item, idx) => (
                    <div key={item.id} className={`px-5 py-3 flex items-center gap-3 ${idx !== items.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="w-8 h-8 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {item.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#1c1c1c] text-sm">{item.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.type === 'sub' ? 'bg-[#f0faf4] text-[#1a5c38]' : 'bg-[#fdf6e3] text-[#d4a017]'}`}>
                            {item.type === 'sub' ? '📅 Sub' : '🛒 Order'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{item.area}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.photo_url && (
                          <img src={item.photo_url} alt="proof" className="w-10 h-10 rounded-lg object-cover border border-[#e8e0d0]" />
                        )}
                        <div className="text-right">
                          <p className="text-xs font-semibold text-[#1a5c38]">{item.product}</p>
                          <p className="text-xs text-gray-400">{item.slot === 'morning' ? '🌅' : '🌆'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            })()}
          </div>
        )}

        {/* Wallet Request Tab */}
        {activeTab === 'wallet' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-5 shadow-sm">
              <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-1">Raise Wallet Request</p>
              <p className="text-xs text-gray-400 mb-4">Requests go to admin for approval. You cannot directly modify customer wallets.</p>
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="Search customer by name or phone..."
                  value={walletReqSearch}
                  onChange={e => setWalletReqSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchWalletReqCustomer()}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
                <button onClick={searchWalletReqCustomer}
                  className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition">
                  Search
                </button>
              </div>
              {walletReqCustomer && (
                <div>
                  <div className="bg-[#f0faf4] border border-[#c8e6d4] rounded-xl p-4 mb-4">
                    <p className="font-bold text-[#1a5c38] text-sm">{walletReqCustomer.full_name}</p>
                    <p className="text-xs text-gray-500">{walletReqCustomer.apartment_name}, Flat {walletReqCustomer.flat_number} · {walletReqCustomer.phone}</p>
                    <p className="text-lg font-bold text-[#1a5c38] mt-2">Balance: Rs.{walletReqCustomer.balance}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[['add', '+ Add Balance'], ['deduct', '- Deduct Balance']].map(([val, label]) => (
                      <button key={val} onClick={() => setWalletReqAction(val)}
                        className={`py-2 rounded-lg text-sm font-bold border-2 transition ${
                          walletReqAction === val
                            ? val === 'deduct' ? 'border-red-400 bg-red-50 text-red-600' : 'border-[#1a5c38] bg-[#f0faf4] text-[#1a5c38]'
                            : 'border-[#e8e0d0] text-gray-500'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder="Amount (Rs.)" value={walletReqAmount}
                    onChange={e => setWalletReqAmount(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] mb-2" />
                  <input type="text" placeholder="Reason / note" value={walletReqNote}
                    onChange={e => setWalletReqNote(e.target.value)}
                    className="w-full border border-[#e8e0d0] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] mb-3" />
                  <button onClick={handleWalletRequest} disabled={walletReqLoading}
                    className="w-full text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 hover:opacity-90"
                    style={{background:'linear-gradient(135deg,#1a5c38,#2d7a50)'}}>
                    {walletReqLoading ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              )}
            </div>
            {walletRequests.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#f5f0e8]">
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">My Past Requests</p>
                </div>
                {walletRequests.map((req, idx) => (
                  <div key={req.id} className={`px-5 py-3 flex items-center justify-between gap-3 ${idx !== walletRequests.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1c1c1c]">{req.profiles?.full_name || req.target_user_id}</p>
                      <p className="text-xs text-gray-400">{req.action === 'add' ? '+ Add' : '- Deduct'} Rs.{req.amount}{req.note ? ` · ${req.note}` : ''}</p>
                      <p className="text-xs text-gray-300">{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${
                      req.status === 'approved' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]'
                      : req.status === 'rejected' ? 'bg-red-50 text-red-500 border border-red-200'
                      : 'bg-yellow-50 text-yellow-600 border border-yellow-200'
                    }`}>
                      {req.status === 'approved' ? '✅ Approved' : req.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-[#e8e0d0] p-5 shadow-sm">
              <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c] mb-4">Submit Report</p>
              <div className="flex gap-1 bg-[#fdfbf7] border border-[#e8e0d0] rounded-xl p-1 mb-4">
                {[['issue', '⚠️ Issue'], ['feedback', '💬 Feedback'], ['suggestion', '💡 Suggestion']].map(([val, label]) => (
                  <button key={val} onClick={() => setReportTab(val)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                      reportTab === val ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder={reportTab === 'issue' ? 'Describe the issue...' : reportTab === 'feedback' ? 'Share your feedback...' : 'Share a suggestion...'}
                value={reportMessage}
                onChange={e => setReportMessage(e.target.value)}
                rows={4}
                className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] resize-none mb-3"
              />
              <button onClick={handleSubmitReport} disabled={reportSubmitting || !reportMessage.trim()}
                className="w-full text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-50 hover:opacity-90"
                style={{background:'linear-gradient(135deg,#1a5c38,#2d7a50)'}}>
                {reportSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            {pastReports.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#f5f0e8]">
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-[#1c1c1c]">My Past Reports</p>
                </div>
                {pastReports.map((r, idx) => (
                  <div key={r.id} className={`px-5 py-3 ${idx !== pastReports.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.type === 'issue' ? 'bg-red-50 text-red-500' : r.type === 'feedback' ? 'bg-blue-50 text-blue-500' : 'bg-yellow-50 text-yellow-600'
                          }`}>
                            {r.type === 'issue' ? '⚠️ Issue' : r.type === 'feedback' ? '💬 Feedback' : '💡 Suggestion'}
                          </span>
                          <span className="text-xs text-gray-300">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <p className="text-sm text-[#1c1c1c]">{r.message}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        r.status === 'resolved' ? 'bg-[#f0faf4] text-[#1a5c38]' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {r.status === 'resolved' ? '✅' : '⏳'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Today's Orders List */}
        {activeTab !== 'history' && activeTab !== 'wallet' && activeTab !== 'report' && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            {filteredOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-5xl mb-3">{activeTab === 'delivered' ? '🎉' : '📭'}</div>
                <p className="text-gray-400 text-sm">
                  {activeTab === 'delivered' ? 'No deliveries completed yet'
                   : activeTab === 'pending' ? 'No pending deliveries!'
                   : activeTab === 'out' ? 'No deliveries out yet'
                   : 'No orders for today'}
                </p>
              </div>
            ) : (
              filteredOrders.map((order, index) => (
                <div key={order.id} className={`px-5 py-4 ${index !== filteredOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {order.profiles?.full_name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#1c1c1c] text-sm">{order.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">{order.profiles?.apartment_name}, Flat {order.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400">{order.profiles?.area}</p>
                      {order.profiles?.landmark && <p className="text-xs text-[#d4a017]">📍 Near: {order.profiles?.landmark}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-[#f0faf4] text-[#1a5c38] text-xs px-2 py-0.5 rounded-full">{order.products?.size} x {order.quantity}</span>
                        <span className="bg-[#fdf6e3] text-[#d4a017] text-xs px-2 py-0.5 rounded-full">{order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</span>
                        <span className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full">COD ₹{order.total_price}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <a href={`tel:${order.profiles?.phone}`}
                        className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#c8e6d4] hover:bg-[#d4eddf] transition text-center">
                        📞 Call
                      </a>
                      <a href={`https://wa.me/91${order.profiles?.phone}`} target="_blank"
                        className="bg-[#25D366] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5 inline" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WA
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 ml-13">
                    {order.status === 'pending' && (
                      <button onClick={() => updateStatus(order.id, 'out_for_delivery')}
                        className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded-lg hover:bg-blue-100 transition">
                        🚴 Out for Delivery
                      </button>
                    )}
                    {(order.status === 'pending' || order.status === 'out_for_delivery') && (
                      <button onClick={() => updateStatus(order.id, 'delivered')}
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
        )}

      </div>
    </div>
  )
}
