export type Routine = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Completion = {
  id: string
  routine_id: string
  user_id: string
  completed_date: string
  created_at: string
}

export type DietItem = {
  id: string
  user_id: string
  name: string
  quantity: string | null
  order_index: number
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  created_at: string
}

export type DietLog = {
  id: string
  diet_item_id: string
  user_id: string
  logged_date: string
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  title: string
  scheduled_date: string
  completed: boolean
  created_at: string
}

export type BodyScan = {
  id: string
  user_id: string
  scan_date: string
  height: number | null
  weight: number | null
  bmi: number | null
  smm: number | null
  fat: number | null
  whr: number | null
  notes: string | null
  created_at: string
}

export type WorkoutEntry = {
  id: string
  user_id: string
  workout_date: string
  name: string
  type: 'strength' | 'cardio' | 'other'
  sets: number | null
  reps: number | null
  weight_kg: number | null
  duration_min: number | null
  calories_burned: number | null
  notes: string | null
  created_at: string
}

export type User = {
  id: string
  email?: string
}
