export const metadata = {
  title: 'System Status — Sri Krishnaa Dairy',
  description: 'Sri Krishnaa Dairy system status page.',
}

const SERVICES = [
  'Website',
  'Ordering System',
  'Delivery Dashboard',
  'Wallet & Payments',
  'WhatsApp Notifications',
]

export default function StatusPage() {
  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-inter)] flex flex-col">

      {/* Header */}
      <header className="border-b border-[#e8e0d0] px-6 py-4 flex items-center gap-3">
        <a href="/" className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-10 w-10 rounded-full object-cover border-2 border-[#d4a017]" />
          <div>
            <p className="text-sm font-bold text-[#1a5c38] font-[family-name:var(--font-playfair)]">Sri Krishnaa Dairy</p>
            <p className="text-xs text-[#d4a017]">Farm Fresh · Pure · Natural</p>
          </div>
        </a>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-6 py-12">

        {/* Overall status */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[#f0faf4] border border-[#c8e6d4] rounded-full px-5 py-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block" />
            <span className="text-sm font-bold text-[#1a5c38]">All Systems Operational</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1c1c1c] font-[family-name:var(--font-playfair)]">System Status</h1>
          <p className="text-xs text-gray-400 mt-2">Last updated: {now} IST</p>
        </div>

        {/* Services */}
        <div className="border border-[#e8e0d0] rounded-2xl overflow-hidden mb-8">
          {SERVICES.map((name, i) => (
            <div
              key={name}
              className={`flex items-center justify-between px-5 py-4 ${i < SERVICES.length - 1 ? 'border-b border-[#f5f0e8]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] flex-shrink-0" />
                <span className="text-sm font-medium text-[#1c1c1c]">{name}</span>
              </div>
              <span className="text-xs font-semibold text-[#22c55e]">Online</span>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="text-center text-sm text-gray-500">
          <p className="mb-3">Having issues? Contact us:</p>
          <p className="flex items-center justify-center gap-2 mb-1">
            <span>📞</span>
            <a href="tel:9980166221" className="font-semibold text-[#1c1c1c] hover:text-[#1a5c38] transition">9980166221</a>
          </p>
          <p className="flex items-center justify-center gap-2">
            <span>📧</span>
            <a href="mailto:support@srikrishnaadairy.in" className="font-semibold text-[#1c1c1c] hover:text-[#1a5c38] transition">support@srikrishnaadairy.in</a>
          </p>
        </div>

      </main>

      <footer className="border-t border-[#e8e0d0] px-6 py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Sri Krishnaa Dairy · <a href="/" className="hover:text-[#1a5c38] transition">Back to Home</a>
      </footer>

    </div>
  )
}
