'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeProvider'

interface WorkspaceRow {
  id: string
  name: string
  php_workspace_id: number
  use_php: boolean
  account_num: string | null
  users: string[]
  stats: { models: number; groups: number; options: number }
}

function StatBadge({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex flex-col items-center px-3 py-1.5 rounded-xl bg-[#f2ece4] dark:bg-[#2e2820] min-w-[56px]">
      <span className="text-base font-bold text-[#1a1612] dark:text-[#ede7de] leading-none">{n}</span>
      <span className="text-[10px] text-[#7a6f66] dark:text-[#9a8f87] leading-none mt-0.5">{label}</span>
    </span>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#b0a499] dark:text-[#5a5048]">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 1h3v3M11 1L6.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SupportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<{ email: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUser(d.user)
      })

    fetch('/api/support')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setWorkspaces(d.workspaces)
        } else {
          setError(d.error || 'Ошибка доступа')
        }
      })
      .catch(() => setError('Ошибка сети'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = workspaces.filter((w) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      w.id.toLowerCase().includes(q) ||
      w.name.toLowerCase().includes(q) ||
      (w.account_num || '').includes(q) ||
      w.users.some((u) => u.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2ece4] dark:bg-[#1c1a16] flex items-center justify-center">
        <div className="text-[#7a6f66] dark:text-[#9a8f87] text-sm">Загрузка…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f2ece4] dark:bg-[#1c1a16] flex items-center justify-center">
        <div className="bg-white dark:bg-[#252119] rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] p-8 text-center">
          <div className="text-red-600 dark:text-red-400 font-semibold mb-2">{error}</div>
          <a href="/login" className="text-sm text-[#0d5a52] hover:underline">
            Войти
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2ece4] dark:bg-[#1c1a16]">
      <header className="bg-[#0d5a52] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Поддержка / Воркспейсы</h1>
          <p className="text-xs text-[#a3c9c5] mt-0.5">{workspaces.length} клиентов</p>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user && <span className="text-xs text-[#a3c9c5]">{user.email}</span>}
          <button
            onClick={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/login'))}
            className="text-xs text-[#a3c9c5] hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по ID, номеру аккаунта, email…"
            className="w-full rounded-xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] pl-9 pr-4 py-2.5 text-sm text-[#1a1612] dark:text-[#ede7de] outline-none focus:border-[#0d5a52] focus:ring-2 focus:ring-[#0d5a52]/20 transition-all placeholder:text-[#b0a499] dark:placeholder:text-[#5a5048]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0a499] dark:text-[#5a5048] hover:text-[#1a1612] dark:hover:text-[#ede7de] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {search && (
          <p className="text-xs text-[#7a6f66] dark:text-[#9a8f87] mb-4">
            Найдено: {filtered.length} из {workspaces.length}
          </p>
        )}

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#b0a499] dark:text-[#5a5048] text-sm">Ничего не найдено</div>
          )}
          {filtered.map((w) => (
            <div
              key={w.id}
              className="bg-white dark:bg-[#252119] rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[#1a1612] dark:text-[#ede7de] text-sm">{w.name}</span>
                  {w.account_num && (
                    <span className="text-xs bg-[#f2ece4] dark:bg-[#2e2820] text-[#7a6f66] dark:text-[#9a8f87] px-2 py-0.5 rounded-lg font-mono">
                      #{w.account_num}
                    </span>
                  )}
                  {w.use_php ? (
                    <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-lg">
                      PHP
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-50 dark:bg-gray-900/40 text-gray-400 border border-gray-100 dark:border-gray-800 px-2 py-0.5 rounded-lg">
                      no PHP
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {w.users.map((email) => (
                    <div key={email} className="text-xs text-[#7a6f66] dark:text-[#9a8f87]">
                      {email}
                    </div>
                  ))}
                </div>
                <div className="mt-1 text-[10px] text-[#b0a499] dark:text-[#5a5048] font-mono">{w.id}</div>
              </div>

              {w.use_php && w.php_workspace_id > 0 && (
                <div className="flex gap-2">
                  <StatBadge n={w.stats.models} label="моделей" />
                  <StatBadge n={w.stats.groups} label="групп" />
                  <StatBadge n={w.stats.options} label="опций" />
                </div>
              )}

              <div className="flex gap-2 flex-shrink-0">
                {w.account_num && (
                  <>
                    <a
                      href={`/admin${w.account_num}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d5a52] text-white text-xs font-semibold hover:bg-[#0a4840] transition-colors"
                    >
                      Админка <OpenIcon />
                    </a>
                    <a
                      href={`/cli${w.account_num}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#2e2820] border border-[#e0d5c9] dark:border-[#38322a] text-[#1a1612] dark:text-[#ede7de] text-xs font-semibold hover:bg-[#f2ece4] dark:hover:bg-[#38322a] transition-colors"
                    >
                      Клиент <OpenIcon />
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
