'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (error) {
      setMessage('❌ ' + error.message)
    } else {
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/Logo.jpg" alt="Sri Krishnaa Dairy" className="h-20 w-20 rounded-full mx-auto border-4 border-yellow-400 object-cover shadow" />
          <h2 className="text-2xl font-extrabold text-green-800 mt-3">Welcome Back! 👋</h2>
          <p className="text-sm text-gray-400 mt-1">Login to Sri Krishnaa Dairy Farms</p>
        </div>

        {message && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input name="email" type="email" placeholder="Email Address" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />
          <input name="password" type="password" placeholder="Password" required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400"
            onChange={handleChange} />

          <button type="submit" disabled={loading}
            className="bg-green-600 text-white py-3 rounded-full font-bold hover:bg-green-700 transition mt-2">
            {loading ? 'Logging in...' : 'Login 🥛'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          Don't have an account?{' '}
          <a href="/signup" className="text-green-600 font-semibold hover:underline">Sign Up</a>
        </p>

        <p className="text-center text-sm text-gray-400 mt-2">
          <a href="/forgot-password" className="text-yellow-600 font-semibold hover:underline">Forgot Password?</a>
        </p>

      </div>
    </div>
  )
}