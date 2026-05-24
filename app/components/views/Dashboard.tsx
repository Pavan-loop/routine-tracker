'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, BodyScan } from '@/lib/types'
import type { View } from '../App'

type DietMacros = { kcal: number; protein: number; carbs: number; fat: number }
type Props = { user: User; setView: (v: View) => void }

export default function Dashboard({ user, setView }: Props) {
  const [dietTotal, setDietTotal] = useState(0)
  const [dietDone, setDietDone] = useState(0)
  const [dietMacros, setDietMacros] = useState<DietMacros | null>(null)
  const [taskTotal, setTaskTotal] = useState(0)
  const [taskDone, setTaskDone] = useState(0)
  const [workoutCalories, setWorkoutCalories] = useState(0)
  const [workoutCount, setWorkoutCount] = useState(0)
  const [workoutNames, setWorkoutNames] = useState<string[]>([])
  const [latestScan, setLatestScan] = useState<BodyScan | null>(null)
  const [prevScan, setPrevScan] = useState<BodyScan | null>(null)
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const [{ data: items }, { data: logs }, { data: tasks }, { data: scans }, { data: workouts }] = await Promise.all([
        supabase.from('diet_items').select('id, kcal, protein, carbs, fat').eq('user_id', user.id),
        supabase.from('diet_logs').select('id, diet_item_id').eq('user_id', user.id).eq('logged_date', today),
        supabase.from('tasks').select('id, completed').eq('user_id', user.id).eq('scheduled_date', today),
        supabase.from('body_scans').select('*').eq('user_id', user.id).order('scan_date', { ascending: false }).limit(2),
        supabase.from('workouts').select('name, calories_burned').eq('user_id', user.id).eq('workout_date', today),
      ])

      setDietTotal(items?.length ?? 0)
      setDietDone(logs?.length ?? 0)
      setTaskTotal(tasks?.length ?? 0)
      setTaskDone(tasks?.filter(t => t.completed).length ?? 0)
      setLatestScan(scans?.[0] ?? null)
      setPrevScan(scans?.[1] ?? null)

      const loggedIds = new Set(logs?.map(l => l.diet_item_id) ?? [])
      const consumed = items?.filter(i => loggedIds.has(i.id)) ?? []
      if (consumed.some(i => i.kcal != null)) {
        setDietMacros({
          kcal: consumed.reduce((s, i) => s + (i.kcal ?? 0), 0),
          protein: Math.round(consumed.reduce((s, i) => s + ((i.protein as number) ?? 0), 0) * 10) / 10,
          carbs: Math.round(consumed.reduce((s, i) => s + ((i.carbs as number) ?? 0), 0) * 10) / 10,
          fat: Math.round(consumed.reduce((s, i) => s + ((i.fat as number) ?? 0), 0) * 10) / 10,
        })
      }

      setWorkoutCalories(workouts?.reduce((s, w) => s + ((w.calories_burned as number) ?? 0), 0) ?? 0)
      setWorkoutCount(workouts?.length ?? 0)
      setWorkoutNames(workouts?.map(w => w.name as string) ?? [])
      setLoading(false)
    }
    load()
  }, [user.id, today])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">{greeting()}</h1>
        <p className="text-sm text-zinc-400 mt-0.5">{dateStr}</p>
      </div>

      {/* Diet — full width with macros */}
      <DietCard
        done={dietDone}
        total={dietTotal}
        macros={dietMacros}
        onClick={() => setView('diet')}
      />

      {/* Workout + Tasks — 2 col */}
      <div className="grid grid-cols-2 gap-3">
        <WorkoutCard
          calories={workoutCalories}
          count={workoutCount}
          names={workoutNames}
          onClick={() => setView('workout')}
        />
        <SummaryCard
          title="Tasks"
          done={taskDone}
          total={taskTotal}
          color="indigo"
          emptyLabel="Add tasks"
          onClick={() => setView('tasks')}
        />
      </div>

      {latestScan ? (
        <button
          onClick={() => setView('body-scan')}
          className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
        >
          <p className="text-xs text-zinc-500 mb-3">
            Latest Scan — {new Date(latestScan.scan_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: 'Weight', value: latestScan.weight != null ? `${latestScan.weight}kg` : '—' },
              { label: 'BMI', value: latestScan.bmi?.toFixed(1) ?? '—' },
              { label: 'SMM', value: latestScan.smm != null ? `${latestScan.smm}kg` : '—' },
              { label: 'FAT', value: latestScan.fat != null ? `${latestScan.fat}%` : '—' },
              { label: 'WHR', value: latestScan.whr?.toFixed(2) ?? '—' },
            ].map(m => (
              <div key={m.label}>
                <p className="text-sm font-semibold text-zinc-100">{m.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </button>
      ) : (
        <button
          onClick={() => setView('body-scan')}
          className="w-full text-left bg-zinc-900 border border-dashed border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
        >
          <p className="text-sm text-zinc-400">No body scans yet</p>
          <p className="text-xs text-zinc-500 mt-0.5">Tap to log your first InBody scan result</p>
        </button>
      )}

      {latestScan && latestScan.weight != null && latestScan.fat != null && (
        <CaloriesCard scan={latestScan} prevScan={prevScan} />
      )}

      <button
        onClick={() => setView('analysis')}
        className="w-full flex items-center justify-between bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-800/30 rounded-xl p-4 hover:from-violet-900/60 hover:to-indigo-900/60 transition-colors"
      >
        <div className="text-left">
          <p className="text-sm font-medium text-zinc-100">AI Analysis</p>
          <p className="text-xs text-zinc-400 mt-0.5">Ask about your progress and trends</p>
        </div>
        <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

function DietCard({ done, total, macros, onClick }: {
  done: number; total: number; macros: DietMacros | null; onClick: () => void
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  return (
    <button onClick={onClick} className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-400">Diet Today</p>
        {total > 0 && (
          <span className={`text-xs font-semibold ${allDone ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {done}/{total} {allDone ? '— Complete!' : 'items'}
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="text-sm text-zinc-500">Set up your diet plan</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-emerald-500/15 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-bold text-emerald-400 w-9 text-right">{pct}%</span>
          </div>

          {macros && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800/70">
              {[
                { label: 'Calories', value: macros.kcal.toLocaleString(), unit: 'kcal', color: 'text-amber-400' },
                { label: 'Protein', value: macros.protein, unit: 'g', color: 'text-sky-400' },
                { label: 'Carbs', value: macros.carbs, unit: 'g', color: 'text-orange-400' },
                { label: 'Fat', value: macros.fat, unit: 'g', color: 'text-purple-400' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[10px] font-normal ml-0.5 text-zinc-600">{m.unit}</span></p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  )
}

function WorkoutCard({ calories, count, names, onClick }: {
  calories: number; count: number; names: string[]; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:border-zinc-700 transition-colors w-full">
      <p className="text-xs font-medium text-zinc-400 mb-2">Workout Today</p>
      {count === 0 ? (
        <div>
          <p className="text-sm font-medium text-zinc-600">Rest day</p>
          <p className="text-xs text-zinc-700 mt-1">Tap to log</p>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-rose-400">{calories > 0 ? calories.toLocaleString() : count}</p>
            <p className="text-xs text-zinc-500">{calories > 0 ? 'kcal' : `exercise${count !== 1 ? 's' : ''}`}</p>
          </div>
          <p className="text-xs text-zinc-500 mt-1">{count} exercise{count !== 1 ? 's' : ''}</p>
          {names.length > 0 && (
            <p className="text-[10px] text-zinc-700 mt-1.5 truncate">{names.slice(0, 3).join(' · ')}</p>
          )}
        </div>
      )}
    </button>
  )
}

function SummaryCard({
  title, done, total, color, emptyLabel, onClick,
}: {
  title: string; done: number; total: number
  color: 'emerald' | 'indigo'; emptyLabel: string; onClick: () => void
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const c = color === 'emerald'
    ? { bar: 'bg-emerald-500', track: 'bg-emerald-500/20', text: 'text-emerald-400' }
    : { bar: 'bg-indigo-500', track: 'bg-indigo-500/20', text: 'text-indigo-400' }

  return (
    <button
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left hover:border-zinc-700 transition-colors"
    >
      <p className="text-xs text-zinc-400 mb-2">{title}</p>
      {total === 0 ? (
        <p className="text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <>
          <p className={`text-2xl font-bold ${c.text}`}>{pct}%</p>
          <p className="text-xs text-zinc-500 mt-1">{done}/{total} done</p>
          <div className={`h-1.5 ${c.track} rounded-full mt-2.5`}>
            <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
    </button>
  )
}

const ACTIVITY_LEVELS = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little/no exercise', multiplier: 1.2 },
  { key: 'moderate', label: 'Moderate', desc: 'Exercise 3–5×/week', multiplier: 1.55 },
  { key: 'active', label: 'Active', desc: 'Hard exercise 6–7×/week', multiplier: 1.725 },
] as const

const GOALS = [
  {
    key: 'lose',
    label: 'Lose Fat',
    offset: -400,
    color: 'text-sky-400',
    activeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    techNote: (tdee: number) => `${tdee - 400} kcal/day — 400 kcal below maintenance`,
    simpleNote: 'Eat less than you burn. Your body digs into stored fat for the missing energy.',
  },
  {
    key: 'recomp',
    label: 'Recomp',
    offset: -300,
    color: 'text-orange-400',
    activeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    techNote: (tdee: number) => `${tdee - 300} kcal/day — 300 kcal deficit with high protein`,
    simpleNote: 'Lose fat AND build muscle at the same time. The scale barely moves but your body shape changes.',
  },
  {
    key: 'maintain',
    label: 'Maintain',
    offset: 0,
    color: 'text-amber-400',
    activeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    techNote: (tdee: number) => `${tdee} kcal/day — energy in = energy out`,
    simpleNote: 'Eat exactly what you burn. Your weight stays the same.',
  },
  {
    key: 'build',
    label: 'Build Muscle',
    offset: 250,
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    techNote: (tdee: number) => `${tdee + 250} kcal/day — 250 kcal surplus above maintenance`,
    simpleNote: 'Eat a little more than you burn. Extra fuel helps your muscles grow.',
  },
] as const

type ActivityKey = typeof ACTIVITY_LEVELS[number]['key']
type GoalKey = typeof GOALS[number]['key']

function CaloriesCard({ scan, prevScan }: { scan: BodyScan; prevScan: BodyScan | null }) {
  const [activity, setActivity] = useState<ActivityKey>(() =>
    (typeof window !== 'undefined' ? (localStorage.getItem('tracker_activity') as ActivityKey) : null) ?? 'moderate'
  )
  const [goal, setGoal] = useState<GoalKey>(() =>
    (typeof window !== 'undefined' ? (localStorage.getItem('tracker_goal') as GoalKey) : null) ?? 'lose'
  )

  const handleSetActivity = (a: ActivityKey) => { setActivity(a); localStorage.setItem('tracker_activity', a) }
  const handleSetGoal = (g: GoalKey) => { setGoal(g); localStorage.setItem('tracker_goal', g) }

  const lbm = scan.weight! * (1 - scan.fat! / 100)
  const fatMass = scan.weight! - lbm
  const bmr = Math.round(370 + 21.6 * lbm)
  const multiplier = ACTIVITY_LEVELS.find(a => a.key === activity)!.multiplier
  const tdee = Math.round(bmr * multiplier)
  const selectedGoal = GOALS.find(g => g.key === goal)!
  const targetCalories = tdee + selectedGoal.offset

  const scanDate = new Date(scan.scan_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  // Trend insight from previous scan (always latest vs second-latest, regardless of total scan count)
  let trendNote: string | null = null
  if (prevScan && prevScan.weight != null && prevScan.fat != null) {
    const weightDiff = scan.weight! - prevScan.weight
    const fatDiff = scan.fat! - prevScan.fat
    const smmDiff = (scan.smm != null && prevScan.smm != null) ? scan.smm - prevScan.smm : null

    const weightLost = weightDiff < -0.2
    const weightGained = weightDiff > 0.2
    const weightStable = !weightLost && !weightGained
    const fatLost = fatDiff < -0.2
    const fatGained = fatDiff > 0.2
    const muscleLost = smmDiff != null && smmDiff < -0.3
    const muscleGained = smmDiff != null && smmDiff > 0.2

    if (weightStable && fatLost && muscleGained) {
      // Best possible outcome — body recomposition
      trendNote = `Body recomposition — weight unchanged but fat is down and muscle is up. This is the best possible result. Keep doing exactly what you're doing.`
    } else if (weightStable && fatGained && muscleLost) {
      trendNote = `Weight looks the same but fat went up and muscle dropped. Your body composition is getting worse. Increase protein intake and add resistance training.`
    } else if (weightStable) {
      trendNote = `Weight is stable since last scan. No significant fat or muscle changes detected.`
    } else if (weightLost && fatLost && muscleLost) {
      trendNote = `Lost ${Math.abs(weightDiff).toFixed(1)}kg since last scan — fat is down but muscle dropped slightly too. Eat more protein to protect muscle while cutting.`
    } else if (weightLost && fatLost && !muscleLost) {
      trendNote = `Lost ${Math.abs(weightDiff).toFixed(1)}kg since last scan — fat is down, muscle is maintained. Good fat loss. Keep it up.`
    } else if (weightLost && fatGained) {
      // Losing weight but fat% rising = losing muscle rapidly
      trendNote = `Lost ${Math.abs(weightDiff).toFixed(1)}kg but fat % went up — you're losing muscle, not fat. Increase protein significantly and add strength training.`
    } else if (weightGained && fatLost) {
      // Weight up but fat% down = gaining muscle (recomp/lean bulk)
      trendNote = `Gained ${weightDiff.toFixed(1)}kg but fat % is down — you're adding muscle. Good lean bulk or recomposition progress.`
    } else if (weightGained && fatGained && muscleLost) {
      trendNote = `Gained ${weightDiff.toFixed(1)}kg — fat increased and muscle dropped. Consider reducing calories and adding resistance training.`
    } else if (weightGained && fatGained && muscleGained) {
      trendNote = `Gained ${weightDiff.toFixed(1)}kg — both muscle and fat went up. Normal for a bulk phase. Watch the fat % and consider a cut soon if it keeps rising.`
    } else if (weightGained && fatGained) {
      trendNote = `Gained ${weightDiff.toFixed(1)}kg — mostly fat gain. You're likely eating above maintenance. Try reducing by 300–400 kcal/day.`
    } else if (weightGained && muscleGained) {
      trendNote = `Gained ${weightDiff.toFixed(1)}kg — muscle is up, fat is stable. Clean lean bulk is working well.`
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-100">Daily Calories</p>
        <p className="text-xs text-zinc-600">{scanDate} scan</p>
      </div>

      {/* Maintenance */}
      <div>
        <p className="text-xs text-zinc-500 mb-1">
          Maintenance — <span className="text-zinc-400">what you burn if weight stays the same</span>
        </p>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-bold text-amber-400">{tdee.toLocaleString()}</p>
          <p className="text-sm text-zinc-400 mb-1">kcal / day</p>
        </div>
      </div>

      {/* Activity selector */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Your activity level</p>
        <div className="flex gap-1.5">
          {ACTIVITY_LEVELS.map(level => (
            <button
              key={level.key}
              onClick={() => handleSetActivity(level.key)}
              className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-medium transition-colors border ${
                activity === level.key
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-zinc-800 border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800" />

      {/* Goal selector */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">What&apos;s your goal?</p>
        <div className="grid grid-cols-2 gap-1.5">
          {GOALS.map(g => (
            <button
              key={g.key}
              onClick={() => handleSetGoal(g.key)}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors border ${
                goal === g.key
                  ? g.activeBg
                  : 'bg-zinc-800 border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target */}
      <div className="bg-zinc-800/60 rounded-xl p-3 space-y-1.5">
        <div className="flex items-end gap-2">
          <p className={`text-2xl font-bold ${selectedGoal.color}`}>{targetCalories.toLocaleString()}</p>
          <p className="text-sm text-zinc-400 mb-0.5">kcal / day</p>
        </div>
        <p className="text-xs text-zinc-400">{selectedGoal.techNote(tdee)}</p>
        <p className="text-xs text-zinc-500">{selectedGoal.simpleNote}</p>
      </div>

      {/* Recomp-specific panel */}
      {goal === 'recomp' && (
        <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-3 space-y-3">
          {/* Suitability */}
          <div className="flex gap-2">
            <span className="text-base leading-none mt-0.5">
              {scan.fat! >= 20 ? '🟢' : scan.fat! >= 15 ? '🟡' : '🔴'}
            </span>
            <div>
              <p className="text-xs font-medium text-orange-300">
                {scan.fat! >= 20
                  ? 'Great candidate for recomp'
                  : scan.fat! >= 15
                  ? 'Good candidate for recomp'
                  : 'Harder at low body fat'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {scan.fat! >= 20
                  ? `Higher fat % (${scan.fat}%) means your body has plenty of stored energy to fuel muscle growth.`
                  : scan.fat! >= 15
                  ? `At ${scan.fat}% body fat you'll see solid recomp results with consistent training and high protein.`
                  : `At ${scan.fat}% body fat, traditional cut/bulk cycles may produce faster results than recomp.`}
              </p>
            </div>
          </div>

          {/* Protein targets */}
          <div>
            <p className="text-xs text-orange-400 font-medium mb-2">Daily protein target</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-zinc-100">{Math.round(scan.weight! * 1.6)}g</p>
                <p className="text-[10px] text-zinc-400">Minimum</p>
                <p className="text-[10px] text-zinc-600">1.6g × {scan.weight}kg</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-orange-400">{Math.round(scan.weight! * 2.2)}g</p>
                <p className="text-[10px] text-zinc-400">Optimal</p>
                <p className="text-[10px] text-zinc-600">2.2g × {scan.weight}kg</p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <p className="text-xs text-orange-400 font-medium mb-1.5">Non-negotiable requirements</p>
            <div className="space-y-1">
              {[
                { icon: '🏋️', text: 'Resistance training 3–5×/week (progressive overload)' },
                { icon: '😴', text: '7–9 hours of sleep — HGH released during sleep builds muscle' },
                { icon: '📅', text: 'Results visible in 8–12 weeks — the scale barely moves, track body fat % instead' },
              ].map(r => (
                <div key={r.text} className="flex gap-2">
                  <span className="text-xs leading-5">{r.icon}</span>
                  <p className="text-xs text-zinc-400">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fat Loss panel */}
      {goal === 'lose' && (
        <div className="bg-sky-500/5 border border-sky-500/15 rounded-xl p-3 space-y-3">
          {/* Suitability */}
          <div className="flex gap-2">
            <span className="text-base leading-none mt-0.5">
              {scan.fat! >= 25 ? '🟢' : scan.fat! >= 15 ? '🟡' : '🔴'}
            </span>
            <div>
              <p className="text-xs font-medium text-sky-300">
                {scan.fat! >= 25
                  ? 'Great candidate for fat loss'
                  : scan.fat! >= 15
                  ? 'Good candidate — protect your muscle'
                  : 'Already lean — be careful'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {scan.fat! >= 25
                  ? `At ${scan.fat}% body fat you have plenty to lose. You can handle a 400–500 kcal deficit safely.`
                  : scan.fat! >= 15
                  ? `At ${scan.fat}% body fat, use the higher end protein (2.2g/kg) — your body will try to burn muscle too.`
                  : `At ${scan.fat}% you're already lean. Keep the deficit small (300 kcal max) and protein very high or you'll lose muscle.`}
              </p>
            </div>
          </div>

          {/* Protein targets */}
          <div>
            <p className="text-xs text-sky-400 font-medium mb-2">Daily protein target</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-zinc-100">{Math.round(scan.weight! * 1.6)}g</p>
                <p className="text-[10px] text-zinc-400">Minimum</p>
                <p className="text-[10px] text-zinc-600">1.6g × {scan.weight}kg</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-sky-400">{Math.round(scan.weight! * 2.2)}g</p>
                <p className="text-[10px] text-zinc-400">Optimal</p>
                <p className="text-[10px] text-zinc-600">2.2g × {scan.weight}kg</p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <p className="text-xs text-sky-400 font-medium mb-1.5">Key requirements</p>
            <div className="space-y-1">
              {[
                { icon: '🏋️', text: 'Resistance training 3–4×/week — without this, you lose muscle AND fat' },
                { icon: '🥩', text: 'Spread protein across 4–5 meals, 20–40g each sitting' },
                { icon: '⚠️', text: 'Keep deficit at 300–500 kcal — bigger deficits burn muscle, not just fat' },
              ].map(r => (
                <div key={r.text} className="flex gap-2">
                  <span className="text-xs leading-5">{r.icon}</span>
                  <p className="text-xs text-zinc-400">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Build Muscle panel */}
      {goal === 'build' && (
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 space-y-3">
          {/* Suitability */}
          <div className="flex gap-2">
            <span className="text-base leading-none mt-0.5">
              {scan.fat! < 15 ? '🟢' : scan.fat! <= 20 ? '🟡' : '🔴'}
            </span>
            <div>
              <p className="text-xs font-medium text-emerald-300">
                {scan.fat! < 15
                  ? 'Ideal starting point for a bulk'
                  : scan.fat! <= 20
                  ? 'Good — keep the surplus clean'
                  : 'Consider recomp first'}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {scan.fat! < 15
                  ? `At ${scan.fat}% body fat you can bulk longer before needing to cut. Great position to be in.`
                  : scan.fat! <= 20
                  ? `At ${scan.fat}% body fat, stick to a clean surplus (300–400 kcal). Going higher will mostly add fat.`
                  : `At ${scan.fat}% you'll gain a lot of fat in a surplus. Consider recomp or a cut first to get below 18%.`}
              </p>
            </div>
          </div>

          {/* Protein targets */}
          <div>
            <p className="text-xs text-emerald-400 font-medium mb-2">Daily protein target</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-zinc-100">{Math.round(scan.weight! * 1.6)}g</p>
                <p className="text-[10px] text-zinc-400">Minimum</p>
                <p className="text-[10px] text-zinc-600">1.6g × {scan.weight}kg</p>
              </div>
              <div className="bg-zinc-900/60 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-emerald-400">{Math.round(scan.weight! * 2.2)}g</p>
                <p className="text-[10px] text-zinc-400">Optimal</p>
                <p className="text-[10px] text-zinc-600">2.2g × {scan.weight}kg</p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1.5 text-center">Above 2.2g/kg shows no additional benefit — research-proven ceiling</p>
          </div>

          {/* Requirements */}
          <div>
            <p className="text-xs text-emerald-400 font-medium mb-1.5">Key requirements</p>
            <div className="space-y-1">
              {[
                { icon: '🏋️', text: 'Progressive overload 3–4×/week — consistently lift heavier over time' },
                { icon: '😴', text: '7–9 hours sleep — muscle is built during sleep, not in the gym' },
                { icon: '📊', text: 'Aim for 0.25–0.5kg gain/week — faster than that is mostly fat' },
              ].map(r => (
                <div key={r.text} className="flex gap-2">
                  <span className="text-xs leading-5">{r.icon}</span>
                  <p className="text-xs text-zinc-400">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trend insight */}
      {trendNote && (
        <div className="flex gap-2 bg-zinc-800/40 rounded-xl p-3">
          <span className="text-base leading-none mt-0.5">📊</span>
          <p className="text-xs text-zinc-400">{trendNote}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500">BMR</p>
          <p className="text-sm font-medium text-zinc-300">{bmr.toLocaleString()} kcal</p>
          <p className="text-[10px] text-zinc-600">at complete rest</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Lean Mass</p>
          <p className="text-sm font-medium text-zinc-300">{lbm.toFixed(1)} kg</p>
          <p className="text-[10px] text-zinc-600">muscle + bones + water</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Fat Mass</p>
          <p className="text-sm font-medium text-zinc-300">{fatMass.toFixed(1)} kg</p>
          <p className="text-[10px] text-zinc-600">stored body fat</p>
        </div>
      </div>

      <p className="text-[10px] text-zinc-700 text-center">Katch-McArdle formula · based on body fat %</p>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}
