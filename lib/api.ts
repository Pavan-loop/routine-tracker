import type { DietItem, DietLog, Task, BodyScan, WorkoutEntry } from './types'

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('health_tracker_token')
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

type ParsedFood = { name: string; quantity: string | null; kcal: number; protein: number; carbs: number; fat: number }

export const api = {
  auth: {
    login: (email: string, password: string) =>
      req<{ access_token: string; user: { id: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    signup: (email: string, password: string) =>
      req<{ access_token: string; user: { id: string; email: string } }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },

  diet: {
    getItems: () => req<DietItem[]>('/diet/items'),
    addItem: (data: Record<string, unknown>) =>
      req<DietItem>('/diet/items', { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (id: string, data: Partial<DietItem>) =>
      req<DietItem>(`/diet/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteItem: (id: string) =>
      req<void>(`/diet/items/${id}`, { method: 'DELETE' }),
    getLogs: (date: string) =>
      req<DietLog[]>(`/diet/logs?date=${date}`),
    getLogsInRange: (from: string, to: string) =>
      req<DietLog[]>(`/diet/logs?from=${from}&to=${to}`),
    addLog: (data: { diet_item_id: string; logged_date: string }) =>
      req<DietLog>('/diet/logs', { method: 'POST', body: JSON.stringify(data) }),
    deleteLog: (id: string) =>
      req<void>(`/diet/logs/${id}`, { method: 'DELETE' }),
  },

  tasks: {
    getByDate: (date: string) =>
      req<Task[]>(`/tasks?date=${date}`),
    getInRange: (from: string, to: string) =>
      req<Task[]>(`/tasks?from=${from}&to=${to}`),
    add: (data: { title: string; scheduled_date: string }) =>
      req<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Task>) =>
      req<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  bodyScans: {
    getAll: () => req<BodyScan[]>('/body-scans'),
    add: (data: Record<string, unknown>) =>
      req<BodyScan>('/body-scans', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<void>(`/body-scans/${id}`, { method: 'DELETE' }),
  },

  workouts: {
    getByDate: (date: string) =>
      req<WorkoutEntry[]>(`/workouts?date=${date}`),
    getInRange: (from: string, to: string) =>
      req<WorkoutEntry[]>(`/workouts?from=${from}&to=${to}`),
    add: (data: Record<string, unknown>) =>
      req<WorkoutEntry>('/workouts', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<void>(`/workouts/${id}`, { method: 'DELETE' }),
  },

  ai: {
    parseDiet: (description: string, historyContext?: string) =>
      req<{ foods: ParsedFood[] }>('/ai/diet-parse', {
        method: 'POST',
        body: JSON.stringify({ description, historyContext }),
      }),
    nutrition: (name: string, quantity: string | null) =>
      req<{ kcal: number; protein: number; carbs: number; fat: number }>('/ai/nutrition', {
        method: 'POST',
        body: JSON.stringify({ name, quantity }),
      }),
    parseWorkout: (description: string, bodyWeight: number | null) =>
      req<{ exercises: Partial<WorkoutEntry>[] }>('/ai/workout-parse', {
        method: 'POST',
        body: JSON.stringify({ description, bodyWeight }),
      }),
  },
}
