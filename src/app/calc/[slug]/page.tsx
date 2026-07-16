import type { ReactNode } from 'react'
import { Yeseva_One } from 'next/font/google'
import { CroppedHeroImage } from './cropped-hero-image'
import { HeaderContactIcons } from './header-contact-icons'
import { InclusionToggle } from './inclusion-toggle'
import { PrintButton } from './print-button'
import { ShareButton } from './share-button'
import { ZoomableImage } from './zoomable-image'

const brandFont = Yeseva_One({ subsets: ['cyrillic', 'latin'], weight: '400', display: 'swap' })

// This becomes an <img src> the visitor's own browser fetches directly, so it must resolve
// against the public site (nginx serves /uploads/ on the main domain) — never the internal
// loopback-only PHP port.
function normalizeUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

type SelectedOption = {
  id: string
  group_name: string
  name: string
  line_total: number
  qty: number
  length: number | null
  width: number | null
  unit: string
  image_url: string
}

type OfferData = {
  id: string
  public_slug: string
  total_price: number
  fixed_at: string
  model_name: string
  model_image_url: string
  model_offer_image_crop: { mode?: 'position' | 'crop'; x: number; y: number; w?: number; h?: number } | null
  model_id: string
  layout_name: string
  selected_options: SelectedOption[]
  account: string | null
  popup_group_ids: string[]
}

type ContactBlock = {
  id: string
  title?: string
  data: { phone?: string; telegram?: string; whatsapp?: string; email?: string; address?: string; note?: string }
}

type InclusionSection = {
  id: string
  name: string
  items: string[]
  model_ids?: string[] | null
}

type PopupBlock = {
  id: string
  type: string
  title: string
  data: { sections?: InclusionSection[] }
}

function sectionsForModel(sections: InclusionSection[], modelId: string): InclusionSection[] {
  return sections.filter((s) => !s.model_ids || s.model_ids.length === 0 || s.model_ids.includes(modelId))
}

