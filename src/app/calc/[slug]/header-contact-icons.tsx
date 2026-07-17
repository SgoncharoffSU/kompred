'use client'

import { HeaderContactIcons as BaseHeaderContactIcons } from '@/components/HeaderContactIcons'
import { useChatContext } from './chat-provider'

// Size/shape only — HeaderContactIcons applies its own per-icon brand colors (Telegram
// blue, phone gold) on top of this.
const smallIconClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors'

export function HeaderContactIcons({
  telegramHref,
  whatsapp,
  maxHref,
  emails,
  phone,
  wid,
  workspaceName,
  iconClassName,
  menuDirection,
}: {
  telegramHref?: string | null
  whatsapp?: string | null
  maxHref?: string | null
  emails?: { label: string; email: string }[] | null
  phone?: string | null
  wid?: string | null
  workspaceName?: string | null
  iconClassName?: string
  menuDirection?: 'up' | 'down'
}) {
  const { setChatOpen } = useChatContext()

  const handleRequestCallback = async (callbackPhone: string) => {
    try {
      const url = `/api/php-proxy?action=request_callback${wid ? `&wid=${encodeURIComponent(wid)}` : ''}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: callbackPhone, workspace_name: workspaceName || undefined }),
      })
      if (!res.ok) return false
      const data = await res.json()
      return !!data?.ok
    } catch {
      return false
    }
  }

  return (
    <BaseHeaderContactIcons
      telegramHref={telegramHref}
      whatsapp={whatsapp}
      maxHref={maxHref}
      emails={emails}
      phone={phone}
      onRequestCallback={phone ? handleRequestCallback : undefined}
      onOpenChat={() => setChatOpen(true)}
      iconClassName={iconClassName ?? smallIconClass}
      menuDirection={menuDirection}
    />
  )
}
