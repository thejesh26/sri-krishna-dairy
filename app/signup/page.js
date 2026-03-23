'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', password: '',
    address: '', apartment_name: '', flat_number: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setMessage('❌ ' + error.message)
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: form.full_name,
      phone: form.phone,
      address: form.address,
      apartment_name: form.apartment_name,
      flat_number: form.flat_number,
    })

    if (profileError) {
      setMessage('❌ ' + profileError.message)
    } else {
      setMessage('✅ Account created! Please check your email to confirm.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-20 w-20 rounded-full mx-auto border-4 border-yellow-400 object-cover shadow" />
          <h2 className="text-2xl font-extrabold text-green-800 mt-3">Create Account</h2>
          <p className="text-sm text-gray-400 mt-1">Join Sri Krishnaa Dairy Farms</p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input name="full_name" placeholder="Full Name" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="phone" placeholder="Phone Number" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="email" type="email" placeholder="Email Address" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="apartment_name" placeholder="Apartment Name" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="flat_number" placeholder="Flat Number" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="address" placeholder="Full Address" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />

          <button type="submit" disabled={loading}
            className="bg-green-600 text-white py-3 rounded-full font-bold hover:bg-green-700 transition mt-2">
            {loading ? 'Creating Account...' : 'Create Account 🥛'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-green-600 font-semibold hover:underline">Login</a>
        </p>
      </div>
    </div>
  )
}