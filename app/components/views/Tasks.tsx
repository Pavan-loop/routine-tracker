'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Task } from '@/lib/types'

type Props = { user: User }

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Tasks({ user }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const dateKey = toISODate(selectedDate)
  const isToday = toISODate(new Date()) === dateKey

  const loadTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('scheduled_date', dateKey)
      .order('created_at')
    setTasks(data ?? [])
    setLoading(false)
  }, [user.id, dateKey])

  useEffect(() => { loadTasks() }, [loadTasks])

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: user.id, title: newTitle.trim(), scheduled_date: dateKey })
      .select()
      .single()
    if (data) {
      setTasks(prev => [...prev, data])
      setNewTitle('')
      setAdding(false)
    }
  }

  const toggleTask = async (task: Task) => {
    const { data } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id)
      .select()
      .single()
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? data : t))
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const dateStr = selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const done = tasks.filter(t => t.completed).length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Tasks</h1>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedDate(d => addDays(d, -1))}
          className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-zinc-100">
            {isToday ? 'Today' : dateStr}
          </p>
          {isToday && <p className="text-xs text-zinc-500">{dateStr}</p>}
        </div>
        <button
          onClick={() => setSelectedDate(d => addDays(d, 1))}
          className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {tasks.length > 0 && (
        <p className="text-sm text-zinc-400">{done}/{tasks.length} completed</p>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {tasks.length === 0 && !adding && (
            <p className="text-sm text-zinc-500 py-8 text-center">No tasks for this day.</p>
          )}
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900"
            >
              <button
                onClick={() => toggleTask(task)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 hover:border-indigo-400'
                }`}
              >
                {task.completed && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                {task.title}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <form onSubmit={addTask} className="flex gap-2">
          <input
            type="text"
            placeholder="Task description..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoFocus
            className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button type="submit" disabled={!newTitle.trim()} className="px-4 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors">
            Add
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewTitle('') }} className="px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 border border-dashed border-zinc-700 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
        >
          + Add task
        </button>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )
}
