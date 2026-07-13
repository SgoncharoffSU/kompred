'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeProvider'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push(data.redirect || '/login')
        router.refresh()
      } else {
        setError(data.error || 'Ошибка входа')
      }
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2ece4] dark:bg-[#1c1a16] flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-[#1a1612] dark:text-[#ede7de] tracking-tight">Вход в кабинет</h1>
          <p className="mt-2 text-sm text-[#7a6f66] dark:text-[#9a8f87]">Управление конфигуратором предложений</p>
        </div>

        <div className="bg-white dark:bg-[#252119] rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#7a6f66] dark:text-[#9a8f87] mb-1.5">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#1f1c16] px-3.5 py-2.5 text-sm text-[#1a1612] dark:text-[#ede7de] outline-none focus:border-[#0d5a52] focus:ring-2 focus:ring-[#0d5a52]/20 transition-all"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7a6f66] dark:text-[#9a8f87] mb-1.5">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#1f1c16] px-3.5 py-2.5 pr-10 text-sm text-[#1a1612] dark:text-[#ede7de] outline-none focus:border-[#0d5a52] focus:ring-2 focus:ring-[#0d5a52]/20 transition-all"
                  placeholder="Пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0a499] dark:text-[#5a5048] hover:text-[#0d5a52] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#0d5a52] py-2.5 text-sm font-bold text-white transition hover:bg-[#0a4840] disabled:opacity-50"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-[#7a6f66] dark:text-[#9a8f87]">
            Нет аккаунта?{' '}
            <a href="/register" className="font-semibold text-[#0d5a52] hover:underline">
              Зарегистрироваться
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
