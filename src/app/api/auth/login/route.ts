import { NextRequest, NextResponse } from 'next/server'
import { createSession, findUserByEmail, verifyPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Укажите email и пароль' }, { status: 400 })
    }

    const user = findUserByEmail(email)
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ ok: false, error: 'Неверный email или пароль' }, { status: 401 })
    }

    const token = createSession(user.id)

    const redirect =
      user.workspace_id === 'siberiya'
        ? '/support'
        : /^admin\d+$/.test(user.workspace_id)
          ? `/${user.workspace_id}`
          : '/login'

    const res = NextResponse.json({ ok: true, redirect })
    res.cookies.set('bh_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 2592000, path: '/' })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Ошибка сервера' }, { status: 500 })
  }
}
