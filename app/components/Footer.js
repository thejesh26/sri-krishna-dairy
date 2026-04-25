export default function Footer({ variant = 'app' }) {
  const appLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/subscribe', label: 'Subscribe' },
    { href: '/order', label: 'Order Now' },
    { href: '/wallet', label: 'Wallet' },
    { href: '/profile', label: 'My Profile' },
  ]
  const publicLinks = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Login' },
    { href: '/signup', label: 'Sign Up' },
    { href: '/waitlist', label: 'Priority List' },
  ]
  const quickLinks = variant === 'app' ? appLinks : publicLinks

  return (
    <footer className="bg-[#0d1f13] text-white px-6 pt-16 pb-8 mt-auto">
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
            <p className="text-gray-400 text-sm leading-relaxed">
              Pure, fresh cow milk delivered straight from our farm to your doorstep every day.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Quick Links</p>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              {quickLinks.map(({ href, label }) => (
                <li key={href}><a href={href} className="hover:text-[#d4a017] transition">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Explore</p>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              <li><a href="/#how-it-works" className="hover:text-[#d4a017] transition">How It Works</a></li>
              <li><a href="/#why-us" className="hover:text-[#d4a017] transition">Why Choose Us</a></li>
              <li><a href="/#faq" className="hover:text-[#d4a017] transition">FAQ</a></li>
              <li><a href="/#products" className="hover:text-[#d4a017] transition">Our Products</a></li>
              <li><a href="/#contact" className="hover:text-[#d4a017] transition">Contact Us</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-semibold text-white text-sm uppercase tracking-widest mb-5">Contact Us</p>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <span className="text-[#d4a017] mt-0.5">📞</span>
                <a href="tel:9980166221" className="hover:text-white transition">9980166221</a>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#d4a017] mt-0.5">✉️</span>
                <a href="mailto:hello@srikrishnaadairy.in" className="hover:text-white transition">hello@srikrishnaadairy.in</a>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#d4a017] mt-0.5">📍</span>
                <span>Kattigenahalli,<br />Bangalore, Karnataka</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#d4a017] mt-0.5">🕐</span>
                <span>Morning: 7AM – 9AM<br />Evening: 5PM – 7PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Middle strip */}
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

        {/* Bottom strip */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <div className="text-center sm:text-left">
            <p>© 2026 Sri Krishnaa Dairy Farms. All rights reserved.</p>
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
  )
}
