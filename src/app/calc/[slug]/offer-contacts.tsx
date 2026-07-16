'use client'

import { useState } from 'react'
import { SiteChatWidget } from '@/components/SiteChatWidget'
import { HeaderContactIcons } from './header-contact-icons'

const iconClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52] transition-colors hover:bg-[#0d5a52] hover:text-white'

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

const OFFER_CHAT_WELCOME =
  'Отлично! Вы собрали расчет на свою собственную баню.\nМожете поделиться расчетом с родными и близкими и сохранить ссылку для себя.\nЕсли возникнут вопросы, с удовольствием отвечу.'

export function OfferContacts({
  telegramHref,
  phone,
  wid,
  workspaceName,
  chatDelaySeconds,
  chatAnimations,
  chatShowFrom,
  chatShowUntil,
}: {
  telegramHref?: string | null
  phone?: string | null
  wid?: string | null
  workspaceName?: string | null
  chatDelaySeconds: number
  chatAnimations: boolean
  chatShowFrom: string
  chatShowUntil: string
}) {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <>
      <div id="contacts" className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
        <div className="border-b border-[#e0d5c9] px-6 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Связаться с нами</span>
        </div>
        <div className="flex items-center gap-2 px-6 py-3.5">
          <HeaderContactIcons telegramHref={telegramHref} phone={phone} wid={wid} workspaceName={workspaceName} iconClassName={iconClass} />
          <button type="button" title="Чат с менеджером" onClick={() => setChatOpen(true)} className={iconClass}>
            <ChatIcon />
          </button>
        </div>
      </div>
      <SiteChatWidget
        workspaceName={workspaceName}
        welcomeMessage={OFFER_CHAT_WELCOME}
        appearDelaySeconds={chatDelaySeconds}
        animationsEnabled={chatAnimations}
        showFrom={chatShowFrom}
        showUntil={chatShowUntil}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </>
  )
}
