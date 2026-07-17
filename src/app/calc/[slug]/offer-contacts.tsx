'use client'

import { useChatContext } from './chat-provider'
import { SiteChatWidget } from '@/components/SiteChatWidget'
import { HeaderContactIcons } from './header-contact-icons'

// Size/shape only — HeaderContactIcons applies its own brand colors (Telegram blue, phone
// gold, chat teal).
const iconSizeClass = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors'

const OFFER_CHAT_WELCOME =
  'Отлично! Вы собрали расчет на свою собственную баню.\nМожете поделиться расчетом с родными и близкими и сохранить ссылку для себя.\nЕсли возникнут вопросы, с удовольствием отвечу.'

export function OfferContacts({
  telegramHref,
  whatsapp,
  maxHref,
  emails,
  phone,
  wid,
  workspaceName,
  chatDelaySeconds,
  chatAnimations,
  chatShowFrom,
  chatShowUntil,
}: {
  telegramHref?: string | null
  whatsapp?: string | null
  maxHref?: string | null
  emails?: { label: string; email: string }[] | null
  phone?: string | null
  wid?: string | null
  workspaceName?: string | null
  chatDelaySeconds: number
  chatAnimations: boolean
  chatShowFrom: string
  chatShowUntil: string
}) {
  const { chatOpen, setChatOpen } = useChatContext()

  return (
    <>
      <div id="contacts" className="print:hidden scroll-mt-6 rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
        <div className="border-b border-[#e0d5c9] px-6 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Связаться с нами</span>
        </div>
        <div className="flex items-center gap-2 px-6 py-3.5">
          <HeaderContactIcons
            telegramHref={telegramHref}
            whatsapp={whatsapp}
            maxHref={maxHref}
            emails={emails}
            phone={phone}
            wid={wid}
            workspaceName={workspaceName}
            iconClassName={iconSizeClass}
            menuDirection="up"
          />
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
