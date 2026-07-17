'use client'

import { useEffect, useRef, useState } from 'react'

type ChatMessage = { id: number; from: 'client' | 'manager'; text: string; ts: number; status?: 'sending' | 'sent' | 'failed' }

const CLIENT_ID_KEY = 'bh_chat_client_id'
const GREETING_DISMISSED_KEY = 'bh_chat_greeting_dismissed'
const LAST_SEEN_PREFIX = 'bh_chat_last_seen_'

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

// Without this, "unread" was pure in-memory state — reloading the page (or just
// revisiting later) forgot that a manager reply had already been opened and read, so it
// came back marked unread every time, no matter how long ago it was actually answered.
function getLastSeenId(clientId: string): number {
  return Number(localStorage.getItem(LAST_SEEN_PREFIX + clientId) || '0')
}
function persistLastSeenId(clientId: string, id: number) {
  localStorage.setItem(LAST_SEEN_PREFIX + clientId, String(id))
}

// Business hours are configured in Moscow time regardless of the visitor's or the
// server's own timezone/clock — same class of bug as the offer page's date formatting
// (server runs on UTC, naive comparisons drift up to 3h), so this always reads the
// wall-clock time via the Europe/Moscow timezone explicitly rather than trusting
// Date's local getHours()/getMinutes().
function isWithinShowWindow(from?: string, until?: string): boolean {
  if (!from || !until) return true
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const nowMinutes = hh * 60 + mm
  const [fh, fm] = from.split(':').map(Number)
  const [uh, um] = until.split(':').map(Number)
  const fromMinutes = fh * 60 + (fm || 0)
  const untilMinutes = uh * 60 + (um || 0)
  if (fromMinutes <= untilMinutes) return nowMinutes >= fromMinutes && nowMinutes < untilMinutes
  return nowMinutes >= fromMinutes || nowMinutes < untilMinutes // overnight window, e.g. 21:00-09:00
}

function ChatBubbleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