async function getCalculation(slug: string): Promise<OfferData | null> {
  const phpApi = process.env.PHP_API_URL || 'http://127.0.0.1:8080/api/index.php'
  try {
    const res = await fetch(`${phpApi}?action=get_calculation&slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.ok) return null
    return {
      id: String(data.id),
      public_slug: data.public_slug,
      total_price: Number(data.total_price),
      fixed_at: data.fixed_at,
      model_name: data.model_name || 'Модель',
      model_image_url: normalizeUrl(data.model_image_url || ''),
      model_offer_image_crop: (() => {
        if (!data.model_offer_image_crop) return null
        try {
          const parsed = JSON.parse(data.model_offer_image_crop)
          return parsed && typeof parsed.x === 'number' ? parsed : null
        } catch {
          return null
        }
      })(),
      model_id: String(data.model_id ?? ''),
      layout_name: data.layout_name || '',
      selected_options: (data.selected_options || []).map(
        (o: { id: number; name: string; group_name: string; image_url?: string; line_total?: number; qty?: number; length?: number; width?: number; unit?: string }) => ({
          id: String(o.id),
          name: o.name,
          line_total: Number(o.line_total ?? 0),
          qty: Number(o.qty ?? 1),
          length: o.length ? Number(o.length) : null,
          width: o.width ? Number(o.width) : null,
          unit: o.unit || 'шт',
          group_name: o.group_name,
          image_url: normalizeUrl(o.image_url || ''),
        })
      ),
      account: data.account ? String(data.account) : null,
      popup_group_ids: Array.isArray(data.popup_group_ids) ? data.popup_group_ids.map(String) : [],
    }
  } catch {
    return null
  }
}

type WorkspaceInfo = {
  contactBlocks: ContactBlock[]
  workspaceName: string
  popupBlocks: PopupBlock[]
  phpWorkspaceId: string | null
  chatDelaySeconds: number
  chatAnimations: boolean
  chatShowFrom: string
  chatShowUntil: string
}

async function getWorkspaceInfo(account: string): Promise<WorkspaceInfo> {
  const empty: WorkspaceInfo = {
    contactBlocks: [],
    workspaceName: '',
    popupBlocks: [],
    phpWorkspaceId: null,
    chatDelaySeconds: 8,
    chatAnimations: true,
    chatShowFrom: '',
    chatShowUntil: '',
  }
  const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:8016'
  try {
    const res = await fetch(`${siteUrl}/api/workspace-lookup?account=${encodeURIComponent(account)}`, { cache: 'no-store' })
    if (!res.ok) return empty
    const data = await res.json()
    return {
      contactBlocks: Array.isArray(data.contact_blocks) ? data.contact_blocks : [],
      workspaceName: data.workspace_name || '',
      popupBlocks: Array.isArray(data.popup_blocks) ? data.popup_blocks : [],
      phpWorkspaceId: data.php_workspace_id ? String(data.php_workspace_id) : null,
      chatDelaySeconds: typeof data.chat_widget_delay_seconds === 'number' ? data.chat_widget_delay_seconds : 8,
      chatAnimations: typeof data.chat_widget_animations === 'boolean' ? data.chat_widget_animations : true,
      chatShowFrom: data.chat_widget_show_from || '',
      chatShowUntil: data.chat_widget_show_until || '',
    }
  } catch {
    return empty
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string) {
  // The server (and MySQL's NOW()) runs on UTC, 3 hours behind Moscow — without an explicit
  // timeZone here the date can roll over up to 3 hours late for Moscow-based visitors.
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  })
}

export default async function OfferPage({ params }: { params: { slug: string } }) {
  const offer = await getCalculation(params.slug)
  const workspaceInfo = offer?.account
    ? await getWorkspaceInfo(offer.account)
    : { contactBlocks: [], workspaceName: '', popupBlocks: [], phpWorkspaceId: null, chatDelaySeconds: 8, chatAnimations: true, chatShowFrom: '', chatShowUntil: '' }
  const { contactBlocks, workspaceName, popupBlocks, phpWorkspaceId, chatDelaySeconds, chatAnimations, chatShowFrom, chatShowUntil } = workspaceInfo
  const headerTelegram = contactBlocks.find((b) => b.data.telegram)?.data.telegram
  const headerTelegramHref = headerTelegram ? (headerTelegram.startsWith('http') ? headerTelegram : `https://t.me/${headerTelegram.replace(/^@/, '')}`) : null
  const headerPhone = contactBlocks.find((b) => b.data.phone)?.data.phone
  const editUrl = offer?.account ? `/cli${offer.account}${offer.model_id ? `?model=${offer.model_id}` : ''}` : null
  // A popup block can be duplicated and re-scoped to different models via the group's own
  // model_ids — only the block(s) actually allowed for this offer's model should render, or
  // duplicated blocks with identical content show up as repeated items.
  const inclusionSections = offer
    ? popupBlocks
        .filter((b) => b.type === 'inclusion' && offer.popup_group_ids.includes(b.id))
        .flatMap((b) => sectionsForModel(b.data.sections || [], offer.model_id))
    : []

  if (!offer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f2ece4] p-6">
        <div className="max-w-sm rounded-2xl border border-[#e0d5c9] bg-white p-10 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f2ece4] text-2xl">
            🔍
          </div>
          <h1 className="text-xl font-bold text-[#1a1612]">Предложение не найдено</h1>
          <p className="mt-2 text-sm text-[#7a6f66]">
            Проверьте ссылку или сформируйте новое предложение.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f2ece4] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Brand mark */}
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-siberia.svg" alt={workspaceName || 'СК Сибирия'} className="h-8 w-auto" />
            <span className={`${brandFont.className} text-xl leading-none tracking-wide text-[#0d5a52]`}>{workspaceName || 'СК СИБЕРИЯ'}</span>
          </div>
          <HeaderContactIcons telegramHref={headerTelegramHref} phone={headerPhone} wid={phpWorkspaceId} workspaceName={workspaceName} />
        </div>

        {/* Hero photo */}
        {offer.model_image_url && (
          <div className="relative overflow-hidden rounded-2xl shadow-card">
            <div className="aspect-video w-full">
              <CroppedHeroImage
                src={offer.model_image_url}
                crop={offer.model_offer_image_crop}
                alt={offer.model_name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-6 pb-6 pt-20">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Персональное предложение</div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {offer.model_name}
              </h1>
            </div>
          </div>
        )}

        {/* Hero card (title when no photo, or details) */}
        <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
          {!offer.model_image_url && (
            <div className="border-b border-[#e0d5c9] bg-[#f8f4f0] px-6 py-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">
                Персональное предложение
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1a1612] md:text-3xl">
                {offer.model_name}
              </h1>
            </div>
          )}
          <div className={`grid sm:divide-x divide-[#e0d5c9] ${offer.layout_name && offer.layout_name !== 'Планировка' ? 'sm:grid-cols-2' : ''}`}>
            {offer.layout_name && offer.layout_name !== 'Планировка' && (
              <div className="px-6 py-4">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Планировка</div>
                <div className="mt-1 font-semibold text-[#1a1612]">{offer.layout_name}</div>
              </div>
            )}
            <div className={`px-6 py-4 ${offer.layout_name && offer.layout_name !== 'Планировка' ? 'border-t border-[#e0d5c9] sm:border-t-0' : ''}`}>
              <div className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Дата расчёта</div>
              <div className="mt-1 font-semibold text-[#1a1612]">{formatDate(offer.fixed_at)}</div>
            </div>
          </div>
        </div>

        {/* Base package inclusions — collapsed by default, screen only (excluded from print/PDF) */}
        {inclusionSections.length > 0 && <InclusionToggle sections={inclusionSections} />}

        {/* Options list */}
        {offer.selected_options.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
            <div className="border-b border-[#e0d5c9] px-6 py-3.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">
                Состав комплектации
              </span>
            </div>
            <div className="divide-y divide-[#e0d5c9]">
              {offer.selected_options.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-3.5">
                  {item.image_url && <ZoomableImage src={item.image_url} alt={item.name} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#1a1612]">
                      {item.name}
                      {item.length && item.width
                        ? ` (${item.length}×${item.width} м)`
                        : item.length
                          ? ` (${item.length} м)`
                          : item.width
                            ? ` (${item.width} м)`
                            : item.qty > 1
                              ? ` × ${item.qty} ${item.unit}`
                              : ''}
                    </div>
                    <div className="text-xs text-[#7a6f66]">{item.group_name}</div>
                  </div>
                  <div className="ml-auto shrink-0 text-sm font-semibold text-[#b87524]">
                    {item.line_total > 0 ? '+' : ''}{formatPrice(item.line_total)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total price block */}
        <div className="overflow-hidden rounded-2xl border border-[#0d5a52] bg-[#0d5a52] p-6 text-white shadow-[0_4px_24px_rgba(13,90,82,0.3)]">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-60">
            Итоговая стоимость
          </div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
            {formatPrice(offer.total_price)}
          </div>
          <p className="mt-1 text-sm opacity-50">Фиксированная цена по данному предложению</p>
          {offer.selected_options.length === 0 && (
            <p className="mt-2 text-xs opacity-40">Базовая комплектация, без дополнительных опций</p>
          )}
        </div>

        {/* Actions — kept off the green price block so they read as normal buttons, not
            washed-out white-on-teal ones; hidden on the printed PDF since they aren't actionable there */}
        <div className="print:hidden flex flex-wrap gap-2">
          {hasContactInfo && (
            <a
              href="#contacts"
              className="inline-flex items-center gap-2 rounded-xl border border-[#0d5a52]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d5a52] shadow-card transition-all duration-200 hover:bg-[#f0f7f5] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 0111.39 19a19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              Связаться с нами
            </a>
          )}
          <ShareButton title={`Персональное предложение — ${offer.model_name}`} />
          <PrintButton />
          {editUrl && (
            <a
              href={editUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0d5a52]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d5a52] shadow-card transition-all duration-200 hover:bg-[#f0f7f5] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 9.5-9.5z" />
              </svg>
              Изменить конфигурацию
            </a>
          )}
        </div>

        {/* Contacts */}
        <div id="contacts" className="space-y-4 scroll-mt-6">
          {contactBlocks.map((block) => {
            const d = block.data
            const textLinks: { href: string; label: string }[] = []
            if (d.phone) textLinks.push({ href: `tel:${d.phone.replace(/\s/g, '')}`, label: d.phone })
            if (d.email) textLinks.push({ href: `mailto:${d.email}`, label: d.email })
            if (d.address) textLinks.push({ href: `https://yandex.ru/maps/?text=${encodeURIComponent(d.address)}`, label: d.address })

            const iconLinks: { href: string; label: string; icon: ReactNode }[] = []
            if (d.telegram)
              iconLinks.push({
                href: d.telegram.startsWith('http') ? d.telegram : `https://t.me/${d.telegram.replace(/^@/, '')}`,
                label: 'Telegram',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.286c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.935z" />
                  </svg>
                ),
              })
            if (d.whatsapp)
              iconLinks.push({
                href: `https://wa.me/${d.whatsapp.replace(/\D/g, '')}`,
                label: 'WhatsApp',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                ),
              })

            if (textLinks.length === 0 && iconLinks.length === 0) return null
            return (
              <div key={block.id} className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
                <div className="border-b border-[#e0d5c9] px-6 py-3.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">{block.title || 'Контакты'}</span>
                </div>
                <div className="divide-y divide-[#e0d5c9]">
                  {textLinks.map((link, i) => (
                    <a key={i} href={link.href} className="block px-6 py-3.5 text-sm font-medium text-[#0d5a52] hover:bg-[#f8f4f0]">
                      {link.label}
                    </a>
                  ))}
                  {iconLinks.length > 0 && (
                    <div className="flex items-center gap-2 px-6 py-3.5">
                      {iconLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.href}
                          title={link.label}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 text-[#0d5a52] transition-colors hover:bg-[#0d5a52] hover:text-white"
                        >
                          {link.icon}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}