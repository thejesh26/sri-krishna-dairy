'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => { getUser() }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return { text: 'Good Morning', icon: '🌅' }
    if (hour < 17) return { text: 'Good Afternoon', icon: '☀️' }
    return { text: 'Good Evening', icon: '🌙' }
  }

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profile)
    const { data: orders } = await supabase.from('orders').select('*, products(*)')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
    setOrders(orders || [])
    const { data: subscriptions } = await supabase.from('subscriptions').select('*, products(*)')
      .eq('user_id', user.id).eq('is_active', true)
    setSubscriptions(subscriptions || [])

    // Load wallet balance
    const { data: walletData } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)
    setWalletBalance(walletData?.[0]?.balance || 0)

    setLoading(false)
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
        <p className="text-[#1a5c38] font-semibold font-[family-name:var(--font-playfair)]">Loading your dashboard...</p>
      </div>
    </div>
  )

  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] || 'Customer'
  const totalDailyValue = subscriptions.reduce((sum, sub) => sum + (sub.products?.price * sub.quantity), 0)
  const nextDelivery = subscriptions[0]

  return (
    <div className="min-h-screen bg-[#fdfbf7]">

      {/* Header */}
      <header className="bg-white px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm border-b border-[#e8e0d0] sticky top-0 z-50">
        <a href="/dashboard" className="flex items-center gap-2">
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

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Welcome Banner */}
        <div className="rounded-2xl p-8 mb-8 text-white relative overflow-hidden shadow-lg"
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
              <p className="text-green-300 text-sm mt-1">📞 {profile?.phone}</p>
            </div>
            <img src="/Logo.jpg" alt="Logo"
              className="h-20 w-20 rounded-full object-cover border-4 border-[#d4a017] border-opacity-60 shadow-xl hidden sm:block" />
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white border-opacity-20">
            <div className="text-center">
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#d4a017]">{subscriptions.length}</p>
              <p className="text-green-300 text-xs mt-1 uppercase tracking-widest">Active Plans</p>
            </div>
            <div className="text-center border-x border-white border-opacity-20">
              <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#d4a017]">₹{totalDailyValue}</p>
              <p className="text-green-300 text-xs mt-1 uppercase tracking-widest">Per Day</p>
            </div>
            <div className="text-center cursor-pointer" onClick={() => window.location.href='/wallet'}>
  <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#d4a017]">₹{walletBalance}</p>
  <p className="text-green-300 text-xs mt-1 uppercase tracking-widest">Wallet</p>
