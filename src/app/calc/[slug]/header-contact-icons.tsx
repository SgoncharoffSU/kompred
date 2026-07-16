'use client'

import { HeaderContactIcons as BaseHeaderContactIcons } from '@/components/HeaderContactIcons'

const smallIconClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52] transition-colors hover:bg-[#0d5a52] hover:text-white'

export function HeaderContactIcons({
  telegramHref,
  phone,
  wid,
  workspaceName,
  iconClassName,
}: {
  telegramHref?: string | null
  phone?: string | null
  wid?: string | null
  workspaceName?: string | null
  iconClassName?: string
}) {
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
      phone={phone}
      onRequestCallback={phone ? handleRequestCallback : undefined}
      iconClassName={smallIconClass}
    />
  )
}
