export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy Farms" className="h-16 w-16 rounded-full object-cover shadow" />
          <div>
            <h1 className="text-xl font-extrabold text-green-700 leading-tight">Sri Krishnaa Dairy Farms</h1>
            <p className="text-xs text-yellow-600 font-medium">Pure Fresh Cow Milk — Delivered to Your Doorstep</p>
          </div>
        </div>
        <div className="flex gap-3">
          <a href="/login" className="border-2 border-green-600 text-green-700 font-semibold px-4 py-2 rounded-full text-sm hover:bg-green-50 transition">Login</a>
          <a href="/signup" className="bg-green-600 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-green-700 transition">Sign Up</a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50 to-white px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy Farms" className="h-32 w-32 rounded-full mx-auto mb-6 shadow-lg border-4 border-yellow-400 object-cover" />
          <h2 className="text-4xl font-extrabold text-green-800 mb-4">Fresh Milk at Your Doorstep 🚪</h2>
          <p className="text-lg text-green-600 mb-2">Pure Fresh Cow Milk — No Preservatives, No Compromise</p>
          <p className="text-md text-gray-500 mb-8">Serving apartments in & around Kattigenahalli, Bangalore</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a href="/order" className="bg-green-600 text-white px-8 py-3 rounded-full text-lg font-bold hover:bg-green-700 transition shadow-lg">Order Now</a>
            <a href="/subscribe" className="bg-yellow-400 text-green-900 px-8 py-3 rounded-full text-lg font-bold hover:bg-yellow-300 transition shadow-lg">Subscribe Daily</a>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="px-6 py-14 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-2">Our Products</h3>
        <p className="text-center text-gray-400 text-sm mb-10">Fresh, pure & delivered to your door every morning</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Product 1 */}
          <div className="border-2 border-green-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition bg-white hover:border-green-300">
            <div className="bg-green-50 rounded-xl p-4 text-center mb-4">
              <div className="text-6xl">🥛</div>
            </div>
            <h4 className="text-xl font-bold text-green-800 text-center">A1 Cow Milk</h4>
            <p className="text-center text-yellow-600 font-semibold text-sm mt-1">500ml Bottle</p>
            <p className="text-gray-500 text-center text-sm mt-1">Fresh, pure & delivered daily</p>
            <p className="text-3xl font-extrabold text-center text-green-700 mt-4">₹30 <span className="text-sm font-normal text-gray-400">/ bottle</span></p>
            <a href="/order?product=500ml" className="block mt-5 bg-green-600 text-white text-center py-3 rounded-full font-semibold hover:bg-green-700 transition">Order Now</a>
            <a href="/subscribe?product=500ml" className="block mt-2 border-2 border-yellow-400 text-yellow-600 text-center py-2 rounded-full font-semibold hover:bg-yellow-50 transition text-sm">Subscribe Daily</a>
          </div>

          {/* Product 2 */}
          <div className="border-2 border-green-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition bg-white hover:border-green-300">
            <div className="bg-yellow-50 rounded-xl p-4 text-center mb-4">
              <div className="text-6xl">🥛</div>
            </div>
            <h4 className="text-xl font-bold text-green-800 text-center">A1 Cow Milk</h4>
            <p className="text-center text-yellow-600 font-semibold text-sm mt-1">1000ml Bottle</p>
            <p className="text-gray-500 text-center text-sm mt-1">Best value for families</p>
            <p className="text-3xl font-extrabold text-center text-green-700 mt-4">₹55 <span className="text-sm font-normal text-gray-400">/ bottle</span></p>
            <a href="/order?product=1000ml" className="block mt-5 bg-green-600 text-white text-center py-3 rounded-full font-semibold hover:bg-green-700 transition">Order Now</a>
            <a href="/subscribe?product=1000ml" className="block mt-2 border-2 border-yellow-400 text-yellow-600 text-center py-2 rounded-full font-semibold hover:bg-yellow-50 transition text-sm">Subscribe Daily</a>
          </div>

        </div>
      </section>

      {/* Why Us */}
      <section className="bg-green-50 px-6 py-14">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-2">Why Sri Krishnaa Dairy?</h3>
        <p className="text-center text-gray-400 text-sm mb-10">We deliver more than just milk</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-4xl mb-2">🌿</div>
            <p className="font-semibold text-green-800">100% Pure</p>
            <p className="text-xs text-gray-400 mt-1">No additives or preservatives</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-4xl mb-2">🚴</div>
            <p className="font-semibold text-green-800">Daily Delivery</p>
            <p className="text-xs text-gray-400 mt-1">Fresh every morning</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-4xl mb-2">📅</div>
            <p className="font-semibold text-green-800">Pause Anytime</p>
            <p className="text-xs text-gray-400 mt-1">Flexible subscriptions</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="text-4xl mb-2">💵</div>
            <p className="font-semibold text-green-800">Cash on Delivery</p>
            <p className="text-xs text-gray-400 mt-1">Pay when you receive</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-14 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-center text-green-800 mb-2">How It Works</h3>
        <p className="text-center text-gray-400 text-sm mb-10">Get started in 3 simple steps</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-6">
            <div className="bg-green-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-extrabold text-green-700">1</div>
            <h4 className="font-bold text-green-800 mb-2">Sign Up</h4>
            <p className="text-sm text-gray-500">Create your free account in under a minute</p>
          </div>
          <div className="p-6">
            <div className="bg-yellow-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-extrabold text-yellow-600">2</div>
            <h4 className="font-bold text-green-800 mb-2">Choose & Subscribe</h4>
            <p className="text-sm text-gray-500">Pick your quantity and delivery schedule</p>
          </div>
          <div className="p-6">
            <div className="bg-green-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-extrabold text-green-700">3</div>
            <h4 className="font-bold text-green-800 mb-2">Get Fresh Milk</h4>
            <p className="text-sm text-gray-500">We deliver fresh to your doorstep every morning</p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-green-600 px-6 py-12 text-center text-white">
        <h3 className="text-3xl font-extrabold mb-3">Start Your Daily Milk Subscription Today! 🥛</h3>
        <p className="text-green-100 mb-6">Join hundreds of happy families in Kattigenahalli</p>
        <a href="/subscribe" className="bg-yellow-400 text-green-900 px-10 py-3 rounded-full text-lg font-bold hover:bg-yellow-300 transition shadow-lg">Subscribe Now</a>
      </section>

      {/* Footer */}
      <footer className="bg-green-800 text-white px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/Logo.jpg" alt="Logo" className="h-12 w-12 rounded-full object-cover border-2 border-yellow-400" />
            <div>
              <p className="font-bold text-lg">Sri Krishnaa Dairy Farms</p>
              <p className="text-green-300 text-sm">Kattigenahalli, Bangalore</p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-green-200 text-sm">📞 <a href="tel:8553666002" className="hover:text-yellow-400 transition">8553666002</a></p>
            <p className="text-green-200 text-sm mt-1">🕐 Delivery: 5AM – 8AM daily</p>
          </div>
        </div>
        <div className="text-center mt-6 border-t border-green-700 pt-4">
          <p className="text-green-400 text-xs">© 2025 Sri Krishnaa Dairy Farms. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}