export function SiteChatWidget({
  workspaceName,
  welcomeMessage,
  appearDelaySeconds = 8,
  animationsEnabled = true,
  showFrom,
  showUntil,
  open: openProp,
  onOpenChange,
  bottomClassName = 'bottom-4',
}: {
  workspaceName?: string | null
  welcomeMessage?: string | null
  appearDelaySeconds?: number
  animationsEnabled?: boolean
  showFrom?: string | null
  showUntil?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Lets a page lift the bubble above its own fixed/sticky bottom bar (e.g. a mobile CTA
  // footer) so the two don't overlap — defaults to the plain "bottom-4" used everywhere else.
  bottomClassName?: string
}) {
  const [withinWindow, setWithinWindow] = useState(() => isWithinShowWindow(showFrom || undefined, showUntil || undefined))
  const [delayElapsed, setDelayElapsed] = useState(appearDelaySeconds <= 0)
  const [openState, setOpenState] = useState(false)
  // Uncontrolled by default (client1's floating-only usage); the offer page controls it
  // externally so a "chat" icon in its contacts row can open the same panel.
  const open = openProp !== undefined ? openProp : openState
  const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? (value as (prev: boolean) => boolean)(open) : value
    onOpenChange?.(next)
    if (openProp === undefined) setOpenState(next)
  }
  const [showGreeting, setShowGreeting] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const [sending, setSending] = useState(false)
  const clientIdRef = useRef('')
  const lastIdRef = useRef(0)
  const lastSeenIdRef = useRef(0)
  const pollingRef = useRef(false)
  const sendingRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    clientIdRef.current = getClientId()
    lastSeenIdRef.current = getLastSeenId(clientIdRef.current)
  }, [])

  useEffect(() => {
    const check = () => setWithinWindow(isWithinShowWindow(showFrom || undefined, showUntil || undefined))
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [showFrom, showUntil])

  useEffect(() => {
    if (delayElapsed) return
    const t = setTimeout(() => setDelayElapsed(true), appearDelaySeconds * 1000)
    return () => clearTimeout(t)
  }, [delayElapsed, appearDelaySeconds])

  const visible = withinWindow && delayElapsed

  useEffect(() => {
    if (!visible || !welcomeMessage || !welcomeMessage.trim()) return
    if (localStorage.getItem(GREETING_DISMISSED_KEY)) return
    setShowGreeting(true)
  }, [visible, welcomeMessage])

  const dismissGreeting = () => {
    setShowGreeting(false)
    localStorage.setItem(GREETING_DISMISSED_KEY, '1')
  }

  const openFromGreeting = () => {
    dismissGreeting()
    setOpen(true)
    if (welcomeMessage && messages.length === 0) {
      setMessages([{ id: -1, from: 'manager', text: welcomeMessage, ts: Date.now() }])
    }
  }

  useEffect(() => {
    if (!visible) return
    const poll = async () => {
      // iOS Safari can delay/coalesce background timers so a slow in-flight request is
      // still pending when the next tick fires — without this guard both responses land
      // with the same "after" cursor and every message in that batch gets appended twice.
      if (!clientIdRef.current || pollingRef.current) return
      pollingRef.current = true
      try {
        const res = await fetch(`/api/site-chat/poll?clientId=${clientIdRef.current}&after=${lastIdRef.current}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.ok && data.messages?.length) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const fresh = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id))
            return fresh.length ? [...prev, ...fresh] : prev
          })
          lastIdRef.current = data.messages[data.messages.length - 1].id
          if (!openRef.current) {
            const newUnread = data.messages.filter((m: ChatMessage) => m.from === 'manager' && m.id > lastSeenIdRef.current).length
            if (newUnread > 0) setUnread((u) => u + newUnread)
          }
        }
      } catch {
        // transient network error — the next poll tick will retry
      } finally {
        pollingRef.current = false
      }
    }
    poll()
    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [visible])

  useEffect(() => {
    if (open) {
      setUnread(0)
      if (messages.length > 0) {
        const maxId = Math.max(...messages.map((m) => m.id))
        if (maxId > lastSeenIdRef.current) {
          lastSeenIdRef.current = maxId
          persistLastSeenId(clientIdRef.current, maxId)
        }
      }
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    }
  }, [open, messages])

  // Mobile browsers (seen with Yandex Browser) can silently fail this fetch — the previous
  // version swallowed the error and left the message looking "sent" with no way to tell it
  // never reached the manager. Now every message tracks its own delivery status so a failure
  // is visible and retryable instead of invisible.
  const deliver = async (id: number, text: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'sending' } : m)))
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const res = await fetch('/api/site-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientIdRef.current, name: workspaceName ? `Сайт: ${workspaceName}` : 'Сайт', text }),
        keepalive: true,
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json().catch(() => null)
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: res.ok && data?.ok ? 'sent' : 'failed' } : m)))
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'failed' } : m)))
    }
  }

  const send = async () => {
    const text = input.trim()
    // A ref, not just the `sending` state: iOS Safari can double-fire a form's submit event
    // (touch + synthesized click both triggering it) faster than React re-renders, so two
    // near-simultaneous calls here would both still read the stale `sending === false` and
    // both go through — a ref updates synchronously in the same tick, closing that gap.
    if (!text || sendingRef.current || !clientIdRef.current) return
    sendingRef.current = true
    setSending(true)
    setInput('')
    const id = -Date.now()
    setMessages((prev) => [...prev, { id, from: 'client', text, ts: Date.now(), status: 'sending' }])
    await deliver(id, text)
    setSending(false)
    sendingRef.current = false
  }

  const retry = (m: ChatMessage) => {
    deliver(m.id, m.text)
  }

  if (!visible) return null

  return (
    <div className={`print:hidden fixed ${bottomClassName} right-4 z-50 flex flex-col items-end ${animationsEnabled ? 'animate-slide-up' : ''}`}>
      {showGreeting && !open && (
        <div className="mb-3 flex max-w-[240px] items-start gap-2 rounded-2xl rounded-br-sm border border-[#e0d5c9] bg-white p-3 shadow-xl dark:border-[#38322a] dark:bg-[#252119] animate-fade-in">
          <button type="button" onClick={openFromGreeting} className="flex-1 text-left text-sm text-[#3a3128] dark:text-[#d5cfc7]">
            {welcomeMessage}
          </button>
          <button type="button" onClick={dismissGreeting} className="shrink-0 text-[#b0a499] hover:text-[#7a6f66] dark:text-[#6a5f57]">
            ✕
          </button>
        </div>
      )}
      {open && (
        <div className="relative mb-3">
          {/* Tail pointing down toward the bubble button, so the panel visibly "belongs" to
              it instead of just floating above — same reason the button no longer shifts
              left when this opens (both are anchored to the same right edge now). */}
          <div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-[#e0d5c9] bg-white dark:border-[#38322a] dark:bg-[#252119]" />
          <div className="flex h-96 w-80 flex-col overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-xl dark:border-[#38322a] dark:bg-[#252119]">
          <div className="flex items-center justify-between border-b border-[#e0d5c9] px-4 py-3 dark:border-[#38322a]">
            <span className="text-sm font-semibold text-[#0d5a52] dark:text-[#4db8ae]">Чат с менеджером</span>
            <button type="button" onClick={() => setOpen(false)} className="text-[#7a6f66] hover:text-[#3a3128] dark:text-[#9a8f87]">
              ✕
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="mt-8 text-center text-xs text-[#7a6f66] dark:text-[#9a8f87]">Напишите нам, и менеджер ответит здесь</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.from === 'client' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.from === 'client' ? 'bg-[#0d5a52] text-white' : 'bg-[#f2ece4] text-[#3a3128] dark:bg-[#1c1a16] dark:text-[#d5cfc7]'
                  } ${m.status === 'failed' ? 'opacity-60' : ''}`}
                >
                  {m.text}
                </div>
                {m.status === 'failed' && (
                  <button type="button" onClick={() => retry(m)} className="mt-0.5 text-[11px] font-medium text-red-500 hover:underline">
                    Не отправлено — повторить
                  </button>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-[#e0d5c9] p-2 dark:border-[#38322a]"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Сообщение…"
              className="flex-1 rounded-full border border-[#e0d5c9] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#0d5a52] dark:border-[#38322a] dark:text-[#d5cfc7]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5a52] text-white disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </form>
          </div>
        </div>
      )}
      <div className="group relative">
        {/* Hover-only cloud tooltip — hidden while the greeting bubble or the panel itself is
            already showing something in that same spot, so nothing doubles up. */}
        {!open && !showGreeting && (
          <div className="pointer-events-none absolute -top-2 right-0 z-10 w-52 -translate-y-full rounded-2xl rounded-br-sm border border-[#e0d5c9] bg-white p-3 text-sm text-[#3a3128] opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 dark:border-[#38322a] dark:bg-[#252119] dark:text-[#d5cfc7]">
            С удовольствием ответим на ваши вопросы
          </div>
        )}
        {animationsEnabled && !open && (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#0d5a52]/60 dark:bg-[#4db8ae]/60 animate-chat-ping" />
        )}
        <button
          type="button"
          onClick={() => {
            if (showGreeting) dismissGreeting()
            setOpen((o) => !o)
          }}
          title="Чат с менеджером"
          className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-[#0d5a52] text-white shadow-lg transition-transform hover:scale-105 ${
            animationsEnabled && !open ? 'animate-chat-bounce' : ''
          }`}
        >
          <ChatBubbleIcon />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
