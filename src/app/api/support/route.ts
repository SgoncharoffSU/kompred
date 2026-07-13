import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, readDb } from '@/lib/auth'

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'http://127.0.0.1:8080'
const PHP_SERVICE_LOGIN = process.env.PHP_SERVICE_LOGIN || 'goncharovsu@yandex.ru'
const PHP_SERVICE_PASS = process.env.PHP_SERVICE_PASS || '143430'
const SUPPORT_EMAIL = 'goncharovsu@yandex.ru'

let sessionCache: string | null = null
let sessionCacheTs = 0

async function getPhpSessionId(): Promise<string | null> {
  if (sessionCache && Date.now() - sessionCacheTs < 1080000) return sessionCache
  try {
    const res = await fetch(`${PHP_BASE_URL}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ login: PHP_SERVICE_LOGIN, password: PHP_SERVICE_PASS }),
      redirect: 'manual',
    })
    const match = (res.headers.get('set-cookie') || '').match(/PHPSESSID=([^;]+)/)
    if (!match) return null
    sessionCache = match[1]
    sessionCacheTs = Date.now()
    return sessionCache
  } catch {
    return null
  }
}

async function getWorkspaceStats(phpWorkspaceId: number): Promise<{ models: number; groups: number; options: number }> {
  const empty = { models: 0, groups: 0, options: 0 }
  try {
    const sessionId = await getPhpSessionId()
    if (!sessionId) return empty
    const res = await fetch(`${PHP_BASE_URL}/api/index.php?action=bootstrap`, {
      headers: { Cookie: `PHPSESSID=${sessionId}`, 'X-Workspace-ID': String(phpWorkspaceId) },
      cache: 'no-store',
    })
    const data = await res.json()
    if (!data.ok) return empty
    return {
      models: (data.models || []).length,
      groups: (data.groups || []).length,
      options: (data.options || []).length,
    }
  } catch {
    return empty
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('bh_session')?.value
  const user = token ? getSessionUser(token) : null
  if (!user || user.email !== SUPPORT_EMAIL) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const db = readDb()
  const workspaces = await Promise.all(
    db.workspaces.map(async (w) => {
      const users = db.users.filter((u) => u.workspace_id === w.id).map((u) => u.email)
      const accountNum = w.id.match(/\d+$/)?.[0] || null
      const stats = w.php_workspace_id && w.php_workspace_id > 0 ? await getWorkspaceStats(w.php_workspace_id) : { models: 0, groups: 0, options: 0 }
      return {
        id: w.id,
        name: w.name,
        php_workspace_id: w.php_workspace_id || 0,
        use_php: w.use_php,
        account_num: accountNum,
        users,
        stats,
      }
    })
  )

  return NextResponse.json({ ok: true, workspaces })
}
