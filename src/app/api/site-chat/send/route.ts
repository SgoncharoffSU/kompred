import { NextRequest, NextResponse } from 'next/server'

const BOT_HTTP_URL = process.env.BOT_HTTP_URL || 'http://127.0.0.1:8801'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${BOT_HTTP_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ ok: false, error: 'chat service unreachable' }, { status: 502 })
  }
}
