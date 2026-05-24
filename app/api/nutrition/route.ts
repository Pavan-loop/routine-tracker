import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const { name, quantity } = await request.json()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const food = quantity ? `${quantity} of ${name}` : name

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a precise nutrition database. Return ONLY a JSON object with kcal, protein, carbs, fat (all numbers, rounded to 1 decimal). No explanation, no markdown, no code block. Example: {"kcal":250,"protein":22.5,"carbs":0,"fat":14.2}',
      },
      {
        role: 'user',
        content: `Calculate the nutritional values for: ${food}`,
      },
    ],
    temperature: 0,
    max_tokens: 60,
  })

  const raw = completion.choices[0].message.content?.trim() ?? '{}'

  try {
    const data = JSON.parse(raw)
    return NextResponse.json({
      kcal: Math.round(data.kcal ?? 0),
      protein: Math.round((data.protein ?? 0) * 10) / 10,
      carbs: Math.round((data.carbs ?? 0) * 10) / 10,
      fat: Math.round((data.fat ?? 0) * 10) / 10,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse nutrition data' }, { status: 500 })
  }
}
