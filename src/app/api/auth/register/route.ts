import { NextRequest, NextResponse } from 'next/server'
import { createSession, createWorkspace, findUserByEmail, findWorkspaceByInviteCode, nextAdminWorkspaceId, registerUser } from '@/lib/auth'

const PHP_BASE_URL = process.env.PHP_BASE_URL || 'http://127.0.0.1:8080'
const PHP_SERVICE_LOGIN = process.env.PHP_SERVICE_LOGIN || 'goncharovsu@yandex.ru'
const PHP_SERVICE_PASS = process.env.PHP_SERVICE_PASS || '143430'

let sessionCache: { id: string; ts: number } | null = null

async function getPhpSessionId(): Promise<string | null> {
  if (sessionCache && Date.now() - sessionCache.ts < 1200000) return sessionCache.id
  const body = new URLSearchParams({ login: PHP_SERVICE_LOGIN, password: PHP_SERVICE_PASS })
  try {
    const res = await fetch(`${PHP_BASE_URL}/login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    })
    const match = (res.headers.get('set-cookie') || '').match(/PHPSESSID=([^;]+)/)
    if (!match) return null
    sessionCache = { id: match[1], ts: Date.now() }
    return sessionCache.id
  } catch {
    return null
  }
}

async function phpApi(action: string, payload: Record<string, unknown>): Promise<{ ok: boolean; [key: string]: unknown }> {
  const sessionId = await getPhpSessionId()
  if (!sessionId) return { ok: false, error: 'PHP auth failed' }
  try {
    const res = await fetch(`${PHP_BASE_URL}/api/index.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `PHPSESSID=${sessionId}` },
      body: JSON.stringify(payload),
    })
    return res.json()
  } catch {
    return { ok: false, error: 'PHP unreachable' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, invite_code } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Укажите email и пароль' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: 'Пароль должен быть не менее 6 символов' }, { status: 400 })
    }
    if (findUserByEmail(email)) {
      return NextResponse.json({ ok: false, error: 'Email уже зарегистрирован' }, { status: 409 })
    }

    let workspaceId: string

    if (invite_code) {
      const workspace = findWorkspaceByInviteCode(invite_code.trim())
      if (!workspace) {
        return NextResponse.json({ ok: false, error: 'Неверный код приглашения' }, { status: 400 })
      }
      workspaceId = workspace.id
    } else {
      const nextId = nextAdminWorkspaceId()
      workspaceId = `admin${nextId}`
      const name = email.split('@')[0]
      const created = await phpApi('create_workspace', { slug: workspaceId, name })
      if (!created.ok) {
        return NextResponse.json({ ok: false, error: 'Не удалось создать рабочее пространство' }, { status: 500 })
      }
      createWorkspace(workspaceId, name, created.workspace_id as number)
    }

    const user = registerUser(email, password, workspaceId)
    const token = createSession(user.id)

    const res = NextResponse.json({ ok: true })
    res.cookies.set('bh_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 2592000, path: '/' })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Ошибка сервера' }, { status: 500 })
  }
}
