'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.286c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.935z" />
    </svg>
  )
}

function WhatsappIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

// Max doesn't have a settled public brand glyph yet — a plain speech-bubble keeps the row
// legible (the "Max" label alongside it carries the identification) rather than guessing at
// an icon that might not match the real one.
function MaxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function MailIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

// A round speech-bubble (not an envelope) for the "Написать нам" trigger — an envelope read
// as "email only" to real users even though the menu behind it also has Telegram/WhatsApp/Max.
function MessageIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <line x1="8" y1="10.5" x2="16" y2="10.5" />
      <line x1="8" y1="14" x2="13" y2="14" />
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

// "Написать нам" isn't tied to one brand, so it gets its own neutral color (violet) —
// distinct from Telegram blue/WhatsApp green/phone gold used inside its own dropdown rows.
// iconClassName (from callers) only ever carries size/shape, never color, so it composes
// with these color classes instead of replacing them.
const defaultSizeClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors'
// "[@media(hover:hover)]:" guards the solid hover look so it only applies on real mouse
// pointers — plain "hover:" also matches touch taps, and mobile browsers keep a tapped
// element's :hover state "stuck" until a later tap elsewhere, which read as the icon staying
// visually active after its menu had already closed.
const messageColorClass = 'bg-[#6c5ce7]/10 dark:bg-[#6c5ce7]/20 text-[#6c5ce7] [@media(hover:hover)]:hover:bg-[#6c5ce7] [@media(hover:hover)]:hover:text-white'
const phoneColorClass = 'bg-[#b87524]/10 dark:bg-[#b87524]/20 text-[#b87524] [@media(hover:hover)]:hover:bg-[#b87524] [@media(hover:hover)]:hover:text-white'

// A soft, slow ring pulsing outward — draws a little attention to the contact icons
// without being an alarm. Purely decorative, so it sits behind the button and ignores clicks.
// The delay staggers icons so they take turns instead of pulsing in unison. Exported so a
// page-added chat button can join the same rotation (see client1's header).
export function PulseRing({ active, color, delay }: { active: boolean; color: string; delay?: string }) {
  if (!active) return null
  return <span className={`pointer-events-none absolute inset-0 rounded-full ${color} animate-soft-ping`} style={delay ? { animationDelay: delay } : undefined} />
}

