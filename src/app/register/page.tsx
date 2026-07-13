'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isInvite = !!searchParams.get('invite')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, invite_code: inviteCode || undefined }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(data.error || 'Ошибка регистрации')
      }
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2ece4] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[#1a1612] tracking-tight">
            {isInvite ? 'Присоединение к команде' : 'Регистрация'}
          </h1>
          <p className="mt-2 text-sm text-[#7a6f66]">
            {isInvite ? 'Вы получили приглашение к сотрудничеству' : 'Создайте аккаунт для доступа к конфигуратору'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e0d5c9] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#7a6f66] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-[#e0d5c9] px-3.5 py-2.5 text-sm text-[#1a1612] outline-none focus:border-[#0d5a52] focus:ring-2 focus:ring-[#0d5a52]/20 transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7a6f66] mb-1.5">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-[#e0d5c9] px-3.5 py-2.5 text-sm text-[#1a1612] outline-none focus:border-[#0d5a52] focus:ring-2 focus:ring-[#0d5a52]/20 transition-all"
                placeholder="Минимум 6 символов"
              />
            </div>

            {!isInvite && (
              <div>
                <label className="block text-xs font-semibold text-[#7a6f66] mb-1.5">
                  Код приглашения <span className="font-normal text-[#b0a499]">(опционально)</span>
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full rounded-xl border border-[#e0d5c9] px-3.5 py-2.5 text-sm text-[#1a1612] outline-none focus:border-[#0d5a52] focus:ring-2 focus:ring-[#0d5a52]/20 transition-all font-mono"
                  placeholder="XXXXXXXX"
                />
              </div>
            )}

            {isInvite && (
              <div className="rounded-xl bg-[#f0f7f5] border border-[#0d5a52]/20 px-3.5 py-2.5 text-xs text-[#0d5a52]">
                Код приглашения подставлен и не требует ручного ввода
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0d5a52] py-2.5 text-sm font-bold text-white transition hover:bg-[#0a4840] disabled:opacity-50"
            >
              {loading ? 'Идёт регистрация' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[#7a6f66]">
            Уже есть аккаунт?{' '}
            <a href="/login" className="font-semibold text-[#0d5a52] hover:underline">
              Войти
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
