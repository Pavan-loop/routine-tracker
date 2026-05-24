import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const { description } = await request.json()
  if (!description) return NextResponse.json({ error: 'Missing description' }, { status: 400 })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a precise nutritionist and food database. Parse the user's food description into individual food items and return their exact nutritional values.

Return ONLY a JSON array. No markdown, no explanation. Each item:
{"name":"string","quantity":"string or null","kcal":integer,"protein":number,"carbs":number,"fat":number}

Rules:
- Split combined meals into individual foods (e.g. "chicken rice" → chicken + rice)
- Use the quantity exactly as described (e.g. "200g", "2 pieces", "1 cup")
- kcal must be an integer
- protein, carbs, fat rounded to 1 decimal place
- Use accurate nutritional database values (USDA / standard Indian food values where applicable)
- If quantity is ambiguous, assume a standard serving

Return ONLY the JSON array.`,
      },
      { role: 'user', content: description },
    ],
    temperature: 0,
    max_tokens: 500,
  })

  const raw = completion.choices[0].message.content?.trim() ?? '[]'

  try {
    const foods = JSON.parse(raw)
    return NextResponse.json({ foods: Array.isArray(foods) ? foods : [foods] })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