export function HeaderContactIcons({
  telegramHref,
  whatsapp,
  maxHref,
  emails,
  phone,
  onRequestCallback,
  onOpenChat,
  iconClassName,
  menuDirection = 'down',
}: {
  telegramHref?: string | null
  whatsapp?: string | null
  maxHref?: string | null
  emails?: { label: string; email: string }[] | null
  phone?: string | null
  onRequestCallback?: (phone: string) => Promise<boolean>
  // When provided, "Чат" appears as the first row in the "Написать нам" menu instead of
  // being its own separate icon — one less thing competing for space in the header.
  onOpenChat?: () => void
  iconClassName?: string
  // 'up' for icons that sit near the bottom of the page (e.g. a "Связаться с нами" card) —
  // otherwise the dropdown opens downward off the edge of the screen and is invisible
  // without scrolling.
  menuDirection?: 'up' | 'down'
}) {
  const [messageMenuOpen, setMessageMenuOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [callbackPhone, setCallbackPhone] = useState(phone || '')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Panels are portaled straight into document.body and positioned in JS (fixed + measured
  // pixel coords), for two reasons: (1) this component can sit anywhere in a page's header
  // row, so a CSS-only "absolute right-0" anchor could push the panel past the viewport edge
  // on narrow screens; (2) "position: fixed" is silently broken by ANY ancestor with a
  // transform/filter/backdrop-blur (common on sticky headers) — the fixed element ends up
  // positioned relative to that ancestor instead of the real viewport, which is what caused
  // the panel to render far from its icon. Portaling to body sidesteps that entirely.
  const messageIconRef = useRef<HTMLDivElement>(null)
  const phoneIconRef = useRef<HTMLDivElement>(null)
  const [messageGeom, setMessageGeom] = useState<{ wrapperStyle: React.CSSProperties; tailLeft: number } | null>(null)
  const [phoneGeom, setPhoneGeom] = useState<{ wrapperStyle: React.CSSProperties; tailLeft: number } | null>(null)

  const closeMenu = () => {
    setMenuOpen(false)
    setShowForm(false)
    setStatus('idle')
  }

  // Hover-driven, with a short close delay so moving the cursor from the button down into
  // the menu (through the small gap between them) doesn't flicker it shut; click still works
  // too, since touch devices have no real hover.
  const messageCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openMessageMenu = () => {
    if (messageCloseTimeoutRef.current) clearTimeout(messageCloseTimeoutRef.current)
    setMessageMenuOpen(true)
  }
  const scheduleCloseMessageMenu = () => {
    messageCloseTimeoutRef.current = setTimeout(() => setMessageMenuOpen(false), 200)
  }

  const phoneCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openPhoneMenu = () => {
    if (phoneCloseTimeoutRef.current) clearTimeout(phoneCloseTimeoutRef.current)
    setMenuOpen(true)
  }
  const scheduleClosePhoneMenu = () => {
    phoneCloseTimeoutRef.current = setTimeout(() => closeMenu(), 200)
  }

  // On touch devices, a single tap fires a synthetic mouseenter (which opens the menu via
  // the handlers above) immediately followed by a click — so the click needs to recognize
  // "this is the tail end of the tap that just opened it" and leave the menu alone, rather
  // than treat every click as an independent toggle. The flag is cleared shortly after
  // mouseenter so it only protects that one immediate click; any click after the window
  // closes is a genuine, separate tap and should toggle normally (so tapping the icon again
  // while its menu is already open closes it).
  const messageJustOpenedRef = useRef(false)
  const messageJustOpenedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleMessageIconMouseEnter = () => {
    messageJustOpenedRef.current = true
    if (messageJustOpenedTimeoutRef.current) clearTimeout(messageJustOpenedTimeoutRef.current)
    messageJustOpenedTimeoutRef.current = setTimeout(() => {
      messageJustOpenedRef.current = false
    }, 400)
    openMessageMenu()
  }
  const handleMessageIconClick = () => {
    if (messageJustOpenedRef.current) {
      messageJustOpenedRef.current = false
      return
    }
    setMessageMenuOpen((v) => !v)
  }

  const phoneJustOpenedRef = useRef(false)
  const phoneJustOpenedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handlePhoneIconMouseEnter = () => {
    phoneJustOpenedRef.current = true
    if (phoneJustOpenedTimeoutRef.current) clearTimeout(phoneJustOpenedTimeoutRef.current)
    phoneJustOpenedTimeoutRef.current = setTimeout(() => {
      phoneJustOpenedRef.current = false
    }, 400)
    openPhoneMenu()
  }
  const handlePhoneIconClick = () => {
    if (phoneJustOpenedRef.current) {
      phoneJustOpenedRef.current = false
      return
    }
    if (menuOpen) {
      closeMenu()
    } else {
      setMenuOpen(true)
    }
  }

  const sizeClass = iconClassName || defaultSizeClass
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : null
  const hasMessageChannels = !!(onOpenChat || telegramHref || whatsappHref || maxHref || (emails && emails.length > 0))

  const PANEL_WIDTH = 256
  const VIEWPORT_MARGIN = 16
  const PANEL_GAP = 12
  const TAIL_SIZE = 16

  // A tail (rotated square) bridges the panel to its trigger icon, same visual language as
  // the chat widget's speech-bubble tail — its horizontal position tracks the icon's own
  // center so it still points at the icon even when the panel itself had to shift to stay
  // on-screen.
  const computeGeometry = (iconEl: HTMLDivElement | null): { wrapperStyle: React.CSSProperties; tailLeft: number } | null => {
    if (!iconEl) return null
    const rect = iconEl.getBoundingClientRect()
    const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2)
    let left = rect.right - width
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN))
    const iconCenterX = rect.left + rect.width / 2
    let tailLeft = iconCenterX - left - TAIL_SIZE / 2
    tailLeft = Math.max(14, Math.min(tailLeft, width - 14 - TAIL_SIZE))
    const wrapperStyle: React.CSSProperties = { position: 'fixed', left, width }
    if (menuDirection === 'up') {
      wrapperStyle.bottom = window.innerHeight - rect.top + PANEL_GAP
    } else {
      wrapperStyle.top = rect.bottom + PANEL_GAP
    }
    return { wrapperStyle, tailLeft }
  }

  // Recompute (and keep recomputing on resize) whenever a panel opens, so the fix also holds
  // when the user resizes the browser window with the menu already open.
  useLayoutEffect(() => {
    if (!messageMenuOpen) return
    const update = () => setMessageGeom(computeGeometry(messageIconRef.current))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageMenuOpen, menuDirection])

  useLayoutEffect(() => {
    if (!menuOpen) return
    const update = () => setPhoneGeom(computeGeometry(phoneIconRef.current))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, menuDirection])

  const tailPositionClass =
    menuDirection === 'up'
      ? 'absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-[#e0d5c9] bg-white dark:border-[#38322a] dark:bg-[#252119]'
      : 'absolute -top-2 h-4 w-4 rotate-45 border-t border-l border-[#e0d5c9] bg-white dark:border-[#38322a] dark:bg-[#252119]'

  return (
    <div className="flex items-center gap-2">
      {hasMessageChannels && (
        <div
          ref={messageIconRef}
          className="relative z-10"
          onMouseEnter={handleMessageIconMouseEnter}
          onMouseLeave={scheduleCloseMessageMenu}
        >
          <PulseRing active={!messageMenuOpen} color="bg-[#6c5ce7]/50" />
          <button
            type="button"
            title="Написать нам"
            // A click right after the hover that just opened it (same tap on touch) is
            // swallowed — see handleMessageIconClick — so a genuine, separate click toggles
            // (closes it if it's already open).
            onClick={handleMessageIconClick}
            className={`relative ${sizeClass} ${messageColorClass}`}
          >
            <MessageIcon size={15} />
          </button>
        </div>
      )}
      {phone && (
        <div
          ref={phoneIconRef}
          className="relative z-10"
          onMouseEnter={handlePhoneIconMouseEnter}
          onMouseLeave={scheduleClosePhoneMenu}
        >
          <PulseRing active={!menuOpen} color="bg-[#b87524]/50" delay="0.87s" />
          {/* See handleMessageIconClick's comment above — same pattern here. */}
          <button type="button" title="Телефон" onClick={handlePhoneIconClick} className={`relative ${sizeClass} ${phoneColorClass}`}>
            <PhoneIcon />
          </button>
        </div>
      )}

      {messageMenuOpen && messageGeom && createPortal(
        <>
          {/* Lower z-index than the icon (z-10) above, so opening the menu can't cover the
              trigger and steal its pointer target — that was causing a spurious mouseleave
              the instant the panel appeared, closing it again immediately. */}
          <div className="fixed inset-0 z-0" onClick={() => setMessageMenuOpen(false)} />
          <div
            style={messageGeom.wrapperStyle}
            className="z-50"
            onMouseEnter={openMessageMenu}
            onMouseLeave={scheduleCloseMessageMenu}
          >
            <div className={tailPositionClass} style={{ left: messageGeom.tailLeft }} />
            <div className="relative overflow-hidden rounded-xl border border-[#e0d5c9] bg-white shadow-lg dark:border-[#38322a] dark:bg-[#252119]">
            <div className="flex flex-col gap-0.5 p-1.5" onClick={() => setMessageMenuOpen(false)}>
              {onOpenChat && (
                <button
                  type="button"
                  onClick={onOpenChat}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[#3a3128] hover:bg-[#0d5a52]/10 dark:text-[#d5cfc7]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52] dark:bg-[#0d5a52]/20 dark:text-[#4db8ae]">
                    <ChatBubbleIcon />
                  </span>
                  <span className="text-sm font-medium">Чат с менеджером</span>
                </button>
              )}
              {telegramHref && (
                <a href={telegramHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#3a3128] hover:bg-[#229ED9]/10 dark:text-[#d5cfc7]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#229ED9]/10 text-[#229ED9]">
                    <TelegramIcon />
                  </span>
                  <span className="text-sm font-medium">Telegram</span>
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#3a3128] hover:bg-[#25D366]/10 dark:text-[#d5cfc7]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                    <WhatsappIcon />
                  </span>
                  <span className="text-sm font-medium">WhatsApp</span>
                </a>
              )}
              {maxHref && (
                <a href={maxHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#3a3128] hover:bg-[#6c5ce7]/10 dark:text-[#d5cfc7]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7]">
                    <MaxIcon />
                  </span>
                  <span className="text-sm font-medium">Max</span>
                </a>
              )}
              {emails?.map((e, i) => (
                <a key={i} href={`mailto:${e.email}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#3a3128] hover:bg-[#0d5a52]/10 dark:text-[#d5cfc7]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52]">
                    <MailIcon size={14} />
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="text-sm font-medium">{e.label}</span>
                    <span className="truncate text-xs text-[#7a6f66] dark:text-[#9a8f87]">{e.email}</span>
                  </span>
                </a>
              ))}
            </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {menuOpen && phoneGeom && createPortal(
        <>
          <div className="fixed inset-0 z-0" onClick={closeMenu} />
          <div
            style={phoneGeom.wrapperStyle}
            className="z-50"
            onMouseEnter={openPhoneMenu}
            onMouseLeave={scheduleClosePhoneMenu}
          >
            <div className={tailPositionClass} style={{ left: phoneGeom.tailLeft }} />
            <div className="relative overflow-hidden rounded-xl border border-[#e0d5c9] bg-white shadow-lg dark:border-[#38322a] dark:bg-[#252119]">
            {status === 'sent' ? (
              <div className="p-4 text-sm text-[#3a3128] dark:text-[#d5cfc7]">Заявка отправлена, мы вам перезвоним!</div>
            ) : !showForm ? (
              <div className="flex flex-col gap-0.5 p-1.5">
                <a
                  href={`tel:${phone?.replace(/[^\d+]/g, '')}`}
                  onClick={closeMenu}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#3a3128] hover:bg-[#b87524]/10 dark:text-[#d5cfc7]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b87524]/10 text-[#b87524] dark:bg-[#b87524]/20">
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
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[#3a3128] hover:bg-[#b87524]/10 dark:text-[#d5cfc7]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b87524]/10 text-[#b87524] dark:bg-[#b87524]/20">
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
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
