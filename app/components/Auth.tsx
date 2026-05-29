'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

type Props = { onLogin: (user: User, token: string) => void }

export default function Auth({ onLogin }: Props) {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const switchTab = (t: 'login' | 'signup') => {
    setTab(t)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const data = tab === 'login'
        ? await api.auth.login(email, password)
        : await api.auth.signup(email, password)
      onLogin(data.user, data.access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Health Tracker</h1>
          <p className="text-sm text-zinc-400 mt-1">Track your diet, workouts, and body metrics.</p>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-5">
          {(['login', 'signup'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {tab === 'signup' && (
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading
              ? (tab === 'login' ? 'Signing in...' : 'Creating account...')
              : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  )
}
