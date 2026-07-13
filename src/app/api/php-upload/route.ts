import { type NextRequest, NextResponse } from 'next/server'

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'http://127.0.0.1:8080'
const PHP_API_URL = `${PHP_BASE_URL}/api/index.php`
const PHP_LOGIN_URL = `${PHP_BASE_URL}/login.php`
const PHP_SERVICE_LOGIN = process.env.PHP_SERVICE_LOGIN || 'goncharovsu@yandex.ru'
const PHP_SERVICE_PASS = process.env.PHP_SERVICE_PASS || '143430'

let sessionCache: { phpsessid: string; ts: number } | null = null

async function getPhpSessionId(): Promise<string | null> {
  if (sessionCache && Date.now() - sessionCache.ts < 1200000) return sessionCache.phpsessid
  try {
    const res = await fetch(PHP_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login: PHP_SERVICE_LOGIN, password: PHP_SERVICE_PASS }).toString(),
      redirect: 'manual',
    })
    const match = (res.headers.get('set-cookie') || '').match(/PHPSESSID=([^;]+)/)
    if (!match) return null
    sessionCache = { phpsessid: match[1], ts: Date.now() }
    return sessionCache.phpsessid
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const phpsessid = await getPhpSessionId()
    const formData = await request.formData()
    const headers: Record<string, string> = {}
    if (phpsessid) headers.Cookie = `PHPSESSID=${phpsessid}`
    const res = await fetch(`${PHP_API_URL}?action=upload_image`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'Upload failed' }, { status: 502 })
  }
}
