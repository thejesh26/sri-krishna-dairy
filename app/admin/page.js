'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ToastContext'
import { SkeletonStatCard } from '../components/Skeleton'

export default function AdminDashboard() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [overviewSubTab, setOverviewSubTab] = useState('today')
  const [ordersSubTab, setOrdersSubTab] = useState('pending')
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [customers, setCustomers] = useState([])
  const [todayOrders, setTodayOrders] = useState([])
  const [todaySubscriptions, setTodaySubscriptions] = useState([])
  const [subDeliveryStatuses, setSubDeliveryStatuses] = useState({})
  const [subDeliveryCounts, setSubDeliveryCounts] = useState({})
  const [deliveryAgents, setDeliveryAgents] = useState([])
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [stopSubPopup, setStopSubPopup] = useState(null)
  const [stoppingSubId, setStoppingSubId] = useState(null)
  const [showCancelledSubs, setShowCancelledSubs] = useState(false)
  const [reactivatingSubId, setReactivatingSubId] = useState(null)
  const [wallets, setWallets] = useState([])
  const [walletsWithProfiles, setWalletsWithProfiles] = useState([])
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
  const [failedDeductions, setFailedDeductions] = useState([])
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
  // Settings tab state
  const [appSettings, setAppSettings] = useState({
    max_subscribers: '',
    delivery_cutoff_time: '18:00',
    waitlist_enabled: 'true',
    maintenance_mode: 'false',
    min_wallet_balance: '300',
    pause_limit_per_month: '5',
    morning_slot_enabled: 'true',
    evening_slot_enabled: 'true',
    trial_order_enabled: 'true',
    bottle_deposit_amount: '200',
    holidays: '[]',
  })
  const [settingsSaving, setSettingsSaving] = useState({})
  const [editProducts, setEditProducts] = useState({})
  const [newProduct, setNewProduct] = useState({ name: '', size: '', price: '', is_available: true })
  const [productAddLoading, setProductAddLoading] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [settingsCustomers, setSettingsCustomers] = useState([])
  const [extendDaysMap, setExtendDaysMap] = useState({})
  const [pauseDateMap, setPauseDateMap] = useState({})
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastConfirm, setBroadcastConfirm] = useState(false)
  const [waitlistEntries, setWaitlistEntries] = useState([])
  const [newHoliday, setNewHoliday] = useState('')
  const [invitingId, setInvitingId] = useState(null)
  const [resendWaLoading, setResendWaLoading] = useState({})
  const [customWaModal, setCustomWaModal] = useState(null)
  const [customWaMessage, setCustomWaMessage] = useState('')
  const [customWaType, setCustomWaType] = useState('custom')
  const [customWaLoading, setCustomWaLoading] = useState(false)
  const [walletsLastUpdated, setWalletsLastUpdated] = useState(null)
  const [deliveryHistory, setDeliveryHistory] = useState([])
  const [historyDateFilter, setHistoryDateFilter] = useState('')
  const [historyAgentFilter, setHistoryAgentFilter] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [cancelledSubCounts, setCancelledSubCounts] = useState({})
  const [stopCancelledBy, setStopCancelledBy] = useState('admin')
  const [stopCancellationReason, setStopCancellationReason] = useState('')
  const [customersSubTab, setCustomersSubTab] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [walletRequests, setWalletRequests] = useState([])
  const [inlineWallet, setInlineWallet] = useState({})
  const [agentsSubTab, setAgentsSubTab] = useState('list')
  const [deliveryAgentRecords, setDeliveryAgentRecords] = useState([])
  const [agentForm, setAgentForm] = useState({ full_name: '', phone: '', email: '', password: '', address: '', dl_number: '', bike_number: '' })
  const [agentPhoto, setAgentPhoto] = useState(null)
  const [agentDoc, setAgentDoc] = useState(null)
  const [agentSaving, setAgentSaving] = useState(false)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignAreaFilter, setAssignAreaFilter] = useState('all')
  const [assignDateFilter, setAssignDateFilter] = useState('')
  const [assignSlotFilter, setAssignSlotFilter] = useState('all')

  useEffect(() => { checkAdmin() }, [])

  useEffect(() => {
    if (activeTab !== 'customers') return
    const interval = setInterval(() => { loadWallets() }, 30000)
    return () => clearInterval(interval)
  }, [activeTab])

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
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

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
      sub.is_active === true &&
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

    // Load all failed deductions
    const { data: failedDeds } = await supabase
      .from('failed_deductions')
      .select('*')
      .order('created_at', { ascending: false })
    setFailedDeductions(failedDeds || [])

    // Load wallet requests (agent-submitted top-up/deduct requests)
    const { data: walletReqs } = await supabase
      .from('wallet_requests')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
    setWalletRequests(walletReqs || [])

    // Load all customers
    const { data: allCustomers } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setCustomers((allCustomers || []).filter(c => !c.is_admin))
    setDeliveryAgents((allCustomers || []).filter(c => c.is_delivery))

    // Load delivery_agents table for extra fields (DL, bike, photo, active status)
    const { data: daRecords } = await supabase.from('delivery_agents').select('*')
    setDeliveryAgentRecords(daRecords || [])

    // Calculate stats
    const todayRevenue = todayO.reduce((sum, o) => sum + (o.total_price || 0), 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthOrders = (allOrders || []).filter(o =>
      new Date(o.created_at) >= monthStart
    )
    const monthlyRevenue = monthOrders.reduce((sum, o) => sum + (o.total_price || 0), 0)

    // Load subscription delivery counts for Day X display
    if (todaySubs.length > 0) {
      const subIds = todaySubs.map(s => s.id)
      const { data: deliveryRows } = await supabase
        .from('subscription_deliveries')
        .select('subscription_id')
        .in('subscription_id', subIds)
        .eq('not_delivered', false)
      const counts = {}
      ;(deliveryRows || []).forEach(d => {
        counts[d.subscription_id] = (counts[d.subscription_id] || 0) + 1
      })
      setSubDeliveryCounts(counts)
    }

    // Load all wallets via service-role API (bypasses RLS)
    await loadWallets()
    setStats({
      totalOrders: allOrders?.length || 0,
      totalSubscriptions: allSubs?.length || 0,
      totalCustomers: (allCustomers || []).filter(c => !c.is_admin).length,
      todayRevenue,
      monthlyRevenue,
    })

    // Load settings tab data
    const { data: settingsData } = await supabase.from('app_settings').select('key, value')
    if (settingsData) {
      const map = {}
      settingsData.forEach(row => { map[row.key] = row.value })
      setAppSettings(prev => ({ ...prev, ...map }))
    }
    const { data: waitlist } = await supabase.from('priority_waitlist').select('*').order('created_at', { ascending: false })
    setWaitlistEntries(waitlist || [])
  }

  const loadWallets = async () => {
    const { data: walletData, error: walletError } = await supabase.from('wallet').select('*')
    if (walletError) {
      console.error('[Admin] Wallets fetch error:', walletError.message)
      // Fall back to service-role API
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/wallets', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setWallets(json.wallets || [])
        setWalletsLastUpdated(new Date())
      }
      return
    }
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, phone, area')
      .eq('is_admin', false)
      .eq('is_delivery', false)
    const merged = (walletData || []).map(w => ({
      ...w,
      profile: profileData?.find(p => p.id === w.user_id) || null,
    }))
    setWallets(walletData || [])
    setWalletsWithProfiles(merged)
    setWalletsLastUpdated(new Date())
  }

  const handleAdminTabChange = async (id) => {
    setActiveTab(id)
    if (id === 'customers') await loadWallets()
    if (id === 'delivery_history' && !historyLoaded) loadDeliveryHistory()
  }

  const loadDeliveryHistory = async () => {
    setHistoryLoading(true)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fromDate = sevenDaysAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    // Fetch subscription delivery records
    const { data: subDeliveries } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .gte('delivery_date', fromDate)
      .order('delivery_date', { ascending: false })

    // Fetch delivered orders
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('*, profiles(*), products(*)')
      .eq('status', 'delivered')
      .gte('delivery_date', fromDate)
      .order('delivery_date', { ascending: false })

    const combined = [
      ...(subDeliveries || []).map(d => {
        const sub = subscriptions.find(s => s.id === d.subscription_id)
        const customer = customers.find(c => c.id === d.user_id)
        return {
          id: 'sub-' + d.id,
          type: 'subscription',
          customerName: customer?.full_name || 'Unknown',
          phone: customer?.phone || '',
          product: sub?.products?.size || 'Milk',
          quantity: sub?.quantity || 1,
          deliveredBy: d.delivered_by || '-',
          deliveredAt: d.delivered_at,
          date: d.delivery_date,
        }
      }),
      ...(deliveredOrders || []).map(o => ({
        id: 'ord-' + o.id,
        type: 'order',
        customerName: o.profiles?.full_name || 'Unknown',
        phone: o.profiles?.phone || '',
        product: o.products?.size || 'Milk',
        quantity: o.quantity || 1,
        deliveredBy: o.delivered_by || '-',
        deliveredAt: o.delivered_at || o.updated_at,
        date: o.delivery_date,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    setDeliveryHistory(combined)
    setHistoryLoaded(true)
    setHistoryLoading(false)
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
      await loadWallets()
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

  // ── Settings helpers ─────────────────────────────────────────────────────────

  const loadAppSettings = async () => {
    const { data } = await supabase.from('app_settings').select('key, value')
    if (data) {
      const map = {}
      data.forEach(row => { map[row.key] = row.value })
      setAppSettings(prev => ({ ...prev, ...map }))
    }
  }

  const loadWaitlist = async () => {
    const { data } = await supabase.from('priority_waitlist').select('*').order('created_at', { ascending: false })
    setWaitlistEntries(data || [])
  }

  const saveSetting = async (key, value) => {
    setSettingsSaving(prev => ({ ...prev, [key]: true }))
    await supabase.from('app_settings').upsert({ key, value: String(value) }, { onConflict: 'key' })
    setAppSettings(prev => ({ ...prev, [key]: String(value) }))
    setSettingsSaving(prev => ({ ...prev, [key]: false }))
    showSuccess('Saved!')
  }

  const addHoliday = async () => {
    if (!newHoliday) return
    const holidays = JSON.parse(appSettings.holidays || '[]')
    if (!holidays.includes(newHoliday)) holidays.push(newHoliday)
    holidays.sort()
    await saveSetting('holidays', JSON.stringify(holidays))
    setNewHoliday('')
  }

  const removeHoliday = async (date) => {
    const holidays = JSON.parse(appSettings.holidays || '[]').filter(d => d !== date)
    await saveSetting('holidays', JSON.stringify(holidays))
  }

  const addNewProduct = async () => {
    if (!newProduct.name || !newProduct.size || !newProduct.price) return
    setProductAddLoading(true)
    const { data, error } = await supabase.from('products').insert({
      name: newProduct.name,
      size: newProduct.size,
      price: parseFloat(newProduct.price),
      is_available: newProduct.is_available,
    }).select().single()
    if (data && !error) {
      setProducts(prev => [...prev, data])
      setNewProduct({ name: '', size: '', price: '', is_available: true })
      showSuccess('Product added!')
    }
    setProductAddLoading(false)
  }

  const saveProductEdit = async (productId) => {
    const edit = editProducts[productId]
    if (!edit) return
    const { error } = await supabase.from('products').update({
      name: edit.name,
      size: edit.size,
      price: parseFloat(edit.price),
      is_available: edit.is_available,
    }).eq('id', productId)
    if (!error) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...edit, price: parseFloat(edit.price) } : p))
      setEditProducts(prev => { const n = { ...prev }; delete n[productId]; return n })
      showSuccess('Product saved!')
    }
  }

  const handleCustomerSearch = (query) => {
    setCustomerSearch(query)
    if (!query.trim()) { setSettingsCustomers([]); return }
    const q = query.toLowerCase()
    setSettingsCustomers(customers.filter(c =>
      c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
    ).slice(0, 5))
  }

  const resetCod = async (userId, name) => {
    await supabase.from('profiles').update({ has_used_cod: false }).eq('id', userId)
    setCustomers(prev => prev.map(c => c.id === userId ? { ...c, has_used_cod: false } : c))
    setSettingsCustomers(prev => prev.map(c => c.id === userId ? { ...c, has_used_cod: false } : c))
    showSuccess(`COD reset for ${name}`)
  }

  const toggleBan = async (userId, isBanned, name) => {
    await supabase.from('profiles').update({ is_banned: !isBanned }).eq('id', userId)
    setCustomers(prev => prev.map(c => c.id === userId ? { ...c, is_banned: !isBanned } : c))
    setSettingsCustomers(prev => prev.map(c => c.id === userId ? { ...c, is_banned: !isBanned } : c))
    showSuccess(`${name} ${!isBanned ? 'banned' : 'unbanned'}`)
  }

  const extendSubscription = async (userId, name, days) => {
    if (!days || isNaN(parseInt(days))) return
    const { data: sub } = await supabase.from('subscriptions').select('id, end_date').eq('user_id', userId).eq('is_active', true).maybeSingle()
    if (!sub) { showError('No active subscription found'); return }
    const base = sub.end_date ? new Date(sub.end_date) : new Date()
    base.setDate(base.getDate() + parseInt(days))
    await supabase.from('subscriptions').update({ end_date: base.toISOString().split('T')[0] }).eq('id', sub.id)
    showSuccess(`${name}'s subscription extended by ${days} days`)
  }

  const handleSubStatusChange = async (subId, newStatus) => {
    setSubDeliveryStatuses(prev => ({ ...prev, [subId]: newStatus }))
    if (newStatus === 'delivered' || newStatus === 'missed') {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          type: 'subscription',
          subscription_id: subId,
          delivery_date: today,
          bottle_returned: newStatus === 'delivered',
          not_delivered: newStatus === 'missed',
        }),
      })
    }
  }

  const getSubDayLabel = (sub) => {
    const count = subDeliveryCounts[sub.id] || 0
    const dayX = count + 1
    if (sub.subscription_type === 'ongoing' || !sub.end_date) return `Day ${dayX}`
    const totalDays = Math.round(
      (new Date(sub.end_date) - new Date(sub.start_date)) / (1000 * 60 * 60 * 24)
    ) + 1
    return `Day ${dayX} of ${totalDays}`
  }

  const getSubPlanLabel = (sub) => {
    if (sub.subscription_type === 'ongoing' || !sub.end_date) return 'Ongoing'
    const days = Math.round((new Date(sub.end_date) - new Date(sub.start_date)) / (1000 * 60 * 60 * 24)) + 1
    if (days <= 7) return '1 Week'
    if (days <= 14) return '2 Weeks'
    if (days <= 31) return '1 Month'
    if (days <= 92) return '3 Months'
    return `${days} Days`
  }

  const loadCancelledSubCounts = async () => {
    const inactIds = subscriptions.filter(s => !s.is_active).map(s => s.id)
    if (!inactIds.length) return
    const { data } = await supabase.from('subscription_deliveries').select('subscription_id').in('subscription_id', inactIds)
    const counts = {}
    ;(data || []).forEach(d => { counts[d.subscription_id] = (counts[d.subscription_id] || 0) + 1 })
    setCancelledSubCounts(counts)
  }

  const approveWalletRequest = async (reqId, approved) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/wallet-request-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ request_id: reqId, approved }),
    })
    if (res.ok) {
      setWalletRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: approved ? 'approved' : 'rejected' } : r))
      showSuccess(approved ? 'Request approved!' : 'Request rejected.')
      await loadWallets()
    } else {
      showError('Failed to process request.')
    }
  }

  const reactivateSub = async (subId) => {
    setReactivatingSubId(subId)
    const { error } = await supabase.from('subscriptions').update({ is_active: true }).eq('id', subId)
    if (!error) {
      setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, is_active: true } : s))
      showSuccess('Subscription reactivated!')
    } else {
      showError('Failed to reactivate subscription.')
    }
    setReactivatingSubId(null)
  }

  const pauseDelivery = async (userId, name, date) => {
    if (!date) return
    const { data: sub } = await supabase.from('subscriptions').select('id, paused_dates').eq('user_id', userId).eq('is_active', true).maybeSingle()
    if (!sub) { showError('No active subscription found'); return }
    const paused = sub.paused_dates || []
    if (!paused.includes(date)) paused.push(date)
    await supabase.from('subscriptions').update({ paused_dates: paused }).eq('id', sub.id)
    showSuccess(`Delivery paused for ${name} on ${date}`)
  }

  const sendBroadcast = async () => {
    if (!broadcastMessage.trim()) return
    setBroadcastLoading(true)
    setBroadcastConfirm(false)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ message: broadcastMessage }),
    })
    const data = await res.json()
    if (res.ok) {
      showSuccess(`Broadcast sent to ${data.sent} customers!`)
      setBroadcastMessage('')
    }
    setBroadcastLoading(false)
  }

  const inviteWaitlistEntry = async (entry) => {
    setInvitingId(entry.id)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/invite-waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ entryId: entry.id, phone: entry.phone, name: entry.name }),
    })
    if (res.ok) {
      setWaitlistEntries(prev => prev.map(e => e.id === entry.id ? { ...e, invited: true } : e))
      showSuccess(`Invite sent to ${entry.name}!`)
    }
    setInvitingId(null)
  }

  const deleteWaitlistEntry = async (id) => {
    await supabase.from('priority_waitlist').delete().eq('id', id)
    setWaitlistEntries(prev => prev.filter(e => e.id !== id))
    showSuccess('Entry removed')
  }

  const exportWaitlistCSV = () => {
    const headers = ['Name', 'Phone', 'Area', 'Email', 'Date Joined', 'Invited']
    const rows = waitlistEntries.map(e => [
      e.name, e.phone, e.area, e.email || '',
      new Date(e.created_at).toLocaleDateString('en-IN'), e.invited ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'priority_waitlist.csv'
    a.click()
    URL.revokeObjectURL(url)
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
        <a href="/" className="flex items-center gap-3">
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
    { id: 'delivery_history', label: 'Delivery History', icon: '📋' },
    { id: 'delivery', label: 'Delivery Agents', icon: '🚴' },
    { id: 'products', label: 'Products & Pricing', icon: '🥛' },
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
    { id: 'discounts', label: 'Discount Codes', icon: '🏷️' },
    { id: 'reports', label: 'Issue Reports', icon: '⚠️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ].map(({ id, label, icon }) => (
            <button key={id} onClick={() => handleAdminTabChange(id)}
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

        {/* Failed Deductions Alert Banner */}
        {failedDeductions.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-red-700 text-sm">{failedDeductions.length} subscription deduction{failedDeductions.length > 1 ? 's' : ''} failed recently</p>
                <p className="text-xs text-red-500">Customers with insufficient balance — review in Issue Reports</p>
              </div>
            </div>
            <button onClick={() => setActiveTab('reports')}
              className="text-xs bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-red-700 transition whitespace-nowrap">
              View Details
            </button>
          </div>
        )}

        {/* Today's Deliveries Tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">

          {/* Sub-tabs */}
          <div className="flex gap-2 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm">
            {[
              { id: 'today', label: "Today's List", icon: '📋' },
              { id: 'history', label: 'History (7 days)', icon: '📊' },
            ].map(({ id, label, icon }) => (
              <button key={id}
                onClick={() => {
                  setOverviewSubTab(id)
                  if (id === 'history' && !historyLoaded) loadDeliveryHistory()
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  overviewSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Today sub-tab */}
          {overviewSubTab === 'today' && (
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
                {todaySubscriptions.map((sub) => {
                  const subStatus = subDeliveryStatuses[sub.id] || 'pending'
                  const statusCls = subStatus === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                    : subStatus === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : subStatus === 'missed' ? 'bg-orange-50 text-orange-500 border-orange-200'
                    : subStatus === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                    : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                  return (
                  <div key={sub.id} className="px-6 py-5 flex items-center gap-4 border-b border-[#f5f0e8]">
                    <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center flex-shrink-0 p-1.5">
                      <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]">📅 Subscription</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]">{getSubDayLabel(sub)}</span>
                      </div>
                      <p className="text-sm text-gray-400">{sub.profiles?.apartment_name}, Flat {sub.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub.profiles?.area} • 📞 {sub.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-1">
                        {sub.products?.size} x {sub.quantity} • {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col gap-1">
                      <p className="font-bold text-[#1a5c38] mb-0.5">Rs.{(sub.products?.price || 0) * sub.quantity}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mb-1 inline-block ${statusCls}`}>
                        {subStatus === 'delivered' ? '✅ Delivered' : subStatus === 'out_for_delivery' ? '🚴 Out' : subStatus === 'missed' ? '⚠️ Missed' : subStatus === 'cancelled' ? '❌ Cancelled' : '🕐 Pending'}
                      </span>
                      <select
                        value={subStatus}
                        onChange={(e) => handleSubStatusChange(sub.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${statusCls}`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="missed">Missed</option>
                      </select>
                      {deliveryAgents.length > 0 && (
                        <select
                          value={sub.assigned_to || ''}
                          onChange={async (e) => {
                            const agentId = e.target.value
                            await supabase.from('subscriptions')
                              .update({ assigned_to: agentId || null })
                              .eq('id', sub.id)
                            setTodaySubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, assigned_to: agentId } : s))
                          }}
                          className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                          <option value="">Unassigned</option>
                          {deliveryAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  )
                })}
                {/* One-time orders */}
                {todayOrders.map((order, index) => {
                  const isTrial = order.payment_method === 'COD'
                  const ordCls = order.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                    : order.status === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : order.status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                    : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                  return (
                  <div key={order.id}
                    className={`px-6 py-5 flex items-center gap-4 ${index !== todayOrders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#f5f0e8] flex items-center justify-center text-2xl flex-shrink-0">
                      {isTrial ? '🎁' : '🛒'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c]">{order.profiles?.full_name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${isTrial ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'}`}>
                          {isTrial ? '🎁 Trial' : '🛒 Order'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{order.profiles?.apartment_name}, Flat {order.profiles?.flat_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{order.profiles?.area} • 📞 {order.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-1">
                        {order.products?.size} x {order.quantity} • {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col gap-1">
                      <p className="font-bold text-[#1a5c38] mb-0.5">Rs.{order.total_price}</p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mb-1 inline-block ${ordCls}`}>
                        {order.status === 'delivered' ? '✅ Delivered' : order.status === 'out_for_delivery' ? '🚴 Out' : order.status === 'cancelled' ? '❌ Cancelled' : '🕐 Pending'}
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${ordCls}`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      {deliveryAgents.length > 0 && (
                        <select
                          value={order.assigned_to || ''}
                          onChange={async (e) => {
                            const agentId = e.target.value
                            await supabase.from('orders')
                              .update({ assigned_to: agentId || null })
                              .eq('id', order.id)
                            setTodayOrders(prev => prev.map(o => o.id === order.id ? { ...o, assigned_to: agentId } : o))
                          }}
                          className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                          <option value="">Unassigned</option>
                          {deliveryAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
          )}

          {/* History sub-tab */}
          {overviewSubTab === 'history' && (
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#f5f0e8] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">📋 Delivery History</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Past 7 days — subscriptions and one-time orders</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input type="date" value={historyDateFilter} onChange={e => setHistoryDateFilter(e.target.value)}
                    className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
                  <input type="text" placeholder="Filter by agent..." value={historyAgentFilter}
                    onChange={e => setHistoryAgentFilter(e.target.value)}
                    className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] w-36" />
                  <button onClick={() => { setHistoryLoaded(false); loadDeliveryHistory() }}
                    className="text-xs border border-[#1a5c38] text-[#1a5c38] px-3 py-2 rounded-lg hover:bg-[#f0faf4] transition font-semibold">
                    ↻ Refresh
                  </button>
                  <button onClick={() => {
                    const filtered = deliveryHistory.filter(d => {
                      if (historyDateFilter && d.date !== historyDateFilter) return false
                      if (historyAgentFilter && !d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())) return false
                      return true
                    })
                    const headers = ['Date', 'Type', 'Customer', 'Phone', 'Product', 'Qty', 'Delivered By', 'Delivered At']
                    const rows = filtered.map(d => [
                      d.date, d.type === 'subscription' ? 'Subscription' : 'One-time',
                      d.customerName, d.phone, d.product, d.quantity, d.deliveredBy,
                      d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-',
                    ])
                    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `delivery_history_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                    setTimeout(() => URL.revokeObjectURL(url), 5000)
                  }} className="text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold">
                    Export CSV
                  </button>
                </div>
              </div>
              {historyLoading ? (
                <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading delivery history...</div>
              ) : (() => {
                const filtered = deliveryHistory.filter(d => {
                  if (historyDateFilter && d.date !== historyDateFilter) return false
                  if (historyAgentFilter && !d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())) return false
                  return true
                })
                if (filtered.length === 0) {
                  return (
                    <div className="px-6 py-12 text-center">
                      <div className="text-5xl mb-3">📋</div>
                      <p className="text-gray-400 text-sm">No delivery records found.</p>
                    </div>
                  )
                }
                const byDate = filtered.reduce((acc, d) => {
                  if (!acc[d.date]) acc[d.date] = []
                  acc[d.date].push(d)
                  return acc
                }, {})
                return (
                  <div>
                    {Object.entries(byDate).map(([date, items]) => (
                      <div key={date}>
                        <div className="px-6 py-3 bg-[#f5f0e8] flex items-center justify-between border-b border-[#e8e0d0]">
                          <p className="font-semibold text-[#1c1c1c] text-sm">
                            {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c8e6d4]">
                            ✅ {items.length} delivered
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#fdfbf7] text-xs text-gray-400 uppercase tracking-widest">
                              <tr>
                                <th className="px-5 py-2 text-left">Customer</th>
                                <th className="px-5 py-2 text-left">Product</th>
                                <th className="px-5 py-2 text-left">Type</th>
                                <th className="px-5 py-2 text-left">Delivered By</th>
                                <th className="px-5 py-2 text-left">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((d, idx) => (
                                <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]'}>
                                  <td className="px-5 py-3">
                                    <p className="font-semibold text-[#1c1c1c]">{d.customerName}</p>
                                    <p className="text-xs text-gray-400">{d.phone}</p>
                                  </td>
                                  <td className="px-5 py-3 text-[#1c1c1c]">{d.product} <span className="text-gray-400 text-xs">x{d.quantity}</span></td>
                                  <td className="px-5 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.type === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]'}`}>
                                      {d.type === 'subscription' ? '📅 Sub' : '🛒 Order'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-gray-500 text-xs">{d.deliveredBy || '-'}</td>
                                  <td className="px-5 py-3 text-gray-400 text-xs">
                                    {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          </div>
        )}

        {/* All Orders Tab */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-4">
          {(() => {
          const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
          const combined = [
            ...orders.map(o => ({ ...o, _itemType: 'order', orderType: o.payment_method === 'COD' ? 'trial' : 'order', _status: o.status })),
            ...todaySubscriptions.map(sub => ({ ...sub, _itemType: 'subscription', orderType: 'subscription', _status: subDeliveryStatuses[sub.id] || 'pending' })),
          ]
          const visibleRows = combined.filter(item =>
            ordersSubTab === 'pending' ? item._status === 'pending'
            : ordersSubTab === 'out_for_delivery' ? item._status === 'out_for_delivery'
            : ordersSubTab === 'delivered' ? item._status === 'delivered'
            : item._status === 'cancelled' || item._status === 'missed'
          )
          const subTabCounts = {
            pending: combined.filter(i => i._status === 'pending').length,
            out_for_delivery: combined.filter(i => i._status === 'out_for_delivery').length,
            delivered: combined.filter(i => i._status === 'delivered').length,
            cancelled: combined.filter(i => i._status === 'cancelled' || i._status === 'missed').length,
          }
          return (
          <div>
            {/* Sub-tab nav */}
            <div className="flex gap-2 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm overflow-x-auto">
              {[
                { id: 'pending', label: 'Pending' },
                { id: 'out_for_delivery', label: 'Out for Delivery' },
                { id: 'delivered', label: 'Delivered' },
                { id: 'cancelled', label: 'Cancelled' },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setOrdersSubTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    ordersSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38]'
                  }`}>
                  {label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${ordersSubTab === id ? 'bg-white text-[#1a5c38]' : 'bg-gray-100 text-gray-500'}`}>
                    {subTabCounts[id]}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  const headers = ['Type','Customer','Phone','Product','Qty','Date','Slot','Amount','Status']
                  const rows = visibleRows.map(item => [
                    item.orderType === 'trial' ? 'Trial' : item.orderType === 'subscription' ? 'Subscription' : 'Order',
                    item.profiles?.full_name || '',
                    item.profiles?.phone || '',
                    item.products?.size || '',
                    item.quantity || '',
                    item._itemType === 'order' ? (item.delivery_date || '') : todayIST,
                    item.delivery_slot || '',
                    item._itemType === 'order' ? (item.total_price || '') : (item.products?.price || 0) * (item.quantity || 1),
                    item._status,
                  ])
                  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `orders_${ordersSubTab}_${todayIST}.csv`; a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                }}
                className="ml-auto text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold whitespace-nowrap flex-shrink-0">
                Export CSV
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#f5f0e8]">
                <p className="text-xs text-gray-400">{visibleRows.length} {ordersSubTab.replace('_', ' ')} · orders + today&apos;s subscriptions combined</p>
              </div>
              {visibleRows.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-400 text-sm">No {ordersSubTab.replace('_', ' ')} items</p>
                </div>
              ) : visibleRows.map((item, index) => {
                const isSub = item._itemType === 'subscription'
                const statusCls = item._status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                  : item._status === 'out_for_delivery' ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : item._status === 'missed' ? 'bg-orange-50 text-orange-500 border-orange-200'
                  : item._status === 'cancelled' ? 'bg-red-50 text-red-500 border-red-200'
                  : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                const statusLabel = item._status === 'delivered' ? '✅ Delivered'
                  : item._status === 'out_for_delivery' ? '🚴 Out'
                  : item._status === 'missed' ? '⚠️ Missed'
                  : item._status === 'cancelled' ? '❌ Cancelled' : '🕐 Pending'
                return (
                  <div key={(isSub ? 'sub-' : 'ord-') + item.id}
                    className={`px-6 py-4 flex items-start gap-4 ${index !== visibleRows.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-[#f5f0e8]">
                      {item.orderType === 'subscription' ? '📅' : item.orderType === 'trial' ? '🎁' : '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c] text-sm">{item.profiles?.full_name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          item.orderType === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                          : item.orderType === 'trial' ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                        }`}>
                          {item.orderType === 'subscription' ? '📅 Subscription' : item.orderType === 'trial' ? '🎁 Trial' : '🛒 Order'}
                        </span>
                        {isSub && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]">
                            {getSubDayLabel(item)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">📞 {item.profiles?.phone}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-0.5">
                        {item.products?.size} × {item.quantity} · {item.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                        {!isSub && item.delivery_date && (
                          <span className="text-gray-400 ml-1">
                            · {new Date(item.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <p className="font-bold text-[#1a5c38] text-sm">
                        Rs.{isSub ? (item.products?.price || 0) * item.quantity : item.total_price}
                      </p>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusCls}`}>{statusLabel}</span>
                      <select
                        value={item._status}
                        onChange={(e) => isSub ? handleSubStatusChange(item.id, e.target.value) : updateOrderStatus(item.id, e.target.value)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer ${statusCls}`}>
                        <option value="pending">Pending</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        {isSub ? <option value="missed">Missed</option> : <option value="cancelled">Cancelled</option>}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="flex flex-col gap-5">

            {/* Count summary */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] text-sm font-bold px-4 py-1.5 rounded-full">
                Active: {subscriptions.filter(s => s.is_active).length}
              </span>
              <span className="text-gray-300 font-bold text-lg">|</span>
              <span className="bg-gray-100 text-gray-500 border border-gray-200 text-sm font-bold px-4 py-1.5 rounded-full">
                Cancelled: {subscriptions.filter(s => !s.is_active).length}
              </span>
            </div>

            {/* Section 1: Active Subscriptions */}
            <div className="bg-white rounded-2xl border border-[#c8e6d4] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#e8f5ec] flex items-center gap-3"
                style={{background: 'linear-gradient(135deg, #f0faf4 0%, #e8f5ec 100%)'}}>
                <div className="w-2 h-6 rounded-full bg-[#1a5c38]" />
                <div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-base font-bold text-[#1a5c38]">Active Subscriptions</h3>
                  <p className="text-xs text-[#2d7a50]">{subscriptions.filter(s => s.is_active).length} running</p>
                </div>
              </div>
              {subscriptions.filter(s => s.is_active).length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="text-4xl mb-3">📅</div>
                  <p className="text-gray-400 text-sm">No active subscriptions</p>
                </div>
              ) : (
                <div>
                  {subscriptions.filter(s => s.is_active).map((sub, index, arr) => (
                    <div key={sub.id}
                      className={`px-6 py-5 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="w-11 h-11 rounded-xl bg-[#f0faf4] border border-[#c8e6d4] flex items-center justify-center flex-shrink-0 p-1.5">
                        <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1c1c1c]">{sub.profiles?.full_name}</p>
                        <p className="text-sm text-gray-400">{sub.profiles?.area}, {sub.profiles?.apartment_name}</p>
                        <p className="text-xs text-gray-400">📞 {sub.profiles?.phone}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-medium px-2 py-0.5 rounded-full border border-[#c8e6d4]">
                            {sub.products?.size} × {sub.quantity}/day
                          </span>
                          <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                            {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                          </span>
                          <span className="bg-[#f5f0e8] text-[#1c1c1c] text-xs font-medium px-2 py-0.5 rounded-full">
                            {getSubPlanLabel(sub)}
                          </span>
                          {(() => {
                            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                            const dayLabel = getSubDayLabel(sub)
                            const daysLeft = sub.end_date
                              ? Math.max(0, Math.round((new Date(sub.end_date) - new Date(today)) / (1000 * 60 * 60 * 24)))
                              : null
                            return (
                              <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                                {dayLabel}{daysLeft !== null ? ` · ${daysLeft}d left` : ''}
                              </span>
                            )
                          })()}
                          {sub.start_date > new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && (
                            <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-2 py-0.5 rounded-full border border-[#f0dfa0]">
                              Starting {new Date(sub.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {sub.paused_dates?.length > 0 && (
                            <span className="bg-yellow-50 text-yellow-600 text-xs font-medium px-2 py-0.5 rounded-full border border-yellow-200">
                              {sub.paused_dates.length} paused
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          Since {new Date(sub.start_date).toLocaleDateString('en-IN')}
                          {sub.end_date ? ` · Ends ${new Date(sub.end_date).toLocaleDateString('en-IN')}` : ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                        <p className="font-bold text-[#1a5c38]">Rs.{(sub.products?.price || 0) * sub.quantity}/day</p>
                        {sub.bottle_deposit > 0 && (
                          <p className="text-xs text-[#d4a017]">Deposit: Rs.{sub.bottle_deposit}</p>
                        )}
                        {deliveryAgents.length > 0 && (
                          <select
                            value={sub.assigned_to || ''}
                            onChange={async (e) => {
                              const agentId = e.target.value
                              await supabase.from('subscriptions').update({ assigned_to: agentId || null }).eq('id', sub.id)
                              setSubscriptions(prev => prev.map(s => s.id === sub.id ? { ...s, assigned_to: agentId } : s))
                            }}
                            className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                            <option value="">Unassigned</option>
                            {deliveryAgents.map(agent => (
                              <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                            ))}
                          </select>
                        )}
                        <button
                          disabled={resendWaLoading[sub.id]}
                          onClick={async () => {
                            setResendWaLoading(prev => ({ ...prev, [sub.id]: true }))
                            const bal = wallets.find(w => w.user_id === sub.user_id)?.balance ?? 0
                            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
                            const daysLeft = sub.end_date
                              ? Math.round((new Date(sub.end_date) - new Date(today)) / (1000 * 60 * 60 * 24))
                              : null
                            const messageType = bal < 300 ? 'low_balance'
                              : daysLeft !== null && daysLeft <= 3 ? 'subscription_expiring'
                              : 'subscription_active'
                            const { data: { session } } = await supabase.auth.getSession()
                            const res = await fetch('/api/admin/resend-whatsapp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                              body: JSON.stringify({ userId: sub.user_id, messageType, targetId: sub.id }),
                            })
                            setResendWaLoading(prev => ({ ...prev, [sub.id]: false }))
                            res.ok ? showSuccess(`WhatsApp sent (${messageType})!`) : showError('Failed to send WhatsApp')
                          }}
                          className="text-xs bg-[#25D366] text-white px-3 py-1.5 rounded-lg hover:bg-[#1da851] transition font-semibold disabled:opacity-50">
                          {resendWaLoading[sub.id] ? '...' : '📲 Smart WA'}
                        </button>
                        <button
                          onClick={() => { setStopSubPopup(sub); setStopCancelledBy('admin'); setStopCancellationReason('') }}
                          className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-semibold">
                          Stop
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Cancelled / Inactive Subscriptions */}
            {subscriptions.filter(s => !s.is_active).length > 0 && (
              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => {
                    const next = !showCancelledSubs
                    setShowCancelledSubs(next)
                    if (next && Object.keys(cancelledSubCounts).length === 0) loadCancelledSubCounts()
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 rounded-full bg-gray-400" />
                    <div className="text-left">
                      <h3 className="font-[family-name:var(--font-playfair)] text-base font-bold text-gray-500">Cancelled / Inactive</h3>
                      <p className="text-xs text-gray-400">{subscriptions.filter(s => !s.is_active).length} cancelled subscriptions</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                    showCancelledSubs ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                    {showCancelledSubs ? '▲ Hide' : `▼ Show Cancelled (${subscriptions.filter(s => !s.is_active).length})`}
                  </span>
                </button>
                {showCancelledSubs && (
                  <div className="bg-gray-50">
                    {subscriptions.filter(s => !s.is_active).map((sub, index, arr) => (
                      <div key={sub.id}
                        className={`px-6 py-5 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-gray-200' : ''}`}>
                        <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 p-1.5 opacity-50">
                          <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain grayscale" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-400 line-through">{sub.profiles?.full_name}</p>
                          <p className="text-sm text-gray-400">{sub.profiles?.area}, {sub.profiles?.apartment_name}</p>
                          <p className="text-xs text-gray-400">📞 {sub.profiles?.phone}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 line-through">
                              {sub.products?.size} × {sub.quantity}/day
                            </span>
                            <span className="bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                              {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                            </span>
                            <span className="bg-red-50 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
                              Cancelled
                            </span>
                            {getSubPlanLabel(sub) !== 'Ongoing' && (
                              <span className="bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                                {getSubPlanLabel(sub)}
                              </span>
                            )}
                            {cancelledSubCounts[sub.id] > 0 && (
                              <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                                {cancelledSubCounts[sub.id]} days delivered
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1.5">
                            {new Date(sub.start_date).toLocaleDateString('en-IN')}
                            {sub.end_date ? ` → ${new Date(sub.end_date).toLocaleDateString('en-IN')}` : ''}
                          </p>
                          {sub.cancelled_by && (
                            <p className="text-xs text-gray-400 mt-1">
                              {sub.cancelled_by === 'admin' ? 'Cancelled by Admin'
                                : sub.cancelled_by === 'customer' ? 'Cancelled by Customer'
                                : 'Cancelled by Delivery Agent'}
                            </p>
                          )}
                          {sub.cancellation_reason && (
                            <p className="text-xs text-red-400 mt-0.5">Reason: {sub.cancellation_reason}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            disabled={reactivatingSubId === sub.id}
                            onClick={() => reactivateSub(sub.id)}
                            className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold disabled:opacity-50">
                            {reactivatingSubId === sub.id ? '...' : '↺ Reactivate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="flex flex-col gap-5">

          {/* Daily Auto-Deduction — all sub-tab only */}
          {customersSubTab === 'all' && (
            <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
              <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Daily Auto-Deduction</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Deduct today&apos;s subscription charges from customer wallets</p>
                </div>
                <button onClick={runDailyDeductions} disabled={deductionLoading}
                  className="text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition shadow text-sm disabled:opacity-60"
                  style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                  {deductionLoading ? 'Running...' : "Run Today's Deductions"}
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
                      {deductionResult.failed} customer{deductionResult.failed > 1 ? 's' : ''} have insufficient wallet balance.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 text-center">
                    {deductionResult.date} &middot; {deductionResult.total} active subscription{deductionResult.total !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Main customer list card */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">

            {/* Header */}
            <div className="px-6 py-5 border-b border-[#f5f0e8] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customers</h3>
                <p className="text-xs text-gray-400 mt-0.5">{customers.length} registered customers</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
                  className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
                  <option value="all">All Areas</option>
                  {[...new Set(customers.map(c => c.area).filter(Boolean))].sort().map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <button onClick={() => {
                  const headers = ['Name','Phone','Email','Area','Building','Flat Number','Landmark','Joined Date']
                  const rows = customers.map(c => [
                    c.full_name || '', c.phone || '', c.email || '', c.area || '',
                    c.apartment_name || '', c.flat_number || '', c.landmark || '',
                    c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '',
                  ])
                  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`; a.click()
                  setTimeout(() => URL.revokeObjectURL(url), 5000)
                }} className="text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold">
                  Export CSV
                </button>
              </div>
            </div>
            {/* Sub-tabs */}
            <div className="flex gap-1 px-4 py-3 border-b border-[#f5f0e8] overflow-x-auto">
              {[
                { id: 'all', label: `All (${customers.length})` },
                { id: 'active_subs', label: `Active Subs (${subscriptions.filter(s => s.is_active).length})` },
                { id: 'inactive_subs', label: 'Inactive Subs' },
                { id: 'low_balance', label: `Low Balance (${wallets.filter(w => (w.balance ?? 0) < 300).length})` },
                { id: 'wallet_requests', label: `💳 Agent Requests (${walletRequests.filter(r => r.status === 'pending').length})` },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setCustomersSubTab(id)}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap transition ${
                    customersSubTab === id ? 'bg-[#1a5c38] text-white' : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#f0faf4]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Wallet Requests sub-tab */}
            {customersSubTab === 'wallet_requests' && (
              walletRequests.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">💳</div>
                  <p className="text-gray-400 text-sm">No wallet requests</p>
                </div>
              ) : (
                <div>
                  {walletRequests.map((req, index, arr) => (
                    <div key={req.id} className={`px-6 py-4 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-[#1c1c1c] text-sm">{req.profiles?.full_name}</p>
                          <span className="text-xs text-gray-400">({req.profiles?.phone})</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            req.status === 'approved' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                            : req.status === 'rejected' ? 'bg-red-50 text-red-500 border-red-200'
                            : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                          }`}>
                            {req.status === 'approved' ? '✅ Approved' : req.status === 'rejected' ? '❌ Rejected' : '🕐 Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {req.action === 'add' ? '➕ Add' : req.action === 'deduct' ? '➖ Deduct' : '⚙️ Set'}
                          {' '}Rs.{req.amount}{' → '}
                          <span className="font-medium">{customers.find(c => c.id === req.target_user_id)?.full_name || req.target_user_id}</span>
                        </p>
                        {req.note && <p className="text-xs text-gray-400 mt-0.5">Note: {req.note}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button onClick={() => approveWalletRequest(req.id, true)}
                            className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
                            Approve
                          </button>
                          <button onClick={() => approveWalletRequest(req.id, false)}
                            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-semibold">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Customer list for other sub-tabs */}
            {customersSubTab !== 'wallet_requests' && (() => {
              const activeSubByUser = {}
              subscriptions.filter(s => s.is_active).forEach(s => { activeSubByUser[s.user_id] = s })
              const inactiveSubUserIds = new Set(subscriptions.filter(s => !s.is_active).map(s => s.user_id))
              const filteredCustomers = customers.filter(c => {
                if (areaFilter !== 'all' && c.area !== areaFilter) return false
                if (customersSubTab === 'active_subs') return !!activeSubByUser[c.id]
                if (customersSubTab === 'inactive_subs') return !activeSubByUser[c.id] && inactiveSubUserIds.has(c.id)
                if (customersSubTab === 'low_balance') return (wallets.find(w => w.user_id === c.id)?.balance ?? 1000) < 300
                return true
              })
              if (filteredCustomers.length === 0) return (
                <div className="px-6 py-12 text-center">
                  <div className="text-5xl mb-3">👥</div>
                  <p className="text-gray-400 text-sm">No customers match this filter</p>
                </div>
              )
              return (
                <div>
                  {filteredCustomers.map((customer, index, arr) => {
                    const w = wallets.find(wt => wt.user_id === customer.id)
                    const balance = w?.balance ?? null
                    const activeSub = activeSubByUser[customer.id]
                    const hasInactiveSub = !activeSub && inactiveSubUserIds.has(customer.id)
                    const iw = inlineWallet[customer.id] || { open: null, amount: '', note: '' }
                    return (
                      <div key={customer.id} className={`px-5 py-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {customer.full_name?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-semibold text-[#1c1c1c]">{customer.full_name}</p>
                              {activeSub ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]">📅 Active Sub</span>
                              ) : hasInactiveSub ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">⏸ Inactive Sub</span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-400 border border-red-200">❌ No Sub</span>
                              )}
                              {balance !== null && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  balance === 0 ? 'bg-red-100 text-red-700' : balance < 300 ? 'bg-orange-100 text-orange-700' : 'bg-[#f0faf4] text-[#1a5c38]'
                                }`}>
                                  💰 ₹{balance}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">📞 {customer.phone}</p>
                            <p className="text-xs text-gray-400">{customer.area} • {customer.apartment_name}{customer.flat_number ? `, Flat ${customer.flat_number}` : ''}</p>
                            {activeSub && (
                              <p className="text-xs text-[#1a5c38] font-medium mt-0.5">
                                {activeSub.products?.size} × {activeSub.quantity} · {getSubDayLabel(activeSub)}
                              </p>
                            )}
                            {iw.open && (
                              <div className="mt-2 flex flex-wrap gap-2 items-center">
                                <input type="number" placeholder="Amount" value={iw.amount}
                                  onChange={e => setInlineWallet(prev => ({ ...prev, [customer.id]: { ...iw, amount: e.target.value } }))}
                                  className="w-24 border border-[#e8e0d0] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1a5c38]" />
                                <input type="text" placeholder="Note (optional)" value={iw.note}
                                  onChange={e => setInlineWallet(prev => ({ ...prev, [customer.id]: { ...iw, note: e.target.value } }))}
                                  className="flex-1 min-w-0 border border-[#e8e0d0] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#1a5c38]" />
                                <button onClick={async () => {
                                  const amt = parseFloat(iw.amount)
                                  if (!amt || amt <= 0) return
                                  const { data: { session } } = await supabase.auth.getSession()
                                  const res = await fetch('/api/admin/wallet-update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                    body: JSON.stringify({ target_user_id: customer.id, action: iw.open, amount: amt, note: iw.note || (iw.open === 'add' ? 'Added by admin' : 'Deducted by admin') }),
                                  })
                                  if (res.ok) {
                                    await loadWallets()
                                    setInlineWallet(prev => ({ ...prev, [customer.id]: { open: null, amount: '', note: '' } }))
                                    showSuccess('Wallet updated!')
                                  } else { showError('Wallet update failed.') }
                                }} className="text-xs bg-[#1a5c38] text-white px-3 py-1.5 rounded-lg hover:bg-[#14472c] transition font-semibold">
                                  Confirm
                                </button>
                                <button onClick={() => setInlineWallet(prev => ({ ...prev, [customer.id]: { open: null, amount: '', note: '' } }))}
                                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5">✕</button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            {w?.deposit_balance > 0 && (
                              <button onClick={() => { setRefundModal({ customer, depositBalance: w.deposit_balance }); setRefundGoodBottles(''); setRefundDamagedBottles(''); setRefundNotes('') }}
                                className="text-xs bg-[#d4a017] text-white px-2.5 py-1 rounded-lg hover:bg-[#b8860b] transition font-semibold">
                                🍼 ₹{w.deposit_balance}
                              </button>
                            )}
                            <div className="flex gap-1.5">
                              <button onClick={() => setInlineWallet(prev => ({ ...prev, [customer.id]: iw.open === 'add' ? { open: null, amount: '', note: '' } : { open: 'add', amount: '', note: '' } }))}
                                className="text-xs bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4] px-2.5 py-1 rounded-lg font-semibold hover:bg-[#e0f5e8] transition">
                                + Add
                              </button>
                              <button onClick={() => setInlineWallet(prev => ({ ...prev, [customer.id]: iw.open === 'deduct' ? { open: null, amount: '', note: '' } : { open: 'deduct', amount: '', note: '' } }))}
                                className="text-xs bg-red-50 text-red-500 border border-red-200 px-2.5 py-1 rounded-lg font-semibold hover:bg-red-100 transition">
                                - Deduct
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              <a href={'https://wa.me/91' + customer.phone} target="_blank"
                                className="text-xs bg-[#25D366] text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-[#1da851] transition">
                                WhatsApp
                              </a>
                              <button onClick={() => { setCustomWaModal(customer); setCustomWaType('custom'); setCustomWaMessage('') }}
                                className="text-xs border border-[#25D366] text-[#25D366] px-2.5 py-1 rounded-lg font-semibold hover:bg-[#f0fff4] transition">
                                Send WA
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

          </div>
          </div>
        )}

        {/* ~~~ OLD_DEAD_CODE_START ~~~ */}
        {false && false && customers.map((customer, index) => (
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
                      <button
                        onClick={() => {
                          setCustomWaModal(customer)
                          setCustomWaType('custom')
                          setCustomWaMessage('')
                        }}
                        className="text-xs bg-[#25D366] text-white px-2.5 py-1 rounded-lg hover:bg-[#1da851] transition font-semibold">
                        Send WA
                      </button>
                    </div>
                  </div>
                ))}

{/* _wallet_tab_dead_code_ */}
{activeTab === 'wallet_DISABLED' && (
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
      <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Customer Wallets</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {walletsLastUpdated
              ? `Updated ${walletsLastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Click customer to add balance'}
          </p>
        </div>
        <button
          onClick={loadWallets}
          className="text-xs text-[#1a5c38] border border-[#1a5c38] px-3 py-1.5 rounded-lg hover:bg-[#f0faf4] transition font-semibold flex-shrink-0"
        >
          ↻ Refresh
        </button>
      </div>
      {walletsWithProfiles.filter(w => w.profile).length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-400">No wallet data yet</p>
        </div>
      ) : (
        walletsWithProfiles.filter(w => w.profile).map((w, index, arr) => {
          const customer = w.profile
          return (
            <div key={w.user_id}
              onClick={() => { setSelectedCustomer(customer); setWalletMessage('') }}
              className={`px-6 py-4 flex items-center justify-between cursor-pointer transition ${
                selectedCustomer?.id === customer.id
                  ? 'bg-[#f0faf4] border-l-4 border-[#1a5c38]'
                  : 'hover:bg-[#fdfbf7]'
              } ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {customer.full_name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-semibold text-[#1c1c1c] text-sm">{customer.full_name}</p>
                  <p className="text-xs text-gray-400">{customer.phone}</p>
                  <p className="text-xs text-gray-400">{customer.area}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1a5c38]">Rs.{w.balance ?? 0}</p>
                <p className="text-xs text-gray-400">available</p>
                {w.deposit_balance > 0 && (
                  <p className="text-xs text-[#d4a017] font-semibold">🍼 Deposit: Rs.{w.deposit_balance}</p>
                )}
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
                  Balance: Rs.{wallets.find(w => w.user_id === selectedCustomer.id)?.balance ?? 0}
                </p>
                {wallets.find(w => w.user_id === selectedCustomer.id)?.deposit_balance > 0 && (
                  <p className="text-xs text-[#d4a017] font-semibold">
                    🍼 Deposit: Rs.{wallets.find(w => w.user_id === selectedCustomer.id)?.deposit_balance}
                  </p>
                )}
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
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/wallet-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ target_user_id: selectedCustomer.id, action: 'add', amount: parseFloat(walletAmount), note: walletNote || 'Added by admin' }),
                  })
                  const result = await res.json()
                  if (!res.ok) {
                    setWalletMessage('Error: ' + (result.error || 'Could not update wallet'))
                  } else {
                    await loadWallets()
                    setWalletAmount('')
                    setWalletNote('')
                    setWalletMessage('Rs.' + walletAmount + ' added! New balance: Rs.' + result.new_balance)
                  }
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
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/admin/wallet-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ target_user_id: selectedCustomer.id, action: 'deduct', amount: parseFloat(walletAmount), note: walletNote || 'Deducted by admin' }),
                  })
                  const result = await res.json()
                  if (!res.ok) {
                    setWalletMessage('Error: ' + (result.error || 'Could not update wallet'))
                  } else {
                    await loadWallets()
                    setWalletAmount('')
                    setWalletNote('')
                    setWalletMessage('Rs.' + walletAmount + ' deducted! New balance: Rs.' + result.new_balance)
                  }
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

{/* Delivery History Tab */}
{activeTab === 'delivery_history' && (
  <div className="flex flex-col gap-5">
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">📋 Delivery History</h3>
          <p className="text-xs text-gray-400 mt-0.5">Past 7 days — subscriptions and one-time orders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={historyDateFilter}
            onChange={e => setHistoryDateFilter(e.target.value)}
            className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]"
          />
          <input
            type="text"
            placeholder="Filter by agent..."
            value={historyAgentFilter}
            onChange={e => setHistoryAgentFilter(e.target.value)}
            className="text-xs border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] w-36"
          />
          <button
            onClick={() => { setHistoryLoaded(false); loadDeliveryHistory() }}
            className="text-xs border border-[#1a5c38] text-[#1a5c38] px-3 py-2 rounded-lg hover:bg-[#f0faf4] transition font-semibold"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => {
              const filtered = deliveryHistory.filter(d => {
                if (historyDateFilter && d.date !== historyDateFilter) return false
                if (historyAgentFilter && !d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())) return false
                return true
              })
              const headers = ['Date', 'Type', 'Customer', 'Phone', 'Product', 'Qty', 'Delivered By', 'Delivered At']
              const rows = filtered.map(d => [
                d.date,
                d.type === 'subscription' ? 'Subscription' : 'One-time',
                d.customerName,
                d.phone,
                d.product,
                d.quantity,
                d.deliveredBy,
                d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-',
              ])
              const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `delivery_history_${new Date().toISOString().split('T')[0]}.csv`; a.click()
              setTimeout(() => URL.revokeObjectURL(url), 5000)
            }}
            className="text-xs bg-[#1a5c38] text-white px-3 py-2 rounded-lg hover:bg-[#14472c] transition font-semibold"
          >
            Export CSV
          </button>
        </div>
      </div>
      {historyLoading ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading delivery history...</div>
      ) : (() => {
        const filtered = deliveryHistory.filter(d => {
          if (historyDateFilter && d.date !== historyDateFilter) return false
          if (historyAgentFilter && !d.deliveredBy?.toLowerCase().includes(historyAgentFilter.toLowerCase())) return false
          return true
        })
        if (filtered.length === 0) {
          return (
            <div className="px-6 py-12 text-center">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-400 text-sm">No delivery records found for the selected filters.</p>
            </div>
          )
        }
        // Group by date
        const byDate = filtered.reduce((acc, d) => {
          if (!acc[d.date]) acc[d.date] = []
          acc[d.date].push(d)
          return acc
        }, {})
        return (
          <div>
            {Object.entries(byDate).map(([date, items]) => (
              <div key={date}>
                <div className="px-6 py-3 bg-[#f5f0e8] flex items-center justify-between border-b border-[#e8e0d0]">
                  <p className="font-semibold text-[#1c1c1c] text-sm">
                    {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c8e6d4]">
                    ✅ {items.length} delivered
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#fdfbf7] text-xs text-gray-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-2 text-left">Customer</th>
                        <th className="px-5 py-2 text-left">Product</th>
                        <th className="px-5 py-2 text-left">Type</th>
                        <th className="px-5 py-2 text-left">Delivered By</th>
                        <th className="px-5 py-2 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((d, idx) => (
                        <tr key={d.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfbf7]'}>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-[#1c1c1c]">{d.customerName}</p>
                            <p className="text-xs text-gray-400">{d.phone}</p>
                          </td>
                          <td className="px-5 py-3 text-[#1c1c1c]">
                            {d.product} <span className="text-gray-400 text-xs">x{d.quantity}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.type === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' : 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]'}`}>
                              {d.type === 'subscription' ? '📅 Sub' : '🛒 Order'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{d.deliveredBy || '-'}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">
                            {d.deliveredAt ? new Date(d.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  </div>
)}

{/* Delivery Agents Tab */}
{activeTab === 'delivery' && (
  <div className="flex flex-col gap-5">

    {/* Sub-tabs */}
    <div className="flex gap-2 bg-white border border-[#e8e0d0] rounded-xl p-1 shadow-sm">
      {[
        { id: 'list', label: `Agents (${deliveryAgents.length})` },
        { id: 'add_new', label: '+ Add New Agent' },
        { id: 'assign', label: 'Assign Orders' },
      ].map(({ id, label }) => (
        <button key={id} onClick={() => setAgentsSubTab(id)}
          className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
            agentsSubTab === id ? 'bg-[#1a5c38] text-white shadow' : 'text-gray-500 hover:text-[#1a5c38] hover:bg-[#f0faf4]'
          }`}>
          {label}
        </button>
      ))}
    </div>

    {/* List sub-tab */}
    {agentsSubTab === 'list' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Delivery Agents</h3>
          <p className="text-xs text-gray-400 mt-0.5">{deliveryAgents.length} agents</p>
        </div>
        {deliveryAgents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl mb-3">🚴</div>
            <p className="text-gray-400 text-sm">No delivery agents yet</p>
          </div>
        ) : (
          <div>
            {deliveryAgents.map((agent, index, arr) => {
              const rec = deliveryAgentRecords.find(r => r.phone === agent.phone || r.user_id === agent.id)
              return (
                <div key={agent.id} className={`px-6 py-4 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                  <div className="w-11 h-11 rounded-full bg-[#1a5c38] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {agent.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-[#1c1c1c]">{agent.full_name}</p>
                      {rec ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rec.is_active !== false ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {rec.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">📞 {agent.phone}</p>
                    {agent.area && <p className="text-xs text-gray-400">{agent.area}</p>}
                    {rec?.dl_number && <p className="text-xs text-gray-400 mt-0.5">DL: {rec.dl_number}</p>}
                    {rec?.bike_number && <p className="text-xs text-gray-400">Bike: {rec.bike_number}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.from('profiles').update({ is_delivery: false }).eq('id', agent.id)
                      setDeliveryAgents(deliveryAgents.filter(a => a.id !== agent.id))
                    }}
                    className="text-xs border border-red-300 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition font-semibold flex-shrink-0">
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )}

    {/* Add New Agent sub-tab */}
    {agentsSubTab === 'add_new' && (
      <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-[#f5f0e8]">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Add New Delivery Agent</h3>
          <p className="text-xs text-gray-400 mt-0.5">Creates a login account and sends WhatsApp welcome</p>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Full Name *</label>
              <input type="text" value={agentForm.full_name} onChange={e => setAgentForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Agent full name" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Phone Number *</label>
              <input type="text" value={agentForm.phone} onChange={e => setAgentForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="10-digit mobile" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Email ID *</label>
              <input type="email" value={agentForm.email} onChange={e => setAgentForm(f => ({ ...f, email: e.target.value }))}
                placeholder="agent@example.com" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Password *</label>
              <input type="password" value={agentForm.password} onChange={e => setAgentForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Set login password" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">DL / ID Number</label>
              <input type="text" value={agentForm.dl_number} onChange={e => setAgentForm(f => ({ ...f, dl_number: e.target.value }))}
                placeholder="Driving licence number" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Bike Number</label>
              <input type="text" value={agentForm.bike_number} onChange={e => setAgentForm(f => ({ ...f, bike_number: e.target.value }))}
                placeholder="Vehicle registration" className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Address</label>
            <textarea value={agentForm.address} onChange={e => setAgentForm(f => ({ ...f, address: e.target.value }))}
              rows={2} placeholder="Agent&apos;s home address"
              className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7] resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Photo</label>
              <input type="file" accept="image/*" onChange={e => setAgentPhoto(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#f0faf4] file:text-[#1a5c38] hover:file:bg-[#e0f5e8]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">DL / ID Document</label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setAgentDoc(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#f0faf4] file:text-[#1a5c38] hover:file:bg-[#e0f5e8]" />
            </div>
          </div>
          <div className="bg-[#fdf6e3] border border-[#f0dfa0] rounded-xl px-4 py-3 text-xs text-[#a07830]">
            After saving, the agent will receive a WhatsApp message to login at <strong>srikrishnaadairy.in/delivery</strong>
          </div>
          <button
            disabled={agentSaving || !agentForm.full_name || !agentForm.phone || !agentForm.email || !agentForm.password}
            onClick={async () => {
              setAgentSaving(true)
              try {
                const ts = Date.now()
                let photo_url = null, document_url = null
                if (agentPhoto) {
                  const { data: pData } = await supabase.storage
                    .from('delivery-agent-docs')
                    .upload(`photos/${agentForm.phone}_${ts}`, agentPhoto, { upsert: true })
                  if (pData) {
                    const { data: { publicUrl } } = supabase.storage.from('delivery-agent-docs').getPublicUrl(pData.path)
                    photo_url = publicUrl
                  }
                }
                if (agentDoc) {
                  const { data: dData } = await supabase.storage
                    .from('delivery-agent-docs')
                    .upload(`docs/${agentForm.phone}_${ts}`, agentDoc, { upsert: true })
                  if (dData) {
                    const { data: { publicUrl } } = supabase.storage.from('delivery-agent-docs').getPublicUrl(dData.path)
                    document_url = publicUrl
                  }
                }
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/create-delivery-agent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ ...agentForm, photo_url, document_url }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || 'Failed to save agent')
                setDeliveryAgents(prev => [...prev, { id: json.user_id, full_name: agentForm.full_name, phone: agentForm.phone, is_delivery: true }])
                setDeliveryAgentRecords(prev => [...prev, { ...agentForm, photo_url, document_url, is_active: true, user_id: json.user_id }])
                setAgentForm({ full_name: '', phone: '', email: '', password: '', address: '', dl_number: '', bike_number: '' })
                setAgentPhoto(null)
                setAgentDoc(null)
                showSuccess(`Agent ${agentForm.full_name} added!`)
                setAgentsSubTab('list')
              } catch (err) {
                showError(err.message || 'Failed to save agent')
              }
              setAgentSaving(false)
            }}
            className="text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow text-sm disabled:opacity-50"
            style={{background: 'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            {agentSaving ? 'Saving...' : 'Save Agent'}
          </button>
        </div>
      </div>
    )}

    {/* Assign Orders sub-tab */}
    {agentsSubTab === 'assign' && (() => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const combined = [
        ...orders.map(o => ({
          ...o,
          _type: o.payment_method === 'COD' ? 'trial' : 'order',
          _date: o.delivery_date || '',
          _profile: o.profiles,
        })),
        ...todaySubscriptions.map(sub => ({
          ...sub,
          _type: 'subscription',
          _date: today,
          _profile: sub.profiles,
        })),
      ]
      const areas = [...new Set(combined.map(i => i._profile?.area).filter(Boolean))].sort()
      const filtered = combined.filter(item => {
        const p = item._profile
        if (assignSearch) {
          const q = assignSearch.toLowerCase()
          if (!p?.full_name?.toLowerCase().includes(q) && !p?.phone?.includes(q)) return false
        }
        if (assignAreaFilter !== 'all' && p?.area !== assignAreaFilter) return false
        if (assignDateFilter && item._date !== assignDateFilter) return false
        if (assignSlotFilter !== 'all' && item.delivery_slot !== assignSlotFilter) return false
        return true
      })
      return (
        <div className="flex flex-col gap-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-4 shadow-sm flex flex-wrap gap-3">
            <input type="text" placeholder="Search customer or phone…" value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
              className="flex-1 min-w-0 border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38]" />
            <select value={assignAreaFilter} onChange={e => setAssignAreaFilter(e.target.value)}
              className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
              <option value="all">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" value={assignDateFilter} onChange={e => setAssignDateFilter(e.target.value)}
              className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38]" />
            <select value={assignSlotFilter} onChange={e => setAssignSlotFilter(e.target.value)}
              className="text-sm border border-[#e8e0d0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
              <option value="all">All Slots</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </select>
          </div>
          {/* Order list */}
          <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[#f5f0e8]">
              <p className="text-xs text-gray-400">{filtered.length} items · orders + subscriptions</p>
            </div>
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-400 text-sm">No orders match filters</p>
              </div>
            ) : (
              <div>
                {filtered.map((item, index, arr) => (
                  <div key={(item._type === 'subscription' ? 'sub-' : 'ord-') + item.id}
                    className={`px-6 py-4 flex items-start gap-3 ${index !== arr.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                    <div className="w-9 h-9 rounded-xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 text-base">
                      {item._type === 'subscription' ? '📅' : item._type === 'trial' ? '🎁' : '🛒'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-[#1c1c1c] text-sm">{item._profile?.full_name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          item._type === 'subscription' ? 'bg-[#f0faf4] text-[#1a5c38] border-[#c8e6d4]'
                          : item._type === 'trial' ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : 'bg-[#fdf6e3] text-[#d4a017] border-[#f0dfa0]'
                        }`}>
                          {item._type === 'subscription' ? '📅 Sub' : item._type === 'trial' ? '🎁 Trial' : '🛒 Order'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">📞 {item._profile?.phone}</p>
                      <p className="text-xs text-gray-400">{item._profile?.area} · {item._profile?.apartment_name}{item._profile?.flat_number ? `, Flat ${item._profile.flat_number}` : ''}</p>
                      <p className="text-xs text-[#1a5c38] font-medium mt-0.5">
                        {item.products?.size} × {item.quantity} · {item.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'} · {item._date}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {deliveryAgents.length === 0 ? (
                        <span className="text-xs text-gray-400 border border-[#e8e0d0] px-3 py-1.5 rounded-lg">No agents</span>
                      ) : (
                        <select
                          value={item.assigned_to || ''}
                          onChange={async (e) => {
                            const agentId = e.target.value
                            const table = item._type === 'subscription' ? 'subscriptions' : 'orders'
                            await supabase.from(table).update({ assigned_to: agentId || null }).eq('id', item.id)
                            if (item._type === 'subscription') {
                              setTodaySubscriptions(prev => prev.map(s => s.id === item.id ? { ...s, assigned_to: agentId } : s))
                            } else {
                              setOrders(prev => prev.map(o => o.id === item.id ? { ...o, assigned_to: agentId } : o))
                            }
                          }}
                          className="text-xs border border-[#e8e0d0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
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
        </div>
      )
    })()}

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
            <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center flex-shrink-0 p-1.5">
              <img src="/bottle.png" alt="Milk" className="w-full h-full object-contain" />
            </div>
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

    {/* Failed Deductions */}
    <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[#f5f0e8]">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">❌ Failed Subscription Deductions</h3>
        <p className="text-xs text-gray-400 mt-0.5">{failedDeductions.length} total failures</p>
      </div>
      {failedDeductions.length === 0 ? (
        <div className="px-6 py-12 text-center text-gray-400 text-sm">No failed deductions. All subscriptions are healthy!</div>
      ) : (
        <div className="divide-y divide-[#f5f0e8]">
          {failedDeductions.map((d) => (
            <div key={d.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm text-[#1c1c1c]">{customers.find(c => c.id === d.user_id)?.full_name || 'Customer'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">📞 {customers.find(c => c.id === d.user_id)?.phone || 'N/A'} · Sub #{d.subscription_id}</p>
                  <p className="text-xs text-red-500 mt-0.5 font-medium">{d.reason}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Amount due: ₹{d.amount}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          ))}
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

    {/* ── Settings Tab ── */}
    {activeTab === 'settings' && (
      <div className="flex flex-col gap-6">

        {/* A. Business Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">⚙️ Business Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            {[
              { key: 'max_subscribers', label: 'Max Subscribers', type: 'number', placeholder: '100' },
              { key: 'delivery_cutoff_time', label: 'Delivery Cutoff Time', type: 'time', placeholder: '18:00' },
              { key: 'min_wallet_balance', label: 'Min Wallet Balance (₹)', type: 'number', placeholder: '300' },
              { key: 'pause_limit_per_month', label: 'Pause Limit per Month', type: 'number', placeholder: '5' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">{label}</label>
                <div className="flex gap-2">
                  <input type={type} value={appSettings[key] || ''}
                    onChange={e => setAppSettings(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
                  <button onClick={() => saveSetting(key, appSettings[key])} disabled={settingsSaving[key]}
                    className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'waitlist_enabled', label: 'Waitlist Enabled', defaultOn: true },
              { key: 'maintenance_mode', label: 'Maintenance Mode', defaultOn: false },
            ].map(({ key, label, defaultOn }) => {
              const isOn = appSettings[key] !== undefined ? appSettings[key] === 'true' : defaultOn
              return (
                <div key={key} className="flex items-center justify-between bg-[#f5f0e8] rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-[#1c1c1c]">{label}</span>
                  <button onClick={() => saveSetting(key, isOn ? 'false' : 'true')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${isOn ? 'bg-[#1a5c38]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* B. Product Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">🥛 Product Controls</h3>
          <div className="flex flex-col gap-3 mb-6">
            {products.map(product => {
              const edit = editProducts[product.id] !== undefined ? editProducts[product.id] : product
              return (
                <div key={product.id} className="bg-[#f5f0e8] rounded-xl p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { field: 'name', label: 'Name', type: 'text' },
                      { field: 'size', label: 'Size', type: 'text' },
                      { field: 'price', label: 'Price (₹)', type: 'number' },
                    ].map(({ field, label, type }) => (
                      <div key={field}>
                        <label className="block text-xs text-gray-400 mb-1">{label}</label>
                        <input type={type} value={edit[field] || ''}
                          onChange={e => setEditProducts(p => ({ ...p, [product.id]: { ...edit, [field]: e.target.value } }))}
                          className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38] bg-white" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Available</label>
                      <button
                        onClick={() => setEditProducts(p => ({ ...p, [product.id]: { ...edit, is_available: !edit.is_available } }))}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition ${edit.is_available ? 'bg-[#1a5c38] text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {edit.is_available ? '✅ Available' : '❌ Disabled'}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => saveProductEdit(product.id)}
                    className="bg-[#d4a017] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#b8860b] transition">
                    Save Changes
                  </button>
                </div>
              )
            })}
          </div>
          <div className="border-2 border-dashed border-[#e8e0d0] rounded-xl p-5">
            <p className="text-sm font-bold text-[#1c1c1c] mb-4">+ Add New Product</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { field: 'name', label: 'Name', placeholder: 'Fresh Cow Milk', type: 'text' },
                { field: 'size', label: 'Size', placeholder: '500ml', type: 'text' },
                { field: 'price', label: 'Price (₹)', placeholder: '50', type: 'number' },
              ].map(({ field, label, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <input type={type} value={newProduct[field]}
                    onChange={e => setNewProduct(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38]" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Available</label>
                <button onClick={() => setNewProduct(p => ({ ...p, is_available: !p.is_available }))}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition ${newProduct.is_available ? 'bg-[#1a5c38] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {newProduct.is_available ? '✅ Available' : '❌ Disabled'}
                </button>
              </div>
            </div>
            <button onClick={addNewProduct} disabled={productAddLoading || !newProduct.name || !newProduct.size || !newProduct.price}
              className="bg-[#1a5c38] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
              {productAddLoading ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        </div>

        {/* C. Delivery Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">🚴 Delivery Controls</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { key: 'morning_slot_enabled', label: '🌅 Morning Slot' },
              { key: 'evening_slot_enabled', label: '🌆 Evening Slot' },
              { key: 'trial_order_enabled', label: '🎁 Trial Orders' },
            ].map(({ key, label }) => {
              const isOn = appSettings[key] !== 'false'
              return (
                <div key={key} className="flex items-center justify-between bg-[#f5f0e8] rounded-xl px-4 py-3">
                  <span className="text-sm font-semibold text-[#1c1c1c]">{label}</span>
                  <button onClick={() => saveSetting(key, isOn ? 'false' : 'true')}
                    className={`relative w-12 h-6 rounded-full transition-colors ${isOn ? 'bg-[#1a5c38]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2">Bottle Deposit Amount (₹)</label>
            <div className="flex gap-2 max-w-xs">
              <input type="number" min="0" value={appSettings.bottle_deposit_amount || '200'}
                onChange={e => setAppSettings(p => ({ ...p, bottle_deposit_amount: e.target.value }))}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
              <button onClick={() => saveSetting('bottle_deposit_amount', appSettings.bottle_deposit_amount)} disabled={settingsSaving.bottle_deposit_amount}
                className="bg-[#1a5c38] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-3">Holiday / No-Delivery Dates</p>
            <div className="flex gap-2 mb-4 max-w-sm">
              <input type="date" value={newHoliday}
                onChange={e => setNewHoliday(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]" />
              <button onClick={addHoliday} disabled={!newHoliday}
                className="bg-[#d4a017] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#b8860b] transition disabled:opacity-50">
                Add
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {(() => {
                const today = new Date().toISOString().split('T')[0]
                const upcoming = JSON.parse(appSettings.holidays || '[]').filter(d => d >= today)
                return upcoming.length === 0
                  ? <p className="text-xs text-gray-400 italic">No upcoming holidays scheduled</p>
                  : upcoming.map(date => (
                    <div key={date} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <span className="text-sm font-semibold text-red-700">
                        🚫 {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => removeHoliday(date)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold transition">Remove</button>
                    </div>
                  ))
              })()}
            </div>
          </div>
        </div>

        {/* D. Customer Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">👥 Customer Controls</h3>
          <input type="text" placeholder="Search by name or phone..."
            value={customerSearch}
            onChange={e => handleCustomerSearch(e.target.value)}
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] mb-4" />
          {settingsCustomers.map(customer => (
            <div key={customer.id} className="bg-[#f5f0e8] rounded-xl p-4 mb-3">
              <div className="mb-3">
                <p className="font-bold text-[#1c1c1c]">{customer.full_name}</p>
                <p className="text-xs text-gray-500">📞 {customer.phone} · {customer.area}</p>
                {customer.is_banned && <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">Banned</span>}
                {customer.has_used_cod && <span className="inline-block mt-1 ml-1 text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">COD used</span>}
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={() => resetCod(customer.id, customer.full_name)}
                  className="bg-[#fdf6e3] border border-[#f0dfa0] text-[#d4a017] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#f0dfa0] transition">
                  Reset COD
                </button>
                <button onClick={() => toggleBan(customer.id, customer.is_banned, customer.full_name)}
                  className={`font-bold px-3 py-1.5 rounded-lg text-xs transition ${customer.is_banned ? 'bg-[#f0faf4] border border-[#c8e6d4] text-[#1a5c38] hover:bg-[#d4eddf]' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'}`}>
                  {customer.is_banned ? 'Unban' : 'Ban'}
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <input type="number" min="1" placeholder="Days to extend"
                  value={extendDaysMap[customer.id] || ''}
                  onChange={e => setExtendDaysMap(p => ({ ...p, [customer.id]: e.target.value }))}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38] bg-white" />
                <button onClick={() => extendSubscription(customer.id, customer.full_name, extendDaysMap[customer.id])}
                  className="bg-[#1a5c38] text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-[#14472c] transition whitespace-nowrap">
                  Extend Sub
                </button>
              </div>
              <div className="flex gap-2">
                <input type="date"
                  value={pauseDateMap[customer.id] || ''}
                  onChange={e => setPauseDateMap(p => ({ ...p, [customer.id]: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a5c38] bg-white" />
                <button onClick={() => pauseDelivery(customer.id, customer.full_name, pauseDateMap[customer.id])}
                  className="bg-[#d4a017] text-white font-bold px-3 py-2 rounded-lg text-xs hover:bg-[#b8860b] transition whitespace-nowrap">
                  Pause Date
                </button>
              </div>
            </div>
          ))}
          {customerSearch && settingsCustomers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No customers found</p>
          )}
          {!customerSearch && (
            <p className="text-sm text-gray-400 text-center py-4">Type a name or phone number to search</p>
          )}
        </div>

        {/* E. Notification Controls */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">📣 Broadcast Message</h3>
          <p className="text-sm text-gray-500 mb-4">Send a WhatsApp message to all {customers.filter(c => c.phone).length} customers</p>
          <textarea
            value={broadcastMessage}
            onChange={e => setBroadcastMessage(e.target.value)}
            rows={4}
            placeholder="Type your message here..."
            className="w-full border border-[#e8e0d0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1a5c38] resize-none mb-3" />
          {!broadcastConfirm ? (
            <button onClick={() => setBroadcastConfirm(true)} disabled={!broadcastMessage.trim()}
              className="bg-[#d4a017] text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-[#b8860b] transition disabled:opacity-50">
              Send to All via WhatsApp
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-3">⚠️ Confirm: Send to {customers.filter(c => c.phone).length} customers?</p>
              <div className="flex gap-2">
                <button onClick={sendBroadcast} disabled={broadcastLoading}
                  className="bg-[#1a5c38] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#14472c] transition disabled:opacity-50">
                  {broadcastLoading ? 'Sending...' : '✅ Confirm Send'}
                </button>
                <button onClick={() => setBroadcastConfirm(false)}
                  className="border border-gray-300 text-gray-600 font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* F. Priority Waitlist */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">⏳ Priority Waitlist</h3>
            <div className="flex items-center gap-2">
              <span className="bg-[#fdf6e3] border border-[#f0dfa0] text-[#d4a017] font-bold text-xs px-3 py-1.5 rounded-full">
                {waitlistEntries.length} total
              </span>
              <button onClick={exportWaitlistCSV}
                className="bg-[#f5f0e8] text-[#1c1c1c] font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#e8e0d0] transition">
                Export CSV
              </button>
            </div>
          </div>
          {waitlistEntries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No waitlist entries yet</p>
          ) : (
            Object.entries(
              waitlistEntries.reduce((groups, entry) => {
                const area = entry.area || 'Other'
                if (!groups[area]) groups[area] = []
                groups[area].push(entry)
                return groups
              }, {})
            ).sort(([a], [b]) => a.localeCompare(b)).map(([area, entries]) => (
              <div key={area} className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-[#1a5c38]">📍 {area}</span>
                  <span className="bg-[#f0faf4] border border-[#c8e6d4] text-[#1a5c38] font-bold text-xs px-2 py-0.5 rounded-full">{entries.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {entries.map(entry => (
                    <div key={entry.id} className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border ${entry.invited ? 'bg-[#f0faf4] border-[#c8e6d4]' : 'bg-[#f5f0e8] border-[#e8e0d0]'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#1c1c1c] truncate">{entry.name}</p>
                        <p className="text-xs text-gray-400">📞 {entry.phone} · {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        {entry.invited && <span className="text-xs text-[#1a5c38] font-semibold">✅ Invited</span>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => inviteWaitlistEntry(entry)} disabled={entry.invited || invitingId === entry.id}
                          className="bg-[#25D366] text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#1da851] transition disabled:opacity-40 whitespace-nowrap">
                          {invitingId === entry.id ? '…' : 'Invite'}
                        </button>
                        <button onClick={() => deleteWaitlistEntry(entry.id)}
                          className="bg-red-50 border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-red-100 transition">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    )}

    {/* ── Stop Subscription Modal ── */}
    {stopSubPopup && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 className="font-bold text-lg text-[#1c1c1c] mb-3">Stop Subscription?</h3>
          <p className="text-sm text-gray-500 mb-4">
            Are you sure you want to stop this subscription for{' '}
            <strong>{stopSubPopup.profiles?.full_name}</strong>?
            <br />
            <span className="text-xs text-gray-400">This will send an email and WhatsApp notification to the customer.</span>
          </p>
          <div className="mb-3">
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Cancelled by</label>
            <select
              value={stopCancelledBy}
              onChange={e => setStopCancelledBy(e.target.value)}
              className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]">
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
              <option value="delivery_agent">Delivery Agent</option>
            </select>
          </div>
          <div className="mb-5">
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-1.5 block">Reason (optional)</label>
            <input
              type="text"
              value={stopCancellationReason}
              onChange={e => setStopCancellationReason(e.target.value)}
              placeholder="e.g. Customer relocated"
              className="w-full border border-[#e8e0d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] bg-[#fdfbf7]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStopSubPopup(null)}
              className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              disabled={stoppingSubId === stopSubPopup.id}
              onClick={async () => {
                setStoppingSubId(stopSubPopup.id)
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/stop-subscription', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({
                    subscription_id: stopSubPopup.id,
                    cancelled_by: stopCancelledBy,
                    cancellation_reason: stopCancellationReason || null,
                  }),
                })
                if (res.ok) {
                  setSubscriptions(prev => prev.map(s => s.id !== stopSubPopup.id ? s : {
                    ...s, is_active: false,
                    cancelled_by: stopCancelledBy,
                    cancellation_reason: stopCancellationReason || null,
                  }))
                  setTodaySubscriptions(prev => prev.filter(s => s.id !== stopSubPopup.id))
                  showSuccess(`Subscription stopped for ${stopSubPopup.profiles?.full_name}`)
                  setStopSubPopup(null)
                } else {
                  showError('Failed to stop subscription. Please try again.')
                }
                setStoppingSubId(null)
              }}
              className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-600 transition disabled:opacity-50">
              {stoppingSubId === stopSubPopup.id ? 'Stopping...' : 'Yes, Stop'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Send WhatsApp Modal ── */}
    {customWaModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-[#1c1c1c]">Send WhatsApp</h3>
            <button onClick={() => setCustomWaModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
          <p className="text-sm text-gray-500 mb-4">To: <strong className="text-[#1c1c1c]">{customWaModal.full_name}</strong> ({customWaModal.phone})</p>
          <div className="mb-4">
            <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Message Type</label>
            <select
              value={customWaType}
              onChange={e => setCustomWaType(e.target.value)}
              className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38]">
              <option value="order_confirmation">Order Confirmation</option>
              <option value="subscription_active">Subscription Active</option>
              <option value="low_balance">Low Balance Alert</option>
              <option value="custom">Custom Message</option>
            </select>
          </div>
          {customWaType === 'custom' && (
            <div className="mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Custom messages only work if the customer has messaged your WhatsApp number first (within 24 hours). Use template messages for outbound.
                </p>
              </div>
              <label className="text-xs font-bold text-[#1c1c1c] uppercase tracking-widest mb-2 block">Message</label>
              <textarea
                value={customWaMessage}
                onChange={e => setCustomWaMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a5c38] resize-none"
              />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setCustomWaModal(null)}
              className="flex-1 border border-[#e8e0d0] text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              disabled={customWaLoading || (customWaType === 'custom' && !customWaMessage.trim())}
              onClick={async () => {
                setCustomWaLoading(true)
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/admin/resend-whatsapp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                  body: JSON.stringify({ userId: customWaModal.id, messageType: customWaType, customMessage: customWaMessage }),
                })
                setCustomWaLoading(false)
                if (res.ok) {
                  showSuccess('WhatsApp sent to ' + customWaModal.full_name)
                  setCustomWaModal(null)
                } else {
                  showError('Failed to send WhatsApp')
                }
              }}
              className="flex-1 bg-[#25D366] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1da851] transition disabled:opacity-50">
              {customWaLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    )}

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

    </div>
    </div>

  )
}