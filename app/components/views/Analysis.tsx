'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { api, BASE_URL, getAuthHeaders } from '@/lib/api'
import type { User } from '@/lib/types'

type Message = { role: 'user' | 'assistant'; content: string }
type Props = { user: User }

const SUGGESTIONS = [
  'Am I hitting my calorie and protein targets this week?',
  'Analyse my workout volume and suggest improvements',
  'How is my body composition trending from my scans?',
  'Give me a full weekly summary and top 3 things to fix',
]

export default function Analysis({ user: _user }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextLoading, setContextLoading] = useState(true)
  const [context, setContext] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { buildContext() }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function buildContext() {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [dietItems, dietLogs, tasks, scans, workouts] = await Promise.all([
      api.diet.getItems().catch(() => []),
      api.diet.getLogsInRange(sevenDaysAgo, today).catch(() => []),
      api.tasks.getInRange(sevenDaysAgo, today).catch(() => []),
      api.bodyScans.getAll().catch(() => []),
      api.workouts.getInRange(sevenDaysAgo, today).catch(() => []),
    ])

    const latestScans = scans.slice(0, 3)

    const activityKey = localStorage.getItem('tracker_activity') ?? 'moderate'
    const goalKey = localStorage.getItem('tracker_goal') ?? 'maintain'
    const activityLabels: Record<string, string> = { sedentary: 'Sedentary', moderate: 'Moderate (3–5×/week)', active: 'Active (6–7×/week)' }
    const goalLabels: Record<string, string> = { lose: 'Lose Fat', recomp: 'Body Recomposition', maintain: 'Maintain Weight', build: 'Build Muscle' }
    const goalOffsets: Record<string, number> = { lose: -400, recomp: -300, maintain: 0, build: 250 }
    const multipliers: Record<string, number> = { sedentary: 1.2, moderate: 1.55, active: 1.725 }

    const latestScan = latestScans[0]
    let targetsSection = 'No body scan data — targets unavailable'
    if (latestScan?.weight && latestScan?.fat) {
      const lbm = latestScan.weight * (1 - latestScan.fat / 100)
      const bmr = Math.round(370 + 21.6 * lbm)
      const tdee = Math.round(bmr * (multipliers[activityKey] ?? 1.55))
      const targetCal = tdee + (goalOffsets[goalKey] ?? 0)
      const minProtein = Math.round(latestScan.weight * 1.6)
      const optProtein = Math.round(latestScan.weight * 2.2)
      targetsSection =
        `Goal: ${goalLabels[goalKey] ?? goalKey}
Activity: ${activityLabels[activityKey] ?? activityKey}
BMR: ${bmr} kcal/day | TDEE (maintenance): ${tdee} kcal/day
Target calories: ${targetCal} kcal/day (${(goalOffsets[goalKey] ?? 0) > 0 ? '+' : ''}${goalOffsets[goalKey] ?? 0} from TDEE)
Target protein: ${minProtein}–${optProtein}g/day (1.6–2.2g × ${latestScan.weight}kg bodyweight)`
    }

    const dietPlan = dietItems.map(i => {
      const parts = [`${i.name}${i.quantity ? ` (${i.quantity})` : ''}`]
      if (i.kcal) parts.push(`${i.kcal}kcal`)
      if (i.protein) parts.push(`P:${i.protein}g`)
      return parts.join(' — ')
    }).join('\n  ') || 'Not set up'

    const itemMap = new Map(dietItems.map(i => [i.id, i]))
    const logsByDate: Record<string, { count: number; kcal: number; protein: number; carbs: number; fat: number }> = {}
    dietLogs.forEach(l => {
      if (!logsByDate[l.logged_date]) logsByDate[l.logged_date] = { count: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 }
      logsByDate[l.logged_date].count++
      const item = itemMap.get(l.diet_item_id)
      if (item) {
        logsByDate[l.logged_date].kcal += item.kcal ?? 0
        logsByDate[l.logged_date].protein += item.protein ?? 0
        logsByDate[l.logged_date].carbs += item.carbs ?? 0
        logsByDate[l.logged_date].fat += item.fat ?? 0
      }
    })
    const totalItems = dietItems.length
    const dietLog = Object.entries(logsByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => {
        const macros = d.kcal > 0 ? ` → ${d.kcal}kcal | P:${d.protein.toFixed(1)}g C:${d.carbs.toFixed(1)}g F:${d.fat.toFixed(1)}g` : ''
        return `${date}: ${d.count}/${totalItems} items${macros}`
      }).join('\n') || 'No diet logs this week'

    const workoutsByDate: Record<string, { exercises: string[]; totalCal: number }> = {}
    workouts.forEach(w => {
      if (!workoutsByDate[w.workout_date]) workoutsByDate[w.workout_date] = { exercises: [], totalCal: 0 }
      let detail = w.name
      if (w.type === 'strength' && w.sets && w.reps) {
        detail += ` — ${w.sets}×${w.reps} reps${w.weight_kg ? ` @ ${w.weight_kg}kg` : ''}`
      } else if (w.duration_min) {
        detail += ` — ${w.duration_min} min`
      }
      if (w.calories_burned) detail += ` (~${w.calories_burned} kcal)`
      workoutsByDate[w.workout_date].exercises.push(detail)
      workoutsByDate[w.workout_date].totalCal += w.calories_burned ?? 0
    })
    const workoutLog = Object.entries(workoutsByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, d]) => {
        const calStr = d.totalCal > 0 ? ` | ${d.totalCal} kcal burned` : ''
        return `${date}${calStr}\n  • ${d.exercises.join('\n  • ')}`
      }).join('\n') || 'No workouts this week'

    const completedTasks = tasks.filter(t => t.completed).length
    const totalTasks = tasks.length
    const taskRate = totalTasks > 0
      ? `${completedTasks}/${totalTasks} tasks completed (${Math.round(completedTasks / totalTasks * 100)}%)`
      : 'No tasks this week'

    const scanHistory = latestScans.map(s =>
      `${s.scan_date}: Weight ${s.weight ?? '?'}kg | BMI ${s.bmi ?? '?'} | Muscle (SMM) ${s.smm ?? '?'}kg | Fat ${s.fat ?? '?'}% | WHR ${s.whr ?? '?'}`
    ).join('\n') || 'No body scan data'

    setContext(
`=== TODAY ===
Date: ${today}

=== GOAL & TARGETS ===
${targetsSection}

=== BODY SCAN HISTORY (latest 3) ===
${scanHistory}

=== DIET PLAN (full list with nutrition) ===
  ${dietPlan}

=== DIET LOG (last 7 days) ===
${dietLog}

=== WORKOUT LOG (last 7 days) ===
${workoutLog}

=== TASK COMPLETION (last 7 days) ===
${taskRate}`
    )

    setContextLoading(false)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading || contextLoading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch(`${BASE_URL}/ai/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ messages: updated, context }),
      })

      if (!res.ok) throw new Error('API error')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: full }])
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Could not reach the AI service. Make sure your Python backend is running.' },
      ])
    }

    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">AI Analysis</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Powered by your health data</p>
      </div>

      <div className="min-h-64 max-h-[55vh] overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !contextLoading && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-zinc-500 text-center mb-3">Suggested questions</p>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => setInput(s)} className="w-full text-left px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        {contextLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
            }`}>
              {msg.role === 'user' ? (
                msg.content
              ) : msg.content ? (
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <p className="font-bold text-zinc-100 text-base mb-2">{children}</p>,
                    h2: ({ children }) => <p className="font-bold text-zinc-100 text-base mb-2">{children}</p>,
                    h3: ({ children }) => <p className="font-semibold text-zinc-200 mb-1.5 mt-3 first:mt-0">{children}</p>,
                    p: ({ children }) => <p className="mb-2 last:mb-0 text-zinc-100">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    em: ({ children }) => <em className="text-zinc-300">{children}</em>,
                    ul: ({ children }) => <ul className="mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 space-y-1 list-decimal list-inside">{children}</ol>,
                    li: ({ children }) => (
                      <li className="flex gap-2 text-zinc-100">
                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    hr: () => <hr className="border-zinc-600 my-2" />,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 items-end pt-2 border-t border-zinc-800">
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage(e as unknown as React.FormEvent)
            }
          }}
          placeholder={contextLoading ? 'Loading your data...' : 'Ask about your health... (Shift+Enter for new line)'}
          disabled={contextLoading || loading}
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-50 resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || contextLoading}
          className="px-4 py-3 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  )
}
