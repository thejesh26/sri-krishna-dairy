'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Footer from '../components/Footer'

function ConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          router.push('/dashboard')
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const content = {
    order: {
      icon: <img src="/bottle.png" alt="Milk" className="w-14 h-14 object-contain" />,
      title: 'Order Placed Successfully!',
      message: 'Your milk will be delivered at your doorstep on the selected date.',
      color: '#1a5c38',
    },
    subscription: {
      icon: '📅',
      title: 'Subscription Activated!',
      message: 'Fresh milk will be delivered to your doorstep every day as per your plan.',
      color: '#1a5c38',
    },
  }

  const current = content[type] || content.order

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col">

      <header className="bg-white px-6 py-4 flex items-center shadow-sm border-b border-[#e8e0d0]">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-12 w-12 rounded-full object-cover border-2 border-[#d4a017] shadow-sm" />
          <div>
            <h1 className="text-base font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</h1>
            <p className="text-xs text-[#d4a017] font-medium">Farm Fresh - Pure - Natural</p>
          </div>
        </a>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-[#e8e0d0] p-10 w-full max-w-md text-center">

          {/* Success Animation */}
          <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl shadow-lg"
            style={{background:'linear-gradient(135deg, #f0faf4, #d4eddf)'}}>
            {current.icon}
          </div>

          {/* Gold checkmark */}
          <div className="w-10 h-10 rounded-full bg-[#d4a017] flex items-center justify-center mx-auto -mt-8 mb-6 shadow border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#1a5c38] mb-3">
            {current.title}
          </h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            {current.message}
          </p>

          {/* What happens next */}
          <div className="bg-[#f5f0e8] rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-[#d4a017] uppercase tracking-widest mb-3">What happens next?</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38]">✓</span>
                <span>Our team has received your {type === 'subscription' ? 'subscription' : 'order'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38]">✓</span>
                <span>Fresh milk will be prepared from our farm</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[#1a5c38]">✓</span>
                <span>Delivered to your doorstep on time</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <p className="text-sm text-gray-500 mb-6">
            Questions? Call <strong className="text-[#1c1c1c]">9980166221</strong> or email <strong className="text-[#1c1c1c]">hello@srikrishnaadairy.in</strong>
          </p>

          {/* Auto redirect */}
          <p className="text-xs text-gray-400">
            Redirecting to dashboard in <span className="font-bold text-[#1a5c38]">{countdown}</span> seconds...
          </p>

          <a href="/dashboard"
            className="block mt-4 text-white py-3 rounded-xl font-bold hover:opacity-90 transition shadow"
            style={{background:'linear-gradient(135deg, #1a5c38, #2d7a50)'}}>
            Go to Dashboard
          </a>

        </div>
      </div>

      <Footer variant="public" />

    </div>
  )
}

export default function Confirmation() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
      <p className="text-[#1a5c38] font-semibold">Loading...</p>
    </div>}>
      <ConfirmationContent />
    </Suspense>
  )
}