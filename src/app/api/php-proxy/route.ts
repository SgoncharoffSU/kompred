import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'http://127.0.0.1:8080'
const PHP_API_URL = `${PHP_BASE_URL}/api/index.php`
const PHP_LOGIN_URL = `${PHP_BASE_URL}/login.php`
const PHP_SERVICE_LOGIN = process.env.PHP_SERVICE_LOGIN || 'goncharovsu@yandex.ru'
const PHP_SERVICE_PASS = process.env.PHP_SERVICE_PASS || '143430'

// Read-only actions may specify their target workspace directly via ?wid=
// (used by the public, unauthenticated client-facing configurator).
// Everything else is scoped to the workspace of the logged-in admin session.
const PUBLIC_GET_ACTIONS = ['bootstrap', 'get_layouts', 'get_calculation']
const PUBLIC_POST_ACTIONS = ['create_calculation', 'request_callback']

const phpSessionCache = new Map<string, { phpsessid: string; ts: number }>()

async function getPhpSessionId(login: string, password: string): Promise<string | null> {
  const cached = phpSessionCache.get(login)
  if (cached && Date.now() - cached.ts < 1200000) return cached.phpsessid
  try {
    const res = await fetch(PHP_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login, password }).toString(),
      redirect: 'manual',
    })
    const match = (res.headers.get('set-cookie') || '').match(/PHPSESSID=([^;]+)/)
    if (!match) return null
    const phpsessid = match[1]
    phpSessionCache.set(login, { phpsessid, ts: Date.now() })
    return phpsessid
  } catch {
    return null
  }
}

async function callPhp(url: URL, login: string, password: string, init: RequestInit | undefined, workspaceId: number | undefined): Promise<NextResponse> {
  const doFetch = async (phpsessid: string) => {
    const headers: Record<string, string> = { Cookie: `PHPSESSID=${phpsessid}`, ...((init?.headers as Record<string, string>) || {}) }
    if (workspaceId && workspaceId > 0) headers['X-Workspace-ID'] = String(workspaceId)
    return fetch(url.toString(), { cache: 'no-store', ...init, headers })
  }

  try {
    let phpsessid = await getPhpSessionId(login, password)
    if (!phpsessid) return NextResponse.json({ ok: false, error: 'PHP auth failed' }, { status: 502 })

    let res = await doFetch(phpsessid)
    let data = await res.json()

    if (data?.error === 'Unauthorized') {
      phpSessionCache.delete(login)
      phpsessid = await getPhpSessionId(login, password)
      if (!phpsessid) return NextResponse.json({ ok: false, error: 'PHP auth failed' }, { status: 502 })
      res = await doFetch(phpsessid)
      data = await res.json()
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ ok: false, error: 'PHP API unreachable' }, { status: 502 })
  }
}

function sessionUser(req: NextRequest) {
  const token = req.cookies.get('bh_session')?.value
  return token ? getSessionUser(token) : null
}

function resolveWorkspaceId(req: NextRequest, action: string, publicActions: string[]): { workspaceId: number | undefined; error?: NextResponse } {
  if (publicActions.includes(action)) {
    const wid = req.nextUrl.searchParams.get('wid')
    if (wid) return { workspaceId: parseInt(wid, 10) || undefined }
    const user = sessionUser(req)
    return { workspaceId: user?.workspace.php_workspace_id || undefined }
  }
  const user = sessionUser(req)
  if (!user || !user.workspace.use_php) {
    return { workspaceId: undefined, error: NextResponse.json({ ok: false, error: 'No workspace data' }) }
  }
  return { workspaceId: user.workspace.php_workspace_id }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get('action') || ''
  const { workspaceId, error } = resolveWorkspaceId(req, action, PUBLIC_GET_ACTIONS)
  if (error) return error

  const url = new URL(PHP_API_URL)
  searchParams.forEach((value, key) => url.searchParams.set(key, value))
  return callPhp(url, PHP_SERVICE_LOGIN, PHP_SERVICE_PASS, undefined, workspaceId)
}

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get('action') || ''
  const { workspaceId, error } = resolveWorkspaceId(req, action, PUBLIC_POST_ACTIONS)
  if (error) return error

  const url = new URL(PHP_API_URL)
  searchParams.forEach((value, key) => url.searchParams.set(key, value))
  try {
    const body = await req.json()
    return callPhp(url, PHP_SERVICE_LOGIN, PHP_SERVICE_PASS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, workspaceId)
  } catch {
    return NextResponse.json({ ok: false, error: 'PHP API unreachable' }, { status: 502 })
  }
}
