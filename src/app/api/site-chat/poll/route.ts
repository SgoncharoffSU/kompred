import { NextRequest, NextResponse } from 'next/server'

const BOT_HTTP_URL = process.env.BOT_HTTP_URL || 'http://127.0.0.1:8801'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId') || ''
  const after = req.nextUrl.searchParams.get('after') || '0'
  if (!clientId) return NextResponse.json({ ok: false, error: 'clientId required' }, { status: 400 })
  try {
    const res = await fetch(`${BOT_HTTP_URL}/poll?clientId=${encodeURIComponent(clientId)}&after=${encodeURIComponent(after)}`, {
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ ok: false, error: 'chat service unreachable' }, { status: 502 })
  }
}