</div>
          </div>
        </div>

        {/* Today's Delivery Status */}
        {nextDelivery && (
          <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Today's Delivery</h3>
              <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-bold px-3 py-1.5 rounded-full border border-[#c8e6d4]">
                Scheduled
              </span>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f0e8] flex items-center justify-center text-4xl flex-shrink-0">🥛</div>
              <div className="flex-1">
                <p className="font-semibold text-[#1c1c1c] text-base">{nextDelivery.products?.size} Fresh Cow Milk</p>
                <p className="text-gray-400 text-sm mt-1">{nextDelivery.quantity} bottle(s) per day</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-semibold px-3 py-1 rounded-full">
                    {nextDelivery.delivery_slot === 'morning' ? '🌅 5AM - 8AM' : '🌆 5PM - 7PM'}
                  </span>
                  <span className="bg-[#f5f0e8] text-[#1c1c1c] text-xs font-medium px-3 py-1 rounded-full">
                    {nextDelivery.delivery_mode === 'keep_bottle' ? '🏺 Keep Bottle' : '🔄 Direct Delivery'}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { href: '/order', icon: '🛒', label: 'Order Now', desc: 'One time delivery', color: '#f0faf4', border: '#c8e6d4' },
            { href: '/subscribe', icon: '📅', label: 'Subscribe', desc: 'Daily milk plan', color: '#fdf6e3', border: '#f0dfa0' },
            { href: '/pause', icon: '⏸️', label: 'Manage Plan', desc: 'Pause or cancel', color: '#f5f0e8', border: '#e8e0d0' },
            { href: '/wallet', icon: '💰', label: 'Wallet', desc: 'Add balance', color: '#f0faf4', border: '#c8e6d4' },
          ].map(({ href, icon, label, desc, color, border }) => (
            <a key={label} href={href}
              className="rounded-2xl p-5 border hover:shadow-md transition group"
              style={{background: color, borderColor: border}}>
              <div className="text-3xl mb-3">{icon}</div>
              <p className="font-semibold text-[#1c1c1c] text-sm group-hover:text-[#1a5c38] transition">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </a>
          ))}
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden mb-6 shadow-sm">
          <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">My Subscriptions</h3>
            <a href="/subscribe"
              className="text-xs text-[#1a5c38] font-semibold bg-[#f0faf4] border border-[#c8e6d4] px-4 py-2 rounded-full hover:bg-[#d4eddf] transition">
              + New Plan
            </a>
          </div>
          {subscriptions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-6xl mb-4">🥛</div>
              <p className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">No Active Subscriptions</p>
              <p className="text-gray-400 text-sm mb-6">Subscribe for daily fresh milk delivery</p>
              <a href="/subscribe"
                className="inline-block text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                Subscribe Now
              </a>
            </div>
          ) : (
            subscriptions.map((sub, index) => (
              <div key={sub.id}
                className={`px-6 py-5 flex items-center gap-5 ${index !== subscriptions.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="w-16 h-16 rounded-2xl bg-[#f5f0e8] flex items-center justify-center text-3xl flex-shrink-0">🥛</div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1c1c1c]">{sub.products?.size} Fresh Cow Milk</p>
                  <p className="text-sm text-gray-400 mt-1">{sub.quantity} bottle/day • Started {new Date(sub.start_date).toLocaleDateString('en-IN')}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-[#f0faf4] text-[#1a5c38] text-xs font-medium px-3 py-1 rounded-full border border-[#c8e6d4]">Active</span>
                    <span className="bg-[#fdf6e3] text-[#d4a017] text-xs font-medium px-3 py-1 rounded-full border border-[#f0dfa0]">
                      {sub.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                    </span>
                    {sub.paused_dates?.length > 0 && (
                      <span className="bg-gray-50 text-gray-500 text-xs font-medium px-3 py-1 rounded-full border border-gray-200">
                        {sub.paused_dates.length} paused
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38]">₹{sub.products?.price * sub.quantity}</p>
                  <p className="text-xs text-gray-400 mb-2">/day</p>
                  <a href="/pause" className="text-xs text-[#d4a017] font-semibold border border-[#f0dfa0] px-3 py-1 rounded-full hover:bg-[#fdf6e3] transition">
                    Manage
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden mb-6 shadow-sm">
          <div className="px-6 py-5 border-b border-[#f5f0e8] flex items-center justify-between">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">Recent Orders</h3>
            <a href="/order"
              className="text-xs text-[#1a5c38] font-semibold bg-[#f0faf4] border border-[#c8e6d4] px-4 py-2 rounded-full hover:bg-[#d4eddf] transition">
              + New Order
            </a>
          </div>
          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-2">No Orders Yet</p>
              <p className="text-gray-400 text-sm mb-6">Place your first order today</p>
              <a href="/order"
                className="inline-block text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition shadow"
                style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
                Order Now
              </a>
            </div>
          ) : (
            orders.map((order, index) => (
              <div key={order.id}
                className={`px-6 py-5 flex items-center gap-5 ${index !== orders.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}>
                <div className="w-16 h-16 rounded-2xl bg-[#f5f0e8] flex items-center justify-center text-3xl flex-shrink-0">🥛</div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1c1c1c]">{order.products?.size} Fresh Cow Milk</p>
                  <p className="text-sm text-gray-400 mt-1">{order.quantity} bottle • {order.delivery_slot === 'morning' ? '🌅 Morning' : '🌆 Evening'}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.delivery_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                    order.status === 'delivered' ? 'bg-[#f0faf4] text-[#1a5c38] border border-[#c8e6d4]' :
                    order.status === 'pending' ? 'bg-[#fdf6e3] text-[#d4a017] border border-[#f0dfa0]' :
                    'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    {order.status === 'delivered' ? 'Delivered' : order.status === 'pending' ? 'Pending' : order.status}
                  </span>
                  <p className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#1a5c38] mt-2">₹{order.total_price}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Our Milk Journey */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] overflow-hidden shadow-sm mb-6">
          <div className="px-6 py-5 border-b border-[#f5f0e8]">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c]">🐄 From Farm to Your Door</h3>
            <p className="text-xs text-gray-400 mt-0.5">How your milk travels before reaching you every day</p>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {[
                { icon: '🐄', title: 'Milking', desc: 'Cows milked hygienically at 4–6 AM at our farm in Kammasandra, Bangalore Rural' },
                { icon: '🧪', title: 'Quality Check', desc: 'Every batch tested for freshness, purity & fat content before dispatch' },
                { icon: '🫧', title: 'Bottle Cleaning', desc: 'All returned bottles thoroughly washed, sanitized & sterilized' },
                { icon: '🥛', title: 'Filling & Sealing', desc: 'Measured quantities hygienically filled & sealed' },
                { icon: '📦', title: 'Packing', desc: 'Labelled & packed in insulated delivery bags to retain freshness' },
                { icon: '🛵', title: 'Route Dispatch', desc: 'Delivery agents dispatched by 5 AM with optimized routes' },
                { icon: '🏠', title: 'Door Delivery', desc: 'Fresh at your doorstep within your chosen morning or evening slot' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#f0faf4] border-2 border-[#c8e6d4] flex items-center justify-center text-lg flex-shrink-0">
                    {icon}
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-[#1c1c1c] text-sm">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white rounded-2xl border border-[#e8e0d0] p-6 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#1c1c1c] mb-5">Need Help?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="tel:8553666002"
              className="flex items-center gap-4 border border-[#e8e0d0] rounded-xl p-4 hover:border-[#1a5c38] hover:shadow-sm transition">
              <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center text-2xl flex-shrink-0">📞</div>
              <div>
                <p className="font-semibold text-[#1c1c1c]">Call Us</p>
                <p className="text-sm text-gray-400">8553666002</p>
                <p className="text-xs text-gray-400">Mon-Sun, 6AM - 8PM</p>
              </div>
            </a>
            <a href="https://wa.me/918553666002" target="_blank"
              className="flex items-center gap-4 border border-[#e8e0d0] rounded-xl p-4 hover:border-[#25D366] hover:shadow-sm transition">
              <div className="w-12 h-12 rounded-xl bg-[#f0faf4] flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[#1c1c1c]">WhatsApp</p>
                <p className="text-sm text-gray-400">Chat with us</p>
                <p className="text-xs text-gray-400">Quick replies guaranteed</p>
              </div>
            </a>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="bg-[#0d1f13] text-white px-6 pt-16 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 pb-12 border-b border-gray-800">

            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/Logo.jpg" alt="Logo" className="h-14 w-14 rounded-full object-cover border-2 border-[#d4a017]" />
                <div>
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-lg leading-tight">Sri Krishnaa<br />Dairy Farms</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Pure, fresh cow milk delivered straight from our farm to your doorstep every morning.
              </p>
              <div className="flex gap-3">
                <a href="https://wa.me/918553666002" target="_blank"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-semibold px-4 py-2 rounded transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a href="tel:8553666002"
                  className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold px-4 py-2 rounded transition">
                  📞 Call Us
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Quick Links</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="/dashboard" className="hover:text-[#d4a017] transition">Dashboard</a></li>
                <li><a href="/subscribe" className="hover:text-[#d4a017] transition">Subscribe</a></li>
                <li><a href="/order" className="hover:text-[#d4a017] transition">Order Now</a></li>
                <li><a href="/wallet" className="hover:text-[#d4a017] transition">Wallet</a></li>
                <li><a href="/profile" className="hover:text-[#d4a017] transition">My Profile</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Legal</p>
              <ul className="flex flex-col gap-3 text-sm text-gray-400">
                <li><a href="/privacy-policy" className="hover:text-[#d4a017] transition">Privacy Policy</a></li>
                <li><a href="/terms-of-service" className="hover:text-[#d4a017] transition">Terms of Service</a></li>
                <li><a href="/refund-policy" className="hover:text-[#d4a017] transition">Refund Policy</a></li>
                <li><a href="/health-disclaimer" className="hover:text-[#d4a017] transition">Health Disclaimer</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Contact Us</p>
              <ul className="flex flex-col gap-4 text-sm text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📞</span>
                  <a href="tel:8553666002" className="hover:text-white transition">8553666002</a>
                </li>
                <li className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <a href="https://wa.me/918553666002" target="_blank" className="hover:text-white transition">WhatsApp Us</a>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">📍</span>
                  <span>Kattigenahalli,<br />Bangalore, Karnataka</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a017] mt-0.5">🕐</span>
                  <span>Morning: 5AM – 8AM<br />Evening: 5PM – 7PM</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Middle Footer */}
          <div className="py-8 border-b border-gray-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { icon: '🌿', text: 'No Preservatives' },
                { icon: '🐄', text: 'Farm Direct' },
                { icon: '✅', text: 'Quality Tested' },
                { icon: '💚', text: 'Ethically Farmed' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center justify-center gap-2">
                  <span>{icon}</span>
                  <span className="text-gray-400 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
            <div className="text-center sm:text-left">
              <p>© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
              <p className="text-gray-600 mt-0.5">FSSAI Lic. No: <span className="text-gray-400">21225008004544</span></p>
            </div>
            <p className="text-gray-600">Made with ❤️ in Bangalore</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/privacy-policy" className="hover:text-gray-300 transition">Privacy Policy</a>
              <a href="/terms-of-service" className="hover:text-gray-300 transition">Terms of Service</a>
              <a href="/refund-policy" className="hover:text-gray-300 transition">Refund Policy</a>
              <a href="/health-disclaimer" className="hover:text-gray-300 transition">Health Disclaimer</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}