import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const { description, bodyWeight } = await request.json()
  if (!description) return NextResponse.json({ error: 'Missing description' }, { status: 400 })

  const weightNote = bodyWeight
    ? `The user weighs ${bodyWeight}kg. Scale calorie estimates proportionally (baseline is 70kg).`
    : 'Assume 70kg bodyweight for calorie estimates.'

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a precise fitness expert and calorie calculator. Parse the user's workout description and return ONLY a JSON array of exercises. No markdown, no explanation.

${weightNote}

For each exercise return exactly:
{"name":"string","type":"strength"|"cardio"|"other","sets":int|null,"reps":int|null,"weight_kg":number|null,"duration_min":int|null,"calories_burned":int}

Calorie estimation guidelines (scale by user weight / 70):
- Running/treadmill: 10–12 kcal/min
- Cycling/stationary bike: 8–10 kcal/min
- Walking: 4–5 kcal/min
- Swimming: 9–11 kcal/min
- HIIT/jump rope: 12–15 kcal/min
- Elliptical/rowing: 7–9 kcal/min
- Compound strength (squats, deadlifts, bench, overhead press): 7 kcal/set
- Isolation strength (curls, laterals, tricep): 4 kcal/set
- For strength with unknown sets, estimate total kcal for the described volume

Always include calories_burned (never null). Return ONLY the JSON array.`,
      },
      {
        role: 'user',
        content: description,
      },
    ],
    temperature: 0,
    max_tokens: 400,
  })

  const raw = completion.choices[0].message.content?.trim() ?? '[]'

  try {
    const exercises = JSON.parse(raw)
    return NextResponse.json({ exercises: Array.isArray(exercises) ? exercises : [exercises] })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
