import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json()
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const prompt = `Minimal flat abstract cover art for a project called '${title}': ${description}. Warm colours, geometric shapes, no text.`

    const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'landscape_4_3',
        num_inference_steps: 4,
        num_images: 1,
      }),
    })

    const data = await response.json()
    const url = data.images?.[0]?.url
    if (!url) return NextResponse.json({ error: 'No image generated' }, { status: 500 })
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
