import OpenAI from 'openai'
import { NextRequest } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  const { messages, context } = await request.json()

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert personal health coach specialising in nutrition, strength training, and body composition. You have full access to the user's health profile below.

Your analysis must be:
- DATA-DRIVEN: reference specific numbers from their logs (e.g. "you hit 121g protein on May 24 vs your 130g target")
- PRECISE: compare actual vs target calories, actual vs target protein, workout frequency vs goal
- ACTIONABLE: give concrete next steps, not generic advice
- HONEST: if the data shows a problem, say so clearly
- CONCISE: no filler, no disclaimers, no "great job" padding unless genuinely earned

When analysing workouts, consider: exercise selection, volume (sets×reps×weight), frequency, calories burned vs TDEE.
When analysing diet, consider: adherence %, macro breakdown vs targets, consistency across the week.
When analysing body composition, consider: trends in weight, fat %, muscle mass (SMM), and how they align with the stated goal.

User's complete health profile:
${context}`,
      },
      ...messages,
    ],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
