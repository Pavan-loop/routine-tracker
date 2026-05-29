'use client'

import { useState, useEffect } from 'react'
import Auth from './Auth'
import Nav from './Nav'
import Dashboard from './views/Dashboard'
import Diet from './views/Diet'
import Tasks from './views/Tasks'
import BodyScan from './views/BodyScan'
import Analysis from './views/Analysis'
import Workout from './views/Workout'
import type { User } from '@/lib/types'

export type View = 'dashboard' | 'diet' | 'tasks' | 'body-scan' | 'analysis' | 'workout'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('dashboard')

  useEffect(() => {
    const token = localStorage.getItem('health_tracker_token')
    const stored = localStorage.getItem('health_tracker_user')
    if (token && stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem('health_tracker_token', token)
    localStorage.setItem('health_tracker_user', JSON.stringify(user))
    setUser(user)
  }

  const handleSignOut = () => {
    localStorage.removeItem('health_tracker_token')
    localStorage.removeItem('health_tracker_user')
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Auth onLogin={handleLogin} />

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <Nav view={view} setView={setView} onSignOut={handleSignOut} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-10">
          {view === 'dashboard' && <Dashboard user={user} setView={setView} />}
          {view === 'diet' && <Diet user={user} />}
          {view === 'tasks' && <Tasks user={user} />}
          {view === 'body-scan' && <BodyScan user={user} />}
          {view === 'analysis' && <Analysis user={user} />}
          {view === 'workout' && <Workout user={user} />}
        </div>
      </main>
    </div>
  )
}
