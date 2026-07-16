'use client'

import { useState } from 'react'

function TelegramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.286c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.935z" />
    </svg>
  )
}

function PhoneIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

// Arrow pointing into the handset — a call arriving, i.e. "we'll call you back".
function PhoneIncomingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 2 16 8 22 8" />
      <line x1="23" y1="1" x2="16" y2="8" />
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

const iconButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 dark:bg-[#0d5a52]/20 text-[#0d5a52] dark:text-[#4db8ae] transition-colors hover:bg-[#0d5a52] hover:text-white'

// A soft, slow ring pulsing outward — draws a little attention to the contact icons
// without being an alarm. Purely decorative, so it sits behind the button and ignores clicks.
// The delay staggers the two icons so they take turns instead of pulsing in unison.
function PulseRing({ active, delay }: { active: boolean; delay?: string }) {
  if (!active) return null
  return (
    <span
      className="pointer-events-none absolute inset-0 rounded-full bg-[#0d5a52]/50 dark:bg-[#4db8ae]/50 animate-soft-ping"
      style={delay ? { animationDelay: delay } : undefined}
    />
  )
}

export function HeaderContactIcons({
  telegramHref,
  phone,
  onRequestCallback,
  iconClassName,
}: {
  telegramHref?: string | null
  phone?: string | null
  onRequestCallback?: (phone: string) => Promise<boolean>
  iconClassName?: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [callbackPhone, setCallbackPhone] = useState(phone || '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const closeMenu = () => {
    setMenuOpen(false)
    setShowForm(false)
    setStatus('idle')
  }

  const btnClass = iconClassName || iconButtonClass

  return (
    <div className="flex items-center gap-2">
      {telegramHref && (
        <div className="relative">
          <PulseRing active />
          <a href={telegramHref} target="_blank" rel="noreferrer" title="Написать в Telegram" className={`relative ${btnClass}`}>
            <TelegramIcon />
          </a>
        </div>
      )}
      {phone && (
        <div className="relative">
          <PulseRing active={!menuOpen} delay="1.3s" />
          <button type="button" title="Телефон" onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))} className={`relative ${btnClass}`}>
            <PhoneIcon />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeMenu} />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#e0d5c9] bg-white shadow-lg dark:border-[#38322a] dark:bg-[#252119]">
                {status === 'sent' ? (
                  <div className="p-4 text-sm text-[#3a3128] dark:text-[#d5cfc7]">Заявка отправлена, мы вам перезвоним!</div>
                ) : !showForm ? (
                  <div className="flex flex-col gap-0.5 p-1.5">
                    <a
                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#3a3128] hover:bg-[#0d5a52]/10 dark:text-[#d5cfc7]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52] dark:bg-[#0d5a52]/20 dark:text-[#4db8ae]">
                        <PhoneIcon size={14} />
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="text-sm font-medium">Позвонить</span>
                        <span className="truncate text-xs text-[#7a6f66] dark:text-[#9a8f87]">{phone}</span>
                      </span>
                    </a>
                    {onRequestCallback && (
                      <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[#3a3128] hover:bg-[#0d5a52]/10 dark:text-[#d5cfc7]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52] dark:bg-[#0d5a52]/20 dark:text-[#4db8ae]">
                          <PhoneIncomingIcon />
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="text-sm font-medium">Перезвоните мне</span>
                          <span className="text-xs text-[#7a6f66] dark:text-[#9a8f87]">Оставить номер для звонка</span>
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!onRequestCallback) return
                      setStatus('sending')
                      const ok = await onRequestCallback(callbackPhone)
                      setStatus(ok ? 'sent' : 'error')
                    }}
                    className="flex flex-col gap-2 p-3"
                  >
                    <label className="text-xs font-medium text-[#7a6f66] dark:text-[#9a8f87]">Ваш телефон</label>
                    <input
                      value={callbackPhone}
                      onChange={(e) => setCallbackPhone(e.target.value)}
                      placeholder="+7 900 000-00-00"
                      required
                      className="rounded-lg border border-[#e0d5c9] bg-transparent px-2.5 py-1.5 text-sm text-[#3a3128] outline-none focus:border-[#0d5a52] dark:border-[#38322a] dark:text-[#d5cfc7]"
                    />
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="rounded-lg bg-[#0d5a52] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a453f] disabled:opacity-60"
                    >
                      {status === 'sending' ? 'Отправка…' : 'Отправить'}
                    </button>
                    {status === 'error' && <div className="text-xs text-red-500">Не удалось отправить, попробуйте ещё раз</div>}
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
