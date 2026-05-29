'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { User, WorkoutEntry } from '@/lib/types'

type Props = { user: User }
type ParsedExercise = Partial<WorkoutEntry>
type FormState = { name: string; sets: string; reps: string; weight_kg: string; duration_min: string; calories_burned: string }

export default function Workout({ user: _user }: Props) {
  const [entries, setEntries] = useState<WorkoutEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<'strength' | 'cardio'>('strength')
  const [form, setForm] = useState<FormState>({ name: '', sets: '', reps: '', weight_kg: '', duration_min: '', calories_burned: '' })
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedExercise[] | null>(null)
  const [bodyWeight, setBodyWeight] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const toLocalDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const today = toLocalDate(new Date())
  const isToday = date === today

  const loadData = useCallback(async () => {
    setLoading(true)
    const [workouts, scans] = await Promise.all([
      api.workouts.getByDate(date).catch(() => [] as WorkoutEntry[]),
      api.bodyScans.getAll().catch(() => []),
    ])
    setEntries(workouts)
    setBodyWeight(scans[0]?.weight ?? null)
    setLoading(false)
  }, [date])

  useEffect(() => { loadData() }, [loadData])

  const changeDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDate(toLocalDate(d))
  }

  const addEntry = async (entryData: Omit<WorkoutEntry, 'id' | 'user_id' | 'created_at'>) => {
    const entry = await api.workouts.add(entryData as Record<string, unknown>).catch(() => null)
    if (entry) setEntries(prev => [...prev, entry])
  }

  const deleteEntry = async (id: string) => {
    await api.workouts.delete(id).catch(() => null)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await addEntry({
      workout_date: date,
      name: form.name.trim(),
      type: addType,
      sets: form.sets ? parseInt(form.sets) : null,
      reps: form.reps ? parseInt(form.reps) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      duration_min: form.duration_min ? parseInt(form.duration_min) : null,
      calories_burned: form.calories_burned ? parseInt(form.calories_burned) : null,
      notes: null,
    })
    setForm({ name: '', sets: '', reps: '', weight_kg: '', duration_min: '', calories_burned: '' })
    setShowAdd(false)
  }

  const parseWithAI = async () => {
    if (!aiInput.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const data = await api.ai.parseWorkout(aiInput, bodyWeight)
      setParsed(data.exercises ?? [])
    } catch {}
    setAiLoading(false)
  }

  const confirmParsed = async () => {
    if (!parsed) return
    for (const ex of parsed) {
      await addEntry({
        workout_date: date,
        name: ex.name ?? 'Exercise',
        type: ex.type ?? 'other',
        sets: ex.sets ?? null,
        reps: ex.reps ?? null,
        weight_kg: ex.weight_kg ?? null,
        duration_min: ex.duration_min ?? null,
        calories_burned: ex.calories_burned ?? null,
        notes: null,
      })
    }
    setParsed(null)
    setAiInput('')
  }

  const totalCalories = entries.reduce((s, e) => s + (e.calories_burned ?? 0), 0)
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Workout</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{dateStr}</p>
      </div>

      {totalCalories > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500">Burned today</p>
            <p className="text-xs text-zinc-600 mt-0.5">from exercises logged</p>
          </div>
          <p className="text-3xl font-bold text-rose-400">{totalCalories.toLocaleString()} <span className="text-sm font-normal text-zinc-500">kcal</span></p>
        </div>
      )}

      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
        <button onClick={() => changeDate(-1)} className="text-zinc-400 hover:text-zinc-100 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm text-zinc-300 font-medium">{isToday ? 'Today' : dateStr}</span>
        <button onClick={() => changeDate(1)} disabled={isToday} className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-between py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span>{collapsed ? `Show ${entries.length} exercise${entries.length !== 1 ? 's' : ''}` : 'Hide exercises'}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {!collapsed && entries.map(entry => (
            <ExerciseCard key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))}
        </div>
      )}

      {entries.length === 0 && !showAdd && (
        <div className="text-center py-6">
          <p className="text-zinc-600 text-sm">No exercises logged</p>
          <p className="text-zinc-700 text-xs mt-1">Add manually or tell AI what you did</p>
        </div>
      )}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
        >
          + Add exercise manually
        </button>
      ) : (
        <form onSubmit={submitManual} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-200">Add Exercise</p>
            <button type="button" onClick={() => setShowAdd(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-1.5">
            {(['strength', 'cardio'] as const).map(t => (
              <button key={t} type="button" onClick={() => setAddType(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  addType === t
                    ? t === 'strength'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                    : 'bg-zinc-800 border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <input
            required
            placeholder="Exercise name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />

          {addType === 'strength' ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'sets' as const, placeholder: 'Sets' },
                { key: 'reps' as const, placeholder: 'Reps' },
                { key: 'weight_kg' as const, placeholder: 'kg', step: '0.5' },
              ].map(f => (
                <input key={f.key} placeholder={f.placeholder} type="number" min="0" step={f.step}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              ))}
            </div>
          ) : (
            <input placeholder="Duration (min)" type="number" min="1"
              value={form.duration_min} onChange={e => setForm(p => ({ ...p, duration_min: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          )}

          <input placeholder="Calories burned (optional)" type="number" min="0"
            value={form.calories_burned} onChange={e => setForm(p => ({ ...p, calories_burned: e.target.value }))}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
          />

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowAdd(false)}
              className="flex-1 py-2 rounded-lg text-sm text-zinc-500 bg-zinc-800 hover:bg-zinc-700 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-400 transition-colors">
              Add
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <p className="text-sm font-medium text-zinc-200">Tell AI your workout</p>
        </div>
        <p className="text-xs text-zinc-500">
          Describe what you did — AI will parse every exercise and calculate calories burned based on your body weight
          {bodyWeight ? ` (${bodyWeight}kg)` : ''}.
        </p>

        {parsed ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">
              AI found {parsed.length} exercise{parsed.length !== 1 ? 's' : ''} — review and confirm:
            </p>
            {parsed.map((ex, i) => (
              <div key={i} className="bg-zinc-800/60 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-100 truncate">{ex.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {ex.type === 'strength' && ex.sets && ex.reps
                      ? `${ex.sets} × ${ex.reps} reps${ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}`
                      : ex.duration_min
                      ? `${ex.duration_min} min`
                      : ex.type}
                  </p>
                </div>
                {ex.calories_burned ? (
                  <span className="text-sm font-semibold text-rose-400 flex-shrink-0">
                    {ex.calories_burned}<span className="text-xs font-normal text-zinc-600 ml-0.5">kcal</span>
                  </span>
                ) : null}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setParsed(null); setAiInput('') }}
                className="flex-1 py-2 rounded-lg text-xs text-zinc-500 bg-zinc-800 hover:bg-zinc-700 transition-colors">
                Discard
              </button>
              <button onClick={confirmParsed}
                className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-violet-500 hover:bg-violet-400 transition-colors">
                Log all →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              rows={2}
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  parseWithAI()
                }
              }}
              placeholder={"e.g. 4 sets bench press 60kg 10 reps, 20 min treadmill\n(Shift+Enter for new line)"}
              className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
            <button
              onClick={parseWithAI}
              disabled={!aiInput.trim() || aiLoading}
              className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0"
            >
              {aiLoading ? (
                <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin block" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ExerciseCard({ entry, onDelete }: { entry: WorkoutEntry; onDelete: (id: string) => void }) {
  const isCardio = entry.type === 'cardio'
  const detail = entry.type === 'strength' && entry.sets && entry.reps
    ? `${entry.sets} sets × ${entry.reps} reps${entry.weight_kg ? ` @ ${entry.weight_kg}kg` : ''}`
    : entry.duration_min
    ? `${entry.duration_min} min`
    : entry.type

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
      isCardio
        ? 'bg-sky-500/5 border-sky-500/15'
        : entry.type === 'strength'
        ? 'bg-emerald-500/5 border-emerald-500/15'
        : 'bg-zinc-900 border-zinc-800'
    }`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
        isCardio ? 'bg-sky-500/10' : 'bg-emerald-500/10'
      }`}>
        {isCardio ? (
          <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4v6a6 6 0 0012 0V4M4 20h16" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-100">{entry.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {entry.calories_burned != null && (
          <div className="text-right">
            <p className="text-sm font-semibold text-rose-400">{entry.calories_burned}</p>
            <p className="text-[10px] text-zinc-600">kcal</p>
          </div>
        )}
        <button onClick={() => onDelete(entry.id)} className="text-zinc-700 hover:text-red-400 transition-colors p-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-rose-500 rounded-full animate-spin" />
    </div>
  )
}
