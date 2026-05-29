'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { User, DietItem, DietLog, BodyScan } from '@/lib/types'

type Props = { user: User }
type NutritionLoading = Record<string, boolean>

const ACTIVITY_MULTIPLIERS: Record<string, number> = { sedentary: 1.2, moderate: 1.55, active: 1.725 }
const GOAL_OFFSETS: Record<string, number> = { lose: -400, recomp: -300, maintain: 0, build: 250 }
const GOAL_LABELS: Record<string, string> = { lose: 'Lose Fat', recomp: 'Recomp', maintain: 'Maintain', build: 'Build Muscle' }
const GOAL_COLORS: Record<string, { bar: string; text: string }> = {
  lose: { bar: 'bg-sky-500', text: 'text-sky-400' },
  recomp: { bar: 'bg-orange-500', text: 'text-orange-400' },
  maintain: { bar: 'bg-amber-500', text: 'text-amber-400' },
  build: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
}

export default function Diet({ user: _user }: Props) {
  const [items, setItems] = useState<DietItem[]>([])
  const [logs, setLogs] = useState<DietLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [nutritionLoading, setNutritionLoading] = useState<NutritionLoading>({})
  const [latestScan, setLatestScan] = useState<BodyScan | null>(null)
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [parsedFoods, setParsedFoods] = useState<{ name: string; quantity: string | null; kcal: number; protein: number; carbs: number; fat: number }[] | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [copyingYesterday, setCopyingYesterday] = useState(false)

  const toISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const today = toISODate(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const isToday = selectedDate === today

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(toISODate(d))
    setEditMode(false)
  }

  const dateStr = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const loadData = useCallback(async () => {
    const [fetchedItems, fetchedLogs, scans] = await Promise.all([
      api.diet.getItems().catch(() => [] as DietItem[]),
      api.diet.getLogs(selectedDate).catch(() => [] as DietLog[]),
      api.bodyScans.getAll().catch(() => []),
    ])
    setItems(fetchedItems)
    setLogs(fetchedLogs)
    setLatestScan(scans[0] ?? null)
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { loadData() }, [loadData])

  const toggle = async (itemId: string) => {
    const existing = logs.find(l => l.diet_item_id === itemId)
    if (existing) {
      await api.diet.deleteLog(existing.id).catch(() => null)
      setLogs(prev => prev.filter(l => l.id !== existing.id))
    } else {
      const log = await api.diet.addLog({ diet_item_id: itemId, logged_date: selectedDate }).catch(() => null)
      if (log) setLogs(prev => [...prev, log])
    }
  }

  const updateItem = async (id: string, field: 'name' | 'quantity', value: string) => {
    const trimmed = value.trim()
    if (field === 'name' && !trimmed) return
    const update = { [field]: trimmed || null }
    await api.diet.updateItem(id, update).catch(() => null)
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...update } : item))
  }

  const recalcNutrition = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    setNutritionLoading(prev => ({ ...prev, [id]: true }))
    const data = await api.ai.nutrition(item.name, item.quantity).catch(() => null)
    if (data) {
      await api.diet.updateItem(id, data).catch(() => null)
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    }
    setNutritionLoading(prev => ({ ...prev, [id]: false }))
  }

  const addItem = async () => {
    const order_index = items.length
    const newItem = await api.diet.addItem({ name: 'New item', quantity: null, order_index }).catch(() => null)
    if (newItem) setItems(prev => [...prev, newItem])
  }

  const deleteItem = async (id: string) => {
    await api.diet.deleteItem(id).catch(() => null)
    setItems(prev => prev.filter(i => i.id !== id))
    setLogs(prev => prev.filter(l => l.diet_item_id !== id))
  }

  const parseWithAI = async () => {
    if (!aiInput.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const recentLogs = await api.diet.getLogsInRange(threeDaysAgo, yesterday).catch(() => [] as DietLog[])

      let historyContext: string | undefined
      if (recentLogs.length > 0) {
        const itemMap = new Map(items.map(i => [i.id, i]))
        const byDate: Record<string, string[]> = {}
        recentLogs.forEach(l => {
          const item = itemMap.get(l.diet_item_id)
          if (!item) return
          if (!byDate[l.logged_date]) byDate[l.logged_date] = []
          const detail = `${item.name}${item.quantity ? ` (${item.quantity})` : ''}${item.kcal ? ` — ${item.kcal}kcal, P:${item.protein}g` : ''}`
          byDate[l.logged_date].push(detail)
        })
        historyContext = Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, foods]) => `${date}:\n  • ${foods.join('\n  • ')}`)
          .join('\n')
      }

      const data = await api.ai.parseDiet(aiInput, historyContext)
      setParsedFoods(data.foods ?? [])
    } catch {}
    setAiLoading(false)
  }

  const confirmParsedFoods = async () => {
    if (!parsedFoods) return
    const order_start = items.length
    for (let i = 0; i < parsedFoods.length; i++) {
      const f = parsedFoods[i]
      const newItem = await api.diet.addItem({
        name: f.name,
        quantity: f.quantity ?? null,
        order_index: order_start + i,
        kcal: f.kcal,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      }).catch(() => null)
      if (newItem) {
        setItems(prev => [...prev, newItem])
        const log = await api.diet.addLog({ diet_item_id: newItem.id, logged_date: selectedDate }).catch(() => null)
        if (log) setLogs(prev => [...prev, log])
      }
    }
    setParsedFoods(null)
    setAiInput('')
  }

  const copyPrevDay = async () => {
    setCopyingYesterday(true)
    const prevDay = toISODate(new Date(new Date(selectedDate + 'T00:00:00').getTime() - 24 * 60 * 60 * 1000))
    const prevLogs = await api.diet.getLogs(prevDay).catch(() => [] as DietLog[])

    if (prevLogs.length === 0) {
      setCopyingYesterday(false)
      return
    }

    const alreadyLogged = new Set(logs.map(l => l.diet_item_id))
    const toAdd = prevLogs.filter(l => !alreadyLogged.has(l.diet_item_id))

    for (const l of toAdd) {
      const log = await api.diet.addLog({ diet_item_id: l.diet_item_id, logged_date: selectedDate }).catch(() => null)
      if (log) setLogs(prev => [...prev, log])
    }
    setCopyingYesterday(false)
  }

  if (loading) return <Spinner />

  const done = logs.length
  const total = items.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  const checkedItems = items.filter(i => logs.some(l => l.diet_item_id === i.id))
  const totalKcal = checkedItems.reduce((s, i) => s + (i.kcal ?? 0), 0)
  const totalProtein = checkedItems.reduce((s, i) => s + (i.protein ?? 0), 0)
  const totalCarbs = checkedItems.reduce((s, i) => s + (i.carbs ?? 0), 0)
  const totalFat = checkedItems.reduce((s, i) => s + (i.fat ?? 0), 0)
  const hasNutrition = items.some(i => i.kcal != null)

  const targets = (() => {
    if (!latestScan?.weight || !latestScan?.fat) return null
    const activityKey = localStorage.getItem('tracker_activity') ?? 'moderate'
    const goalKey = localStorage.getItem('tracker_goal') ?? 'maintain'
    const lbm = latestScan.weight * (1 - latestScan.fat / 100)
    const bmr = 370 + 21.6 * lbm
    const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityKey] ?? 1.55))
    const targetCalories = tdee + (GOAL_OFFSETS[goalKey] ?? 0)
    const targetProtein = Math.round(latestScan.weight * 2.2)
    const colors = GOAL_COLORS[goalKey] ?? GOAL_COLORS.maintain
    return { targetCalories, targetProtein, goalLabel: GOAL_LABELS[goalKey] ?? goalKey, colors }
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {editMode ? 'Edit Diet' : allDone ? 'Diet Complete!' : 'Diet'}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">{isToday ? dateStr : dateStr}</p>
        </div>
        <div className="flex gap-2">
          {!editMode && (
            <button
              onClick={copyPrevDay}
              disabled={copyingYesterday}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              {copyingYesterday ? (
                <span className="w-3.5 h-3.5 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {isToday ? 'Yesterday' : 'Prev Day'}
            </button>
          )}
          <button
            onClick={() => setEditMode(e => !e)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              editMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
        <button onClick={() => changeDate(-1)} className="text-zinc-400 hover:text-zinc-100 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-zinc-300">{isToday ? 'Today' : dateStr}</span>
        <button onClick={() => changeDate(1)} disabled={isToday} className="text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {!editMode && (
        <>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">{done}/{total} consumed</span>
              <span className="text-emerald-400 font-medium">{pct}%</span>
            </div>
            <div className="h-2 bg-emerald-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {hasNutrition && done > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <MacroCard label="Calories" value={totalKcal} unit="kcal" color="text-amber-400" />
              <MacroCard label="Protein" value={Math.round(totalProtein * 10) / 10} unit="g" color="text-sky-400" />
              <MacroCard label="Carbs" value={Math.round(totalCarbs * 10) / 10} unit="g" color="text-orange-400" />
              <MacroCard label="Fat" value={Math.round(totalFat * 10) / 10} unit="g" color="text-purple-400" />
            </div>
          )}

          {hasNutrition && targets && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-400">Today&apos;s goal</p>
                <span className={`text-xs font-medium ${targets.colors.text}`}>{targets.goalLabel}</span>
              </div>
              <GoalBar label="Calories" consumed={totalKcal} target={targets.targetCalories} unit="kcal" barColor={targets.colors.bar} textColor={targets.colors.text} />
              <GoalBar label="Protein" consumed={Math.round(totalProtein * 10) / 10} target={targets.targetProtein} unit="g" barColor="bg-sky-500" textColor="text-sky-400" />
            </div>
          )}
        </>
      )}

      <div className="space-y-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <span>{collapsed ? 'Show items' : 'Hide items'}</span>
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {!collapsed && items.map(item => {
          const checked = logs.some(l => l.diet_item_id === item.id)

          if (editMode) {
            const isCalcLoading = nutritionLoading[item.id]
            return (
              <div key={item.id} className="p-4 rounded-xl border border-zinc-700 bg-zinc-900 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      defaultValue={item.name}
                      onBlur={e => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Item name"
                      className="w-full bg-transparent text-sm font-medium text-zinc-100 focus:outline-none border-b border-transparent focus:border-emerald-500 pb-0.5 transition-colors placeholder:text-zinc-600"
                    />
                    <input
                      defaultValue={item.quantity ?? ''}
                      onBlur={e => updateItem(item.id, 'quantity', e.target.value)}
                      placeholder="Quantity (optional)"
                      className="w-full bg-transparent text-xs text-zinc-400 focus:outline-none border-b border-transparent focus:border-zinc-600 pb-0.5 transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => recalcNutrition(item.id)}
                      disabled={isCalcLoading}
                      title="Calculate nutrition with AI"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 disabled:opacity-40 transition-colors text-xs"
                    >
                      {isCalcLoading ? (
                        <span className="w-3.5 h-3.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      )}
                      AI
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {item.kcal != null && (
                  <div className="flex gap-3 pt-1 border-t border-zinc-800">
                    <NutriBadge label="kcal" value={item.kcal} color="text-amber-400" />
                    <NutriBadge label="protein" value={item.protein} unit="g" color="text-sky-400" />
                    <NutriBadge label="carbs" value={item.carbs} unit="g" color="text-orange-400" />
                    <NutriBadge label="fat" value={item.fat} unit="g" color="text-purple-400" />
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors text-left ${
                checked ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
              }`}>
                {checked && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${checked ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>{item.name}</p>
                {item.quantity && <p className="text-xs text-zinc-500 mt-0.5">{item.quantity}</p>}
                {item.kcal != null && (
                  <div className="flex gap-3 mt-1.5">
                    <NutriBadge label="kcal" value={item.kcal} color={checked ? 'text-zinc-500' : 'text-amber-400'} />
                    <NutriBadge label="P" value={item.protein} unit="g" color={checked ? 'text-zinc-500' : 'text-sky-400'} />
                    <NutriBadge label="C" value={item.carbs} unit="g" color={checked ? 'text-zinc-500' : 'text-orange-400'} />
                    <NutriBadge label="F" value={item.fat} unit="g" color={checked ? 'text-zinc-500' : 'text-purple-400'} />
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {editMode && (
        <button onClick={addItem} className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors">
          + Add item
        </button>
      )}

      {!editMode && isToday && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm font-medium text-zinc-200">Log food with AI</p>
          </div>
          <p className="text-xs text-zinc-500">Describe what you ate — AI will calculate the nutrition and log it for today</p>

          {parsedFoods ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400">AI found {parsedFoods.length} item{parsedFoods.length !== 1 ? 's' : ''} — review and confirm:</p>
              {parsedFoods.map((f, i) => (
                <div key={i} className="bg-zinc-800/60 rounded-lg px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-100">{f.name}</p>
                    {f.quantity && <p className="text-xs text-zinc-500 flex-shrink-0">{f.quantity}</p>}
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs text-amber-400"><span className="text-zinc-600">kcal </span>{f.kcal}</span>
                    <span className="text-xs text-sky-400"><span className="text-zinc-600">P </span>{f.protein}g</span>
                    <span className="text-xs text-orange-400"><span className="text-zinc-600">C </span>{f.carbs}g</span>
                    <span className="text-xs text-purple-400"><span className="text-zinc-600">F </span>{f.fat}g</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setParsedFoods(null); setAiInput('') }} className="flex-1 py-2 rounded-lg text-xs text-zinc-500 bg-zinc-800 hover:bg-zinc-700 transition-colors">Discard</button>
                <button onClick={confirmParsedFoods} className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-violet-500 hover:bg-violet-400 transition-colors">Log all →</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <textarea
                rows={2}
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); parseWithAI() } }}
                placeholder={"e.g. 200g mutton curry, 2 chapatis, 1 banana\n(Shift+Enter for new line)"}
                className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
              <button onClick={parseWithAI} disabled={!aiInput.trim() || aiLoading} className="px-4 py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white rounded-xl transition-colors flex-shrink-0">
                {aiLoading ? <span className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin block" /> : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GoalBar({ label, consumed, target, unit, barColor, textColor }: { label: string; consumed: number; target: number; unit: string; barColor: string; textColor: string }) {
  const pct = Math.min(Math.round((consumed / target) * 100), 100)
  const over = consumed > target
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className={over ? 'text-red-400' : textColor}>
          {consumed} <span className="text-zinc-600">/ {target}{unit}</span>
          {over && <span className="ml-1 text-red-400">+{consumed - target}{unit} over</span>}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-zinc-600 text-right">{pct}% of daily target</p>
    </div>
  )
}

function MacroCard({ label, value, unit, color }: { label: string; value: number; unit?: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
      <p className={`text-base font-bold ${color}`}>{value}{unit && <span className="text-xs font-normal ml-0.5">{unit}</span>}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

function NutriBadge({ label, value, unit, color }: { label: string; value: number | null | undefined; unit?: string; color: string }) {
  if (value == null) return null
  return (
    <span className={`text-xs ${color}`}>
      <span className="text-zinc-600">{label} </span>{Math.round(value * 10) / 10}{unit ?? ''}
    </span>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}
