'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { User, BodyScan } from '@/lib/types'

type Props = { user: User }

const emptyForm = {
  scan_date: new Date().toISOString().split('T')[0],
  height: '', weight: '', bmi: '', smm: '', fat: '', whr: '', notes: '',
}

export default function BodyScanView({ user: _user }: Props) {
  const [scans, setScans] = useState<BodyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.bodyScans.getAll()
      .then(data => { setScans(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const saveScan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const scan = await api.bodyScans.add({
      scan_date: form.scan_date,
      height: form.height ? parseFloat(form.height) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      bmi: form.bmi ? parseFloat(form.bmi) : null,
      smm: form.smm ? parseFloat(form.smm) : null,
      fat: form.fat ? parseFloat(form.fat) : null,
      whr: form.whr ? parseFloat(form.whr) : null,
      notes: form.notes || null,
    }).catch(() => null)
    if (scan) {
      setScans(prev => [scan, ...prev])
      setShowForm(false)
      setForm(emptyForm)
    }
    setSaving(false)
  }

  const deleteScan = async (id: string) => {
    await api.bodyScans.delete(id).catch(() => null)
    setScans(prev => prev.filter(s => s.id !== id))
  }

  const fields = [
    { key: 'height', label: 'Height (cm)' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'bmi', label: 'BMI' },
    { key: 'smm', label: 'SMM (kg)' },
    { key: 'fat', label: 'Body Fat (%)' },
    { key: 'whr', label: 'WHR' },
  ] as const

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Body Scan</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Monthly InBody results</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            showForm
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              : 'bg-violet-500 hover:bg-violet-400 text-white'
          }`}
        >
          {showForm ? 'Cancel' : '+ Log Scan'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveScan} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-100">New Scan</h2>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Date</label>
            <input
              type="date"
              value={form.scan_date}
              onChange={e => setForm(f => ({ ...f, scan_date: e.target.value }))}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {fields.map(field => (
              <div key={field.key}>
                <label className="text-xs text-zinc-400 mb-1.5 block">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="—"
                  value={form[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any observations..."
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 resize-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Scan'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {scans.length === 0 && (
          <p className="text-sm text-zinc-500 py-8 text-center">No scans recorded yet.</p>
        )}
        {scans.map((scan, i) => (
          <ScanCard key={scan.id} scan={scan} prev={scans[i + 1]} onDelete={deleteScan} />
        ))}
      </div>
    </div>
  )
}

function ScanCard({ scan, prev, onDelete }: { scan: BodyScan; prev?: BodyScan; onDelete: (id: string) => void }) {
  const dateStr = new Date(scan.scan_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const trendIcon = (curr: number | null, prev: number | null, lowerIsBetter = false) => {
    if (curr == null || prev == null) return null
    const diff = curr - prev
    if (Math.abs(diff) < 0.01) return null
    const isUp = diff > 0
    const isGood = lowerIsBetter ? !isUp : isUp
    return (
      <span className={`text-xs ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? '↑' : '↓'}
      </span>
    )
  }

  const metrics = [
    { label: 'Weight', value: scan.weight, unit: 'kg', prev: prev?.weight ?? null, lowerIsBetter: false },
    { label: 'BMI', value: scan.bmi, unit: '', prev: prev?.bmi ?? null, lowerIsBetter: true },
    { label: 'SMM', value: scan.smm, unit: 'kg', prev: prev?.smm ?? null, lowerIsBetter: false },
    { label: 'FAT', value: scan.fat, unit: '%', prev: prev?.fat ?? null, lowerIsBetter: true },
    { label: 'WHR', value: scan.whr, unit: '', prev: prev?.whr ?? null, lowerIsBetter: true },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">{dateStr}</p>
          {scan.height && <p className="text-xs text-zinc-500 mt-0.5">Height: {scan.height}cm</p>}
        </div>
        <button onClick={() => onDelete(scan.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1 text-center">
        {metrics.map(m => (
          <div key={m.label}>
            <p className="text-sm font-semibold text-zinc-100 flex items-center justify-center gap-0.5">
              {m.value != null ? `${m.value}${m.unit}` : '—'}
              {trendIcon(m.value ?? null, m.prev, m.lowerIsBetter)}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
      {scan.notes && (
        <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800">{scan.notes}</p>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
    </div>
  )
}
