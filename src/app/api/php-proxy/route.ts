import { NextRequest, NextResponse } from 'next/server'

const PHP_API_URL = process.env.PHP_API_URL || 'http://159.194.225.55/api/index.php'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = new URL(PHP_API_URL)
  searchParams.forEach((value, key) => url.searchParams.set(key, value))
  try {
    const response = await fetch(url.toString(), { cache: 'no-store' })
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'PHP API unreachable' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = new URL(PHP_API_URL)
  searchParams.forEach((value, key) => url.searchParams.set(key, value))
  try {
    const body = await request.json()
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'PHP API unreachable' }, { status: 502 })
  }
}
