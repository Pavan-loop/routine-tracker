'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ────────────────────────────────────────────────────────────────
   Scroll-reveal hook
   ──────────────────────────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

/* Animated wrapper — fades + translates in on scroll */
function Reveal({
  children,
  delay = 0,
  from = 'bottom',
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  from?: 'bottom' | 'left' | 'right' | 'scale'
  className?: string
}) {
  const [ref, inView] = useInView()
  const initial =
    from === 'left'  ? 'translateX(-28px)' :
    from === 'right' ? 'translateX(28px)'  :
    from === 'scale' ? 'scale(0.96)'       :
    'translateY(28px)'
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'none' : initial,
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   SVG icons
   ──────────────────────────────────────────────────────────────── */
const HeartIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

/* ────────────────────────────────────────────────────────────────
   App mockup cards (hero visual)
   ──────────────────────────────────────────────────────────────── */
function DietMockCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl w-72">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-zinc-400">Diet Today</p>
        <span className="text-xs font-semibold text-emerald-400">5/7 — 71%</span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-emerald-500/15 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '71%' }} />
        </div>
        <span className="text-sm font-bold text-emerald-400">71%</span>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-800/70">
        {[{ label: 'Calories', value: '1,840', unit: 'kcal', color: 'text-amber-400' },
          { label: 'Protein', value: '112', unit: 'g', color: 'text-sky-400' },
          { label: 'Carbs', value: '198', unit: 'g', color: 'text-orange-400' },
          { label: 'Fat', value: '54', unit: 'g', color: 'text-purple-400' }].map(m => (
          <div key={m.label} className="text-center">
            <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[9px] font-normal ml-0.5 text-zinc-600">{m.unit}</span></p>
            <p className="text-[9px] text-zinc-600 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WorkoutMockCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-2xl w-48">
      <p className="text-[10px] font-medium text-zinc-500 mb-1.5">Workout Today</p>
      <p className="text-2xl font-bold text-rose-400">
        486 <span className="text-xs font-normal text-zinc-500">kcal</span>
      </p>
      <p className="text-[10px] text-zinc-600 mt-1">3 exercises · 52 min</p>
      <p className="text-[9px] text-zinc-700 mt-1.5 truncate">Bench · Deadlift · Treadmill</p>
    </div>
  )
}

function BodyScanMockCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-2xl w-48">
      <p className="text-[10px] font-medium text-zinc-500 mb-2">Body Scan · May</p>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[{ l: 'Weight', v: '74.2kg' }, { l: 'Fat', v: '19.4%' }, { l: 'SMM', v: '32.1kg' }].map(m => (
          <div key={m.l}>
            <p className="text-xs font-semibold text-zinc-100">{m.v}</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">{m.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CaloriesMockCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-2xl w-52">
      <p className="text-[10px] font-medium text-zinc-500 mb-1">Daily Target · Lose Fat</p>
      <p className="text-2xl font-bold text-sky-400">2,040 <span className="text-xs font-normal text-zinc-500">kcal/day</span></p>
      <p className="text-[10px] text-zinc-600 mt-1">400 kcal below TDEE · 2,440</p>
      <div className="mt-2 flex gap-1.5">
        {['Sedentary', 'Moderate', 'Active'].map((l, i) => (
          <span key={l} className={`text-[9px] px-1.5 py-0.5 rounded-md ${i === 1 ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-600'}`}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function HeroMockup() {
  return (
    <div className="relative w-full h-[520px] select-none">
      {/* Glow behind mockup */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main diet card — center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-float-b">
        <div className="animate-glow-pulse rounded-2xl">
          <DietMockCard />
        </div>
      </div>

      {/* Workout card — top-right */}
      <div className="absolute top-10 right-4 z-10 animate-float">
        <WorkoutMockCard />
      </div>

      {/* Body scan card — bottom-left */}
      <div className="absolute bottom-10 left-4 z-10 animate-float-c">
        <BodyScanMockCard />
      </div>

      {/* Calories card — bottom-right */}
      <div className="absolute bottom-28 right-0 z-10 animate-float" style={{ animationDelay: '2s' }}>
        <CaloriesMockCard />
      </div>

      {/* AI badge — top-left */}
      <div className="absolute top-6 left-10 z-30 animate-float-c" style={{ animationDelay: '1s' }}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 border border-violet-500/25 rounded-full backdrop-blur-sm">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-medium text-violet-300">AI Analysis ready</span>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   Feature cards data
   ──────────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2 1.1 0 2-.9 2-2V2M7 2v20M21 15V2c-5 0-9 4-9 9v1h9z" />
      </svg>
    ),
    title: 'Diet Tracking',
    desc: 'Build your meal plan once, check off items daily. AI calculates calories and macros, and warns when you exceed your goal.',
    accent: 'emerald',
    tag: 'Calories · Protein · Carbs · Fat',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4v6a6 6 0 0012 0V4M4 20h16" />
      </svg>
    ),
    title: 'Workout Logging',
    desc: 'Log exercises manually or just tell AI what you did — it parses sets, reps, weight, and estimates calories burned.',
    accent: 'rose',
    tag: 'Strength · Cardio · Calories Burned',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Body Composition',
    desc: 'Log InBody scan results monthly. Track weight, BMI, skeletal muscle mass, body fat %, and waist-hip ratio over time.',
    accent: 'violet',
    tag: 'Weight · SMM · Fat% · WHR',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    title: 'Daily Tasks',
    desc: 'Schedule tasks per day and track completion. See your productivity rate across the week, not just today.',
    accent: 'indigo',
    tag: 'Daily Planning · Completion Rate',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /><path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
      </svg>
    ),
    title: 'AI Analysis',
    desc: 'Chat with an AI coach that has read all your data. Ask anything — it gives data-driven, specific answers, not generic advice.',
    accent: 'violet',
    tag: 'GPT-4 · Your Data · Real Insights',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Calorie Calculator',
    desc: 'TDEE automatically calculated from your body scan data. Switch between Lose Fat, Recomp, Maintain, and Build Muscle goals.',
    accent: 'amber',
    tag: 'TDEE · BMR · Katch-McArdle',
  },
]

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  emerald: { bg: 'bg-emerald-500/8',  text: 'text-emerald-400', border: 'group-hover:border-emerald-500/30', iconBg: 'bg-emerald-500/10' },
  rose:    { bg: 'bg-rose-500/8',     text: 'text-rose-400',    border: 'group-hover:border-rose-500/30',    iconBg: 'bg-rose-500/10'    },
  violet:  { bg: 'bg-violet-500/8',   text: 'text-violet-400',  border: 'group-hover:border-violet-500/30',  iconBg: 'bg-violet-500/10'  },
  indigo:  { bg: 'bg-indigo-500/8',   text: 'text-indigo-400',  border: 'group-hover:border-indigo-500/30',  iconBg: 'bg-indigo-500/10'  },
  amber:   { bg: 'bg-amber-500/8',    text: 'text-amber-400',   border: 'group-hover:border-amber-500/30',   iconBg: 'bg-amber-500/10'   },
  sky:     { bg: 'bg-sky-500/8',      text: 'text-sky-400',     border: 'group-hover:border-sky-500/30',     iconBg: 'bg-sky-500/10'     },
}

/* ────────────────────────────────────────────────────────────────
   Chat mockup for AI section
   ──────────────────────────────────────────────────────────────── */
function AIChatMockup() {
  const messages = [
    { role: 'system', text: 'Health profile loaded · 7 days of data' },
    { role: 'user', text: 'Am I hitting my protein targets this week?' },
    { role: 'ai', text: '**You hit protein on 4 of 7 days.** Average intake was **118g/day vs your 130g target** — an 9% shortfall.\n\nWorst days: Mon (89g) and Thu (94g) — both days you skipped dinner. Adding 200g Greek yoghurt at night would close the gap on those days.' },
    { role: 'user', text: 'What about my workouts?' },
    { role: 'ai', text: 'You trained **4 times this week** — good frequency. But total weekly volume dropped 18% vs last week. Your bench press stalled at 60kg for 3 sessions in a row — consider adding a 5th set or bumping to 62.5kg next session.' },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-100">AI Health Coach</p>
          <p className="text-[10px] text-zinc-500">Powered by your data</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-zinc-500">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 max-h-72 overflow-hidden">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? 'flex justify-end animate-chat-in-r' : m.role === 'system' ? 'flex justify-center animate-chat-in' : 'flex justify-start animate-chat-in'}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {m.role === 'system' ? (
              <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded-full">{m.text}</span>
            ) : m.role === 'user' ? (
              <div className="max-w-[75%] px-3 py-2 bg-indigo-500 rounded-2xl rounded-br-sm text-xs text-white">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[85%] px-3 py-2 bg-zinc-800 rounded-2xl rounded-bl-sm text-xs text-zinc-200 leading-relaxed">
                {m.text.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith('**') ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong> : part
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-2">
        <div className="flex-1 h-8 bg-zinc-800 rounded-lg flex items-center px-3">
          <span className="text-xs text-zinc-600">Ask about your health…</span>
        </div>
        <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   How-it-works steps
   ──────────────────────────────────────────────────────────────── */
const STEPS = [
  {
    number: '01',
    title: 'Create your account',
    desc: 'Sign up with email and password. Your data is private and tied only to your account.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Set up your profile',
    desc: 'Log your first body scan, build your diet plan, and set your activity level and goal (lose fat, recomp, bulk).',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Track daily, improve weekly',
    desc: 'Log meals, workouts, and tasks each day. Ask the AI coach to analyse your week and tell you exactly what to fix.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

/* ────────────────────────────────────────────────────────────────
   Main landing page
   ──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="bg-zinc-950 text-zinc-100 overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/60' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <HeartIcon />
            </div>
            <span className="font-semibold text-zinc-100 text-sm">Health Tracker</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features"     className="hover:text-zinc-100 transition-colors">Features</a>
            <a href="#ai"           className="hover:text-zinc-100 transition-colors">AI Analysis</a>
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</a>
          </div>

          <Link
            href="/tracker"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-px"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center relative pt-16 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-500/6 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] bg-violet-500/6 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/3 rounded-full blur-[120px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: Copy */}
            <div className="space-y-8">
              <div style={{ animation: 'appear 0.55s ease 0.05s both' }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  AI-Powered · Built for Results
                </div>
              </div>

              <div style={{ animation: 'appear 0.6s ease 0.15s both' }}>
                <h1 className="text-5xl lg:text-[3.75rem] font-bold leading-[1.08] tracking-tight">
                  <span className="text-zinc-100">Track Everything.</span>
                  <br />
                  <span className="text-shimmer">Improve Faster.</span>
                </h1>
              </div>

              <p className="text-zinc-400 text-lg leading-relaxed max-w-md" style={{ animation: 'appear 0.6s ease 0.25s both' }}>
                Not another calorie counter. A complete health system — diet, workouts, body composition, and an AI coach that has actually read your data.
              </p>

              <div className="flex gap-3 flex-wrap" style={{ animation: 'appear 0.6s ease 0.35s both' }}>
                <Link
                  href="/tracker"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 animate-glow-pulse"
                >
                  Start Tracking Free
                  <ChevronRight />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all duration-200"
                >
                  See Features
                </a>
              </div>

              <div className="flex items-center gap-5 text-xs text-zinc-500" style={{ animation: 'appear 0.6s ease 0.45s both' }}>
                {['Free to use', 'No credit card', 'AI-powered', 'Your data stays yours'].map((t, i) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">✓</span>{t}
                    {i < 3 && <span className="ml-4 w-px h-3 bg-zinc-800" />}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Mockup */}
            <div className="hidden lg:block" style={{ animation: 'appear 0.8s ease 0.3s both' }}>
              <HeroMockup />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40" style={{ animation: 'appear 1s ease 1s both' }}>
          <p className="text-[10px] tracking-widest uppercase text-zinc-500">Scroll</p>
          <div className="w-px h-8 bg-gradient-to-b from-zinc-500 to-transparent" />
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────────────────── */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '6', label: 'Tracking modules', sub: 'Diet · Workout · Body · Tasks · AI · Calculator' },
              { value: 'AI', label: 'Powered insights', sub: 'Natural language · Data-driven · Specific' },
              { value: '∞', label: 'History logged', sub: 'Every meal, lift, and body scan stored' },
              { value: '1', label: 'App for it all', sub: 'No juggling 6 different apps' },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <p className="text-3xl font-bold text-zinc-100">{s.value}</p>
                <p className="text-sm font-medium text-zinc-300">{s.label}</p>
                <p className="text-[10px] text-zinc-600 leading-tight">{s.sub}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-medium mb-3 tracking-wide uppercase">Everything in one place</p>
            <h2 className="text-4xl font-bold text-zinc-100 mb-4">Six modules. One system.</h2>
            <p className="text-zinc-400 max-w-lg mx-auto">Every feature was designed around the same principle — give you data that tells you exactly what&apos;s working and what isn&apos;t.</p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const s = ACCENT_STYLES[f.accent]
              return (
                <Reveal key={f.title} delay={i * 80} className="group">
                  <div className={`h-full bg-zinc-900 border border-zinc-800 ${s.border} rounded-2xl p-6 card-glow transition-colors`}>
                    <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center mb-4 ${s.text}`}>
                      {f.icon}
                    </div>
                    <h3 className="text-base font-semibold text-zinc-100 mb-2">{f.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed mb-4">{f.desc}</p>
                    <span className={`inline-block text-[10px] font-medium ${s.text} ${s.bg} px-2 py-1 rounded-md`}>
                      {f.tag}
                    </span>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── AI Analysis spotlight ─────────────────────────────────── */}
      <section id="ai" className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            <Reveal from="left">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  AI Analysis
                </div>

                <h2 className="text-4xl font-bold text-zinc-100 leading-tight">
                  A coach that has actually read your logs.
                </h2>

                <p className="text-zinc-400 leading-relaxed">
                  Before you ask a question, the AI loads your full health profile — last 7 days of diet, workouts, task completion, and your body scan history. Every answer references your real numbers.
                </p>

                <ul className="space-y-3">
                  {[
                    'References your actual calories vs target — not averages',
                    'Identifies the specific days you missed protein',
                    'Spots workout volume drops and training plateaus',
                    'Analyses body composition trends across scans',
                    'Gives concrete next steps, not generic advice',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="text-violet-400 mt-0.5 flex-shrink-0">◆</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/tracker"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25"
                >
                  Try AI Analysis
                  <ChevronRight />
                </Link>
              </div>
            </Reveal>

            <Reveal from="right" delay={100}>
              <AIChatMockup />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Body Composition highlight ────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-wide uppercase">Science-based calorie targets</p>
            <h2 className="text-4xl font-bold text-zinc-100 mb-4">Your calories, calculated from your body.</h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Most apps use generic formulas. We use your actual InBody scan data — lean muscle mass — to calculate your exact metabolic rate via the Katch-McArdle formula.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                accent: 'amber',
                title: 'Maintenance (TDEE)',
                desc: 'Calculated from lean body mass × activity multiplier. Accurate to within ±50 kcal for most people.',
                stat: '≈2,440 kcal',
                sub: 'based on 74.2kg @ 19.4% fat',
              },
              {
                accent: 'sky',
                title: 'Goal-Adjusted Target',
                desc: 'Choose Lose Fat (−400), Recomp (−300), Maintain, or Build Muscle (+250). Target updates when you switch.',
                stat: '4 Goals',
                sub: 'with science-backed offsets',
              },
              {
                accent: 'violet',
                title: 'Trend Insights',
                desc: "Compare consecutive scans. We detect body recomp, muscle loss, fat gain — and tell you plainly what's happening.",
                stat: 'Scan-to-scan',
                sub: 'weight · fat% · SMM trends',
              },
            ].map((c, i) => {
              const s = ACCENT_STYLES[c.accent]
              return (
                <Reveal key={c.title} delay={i * 100}>
                  <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full space-y-4 card-glow group ${s.border}`}>
                    <div>
                      <p className={`text-xs font-medium ${s.text} mb-2`}>{c.title}</p>
                      <p className="text-sm text-zinc-400 leading-relaxed">{c.desc}</p>
                    </div>
                    <div className={`inline-block px-3 py-1.5 ${s.bg} rounded-lg`}>
                      <p className={`text-sm font-bold ${s.text}`}>{c.stat}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{c.sub}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-medium mb-3 tracking-wide uppercase">Getting started</p>
            <h2 className="text-4xl font-bold text-zinc-100">Up and running in minutes.</h2>
          </Reveal>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] h-px bg-gradient-to-r from-emerald-500/30 via-violet-500/30 to-emerald-500/30" />

            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <Reveal key={step.number} delay={i * 120} className="relative">
                  <div className="text-center space-y-4">
                    <div className="relative inline-flex">
                      <div className="w-20 h-20 bg-zinc-900 border-2 border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mx-auto relative z-10">
                        {step.icon}
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center z-20">
                        <span className="text-[9px] font-bold text-white">{step.number}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100 mb-2">{step.title}</h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="relative border-gradient-animated rounded-3xl overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-violet-500/5 pointer-events-none" />

              <div className="relative px-10 py-16 text-center space-y-6">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto animate-glow-pulse">
                  <HeartIcon />
                </div>

                <div>
                  <h2 className="text-4xl font-bold text-zinc-100 mb-3">
                    Your health data is waiting.
                  </h2>
                  <p className="text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
                    Start logging today. By next week, the AI can already tell you exactly what&apos;s holding you back.
                  </p>
                </div>

                <div className="flex gap-3 justify-center flex-wrap">
                  <Link
                    href="/tracker"
                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white text-base font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                  >
                    Start Tracking Free →
                  </Link>
                </div>

                <p className="text-xs text-zinc-600">Free · No credit card · Always will be</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800/60 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <HeartIcon />
            </div>
            <span className="text-sm font-semibold text-zinc-400">Health Tracker</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <a href="#features"     className="hover:text-zinc-400 transition-colors">Features</a>
            <a href="#ai"           className="hover:text-zinc-400 transition-colors">AI Analysis</a>
            <a href="#how-it-works" className="hover:text-zinc-400 transition-colors">How it works</a>
            <Link href="/tracker"   className="hover:text-zinc-400 transition-colors">Open App</Link>
          </div>

          <p className="text-xs text-zinc-700">Built with Next.js + Python</p>
        </div>
      </footer>

    </div>
  )
}
