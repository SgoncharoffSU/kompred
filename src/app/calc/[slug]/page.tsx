import { Yeseva_One } from 'next/font/google'
import { LogoWatermarkBackground } from '@/components/LogoWatermarkBackground'
import { ChatProvider } from './chat-provider'
import { HeaderContactIcons } from './header-contact-icons'
import { InclusionToggle } from './inclusion-toggle'
import { OfferContacts } from './offer-contacts'
import { PhotoGallery } from './photo-gallery'
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
  model_gallery_photos: { id: number; image_url: string; image_crop: string | null }[]
  model_id: string
  layout_name: string
  selected_options: SelectedOption[]
  account: string | null
  popup_group_ids: string[]
}

type ContactBlock = {
  id: string
  title?: string
  data: {
    phone?: string
    telegram?: string
    whatsapp?: string
    max?: string
    email?: string
    emails?: { label: string; email: string }[]
    address?: string
    requisites?: string
    note?: string
  }
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
      model_gallery_photos: Array.isArray(data.model_gallery_photos)
        ? data.model_gallery_photos.map((p: { id: number; image_url: string; image_crop: string | null }) => ({
            id: Number(p.id),
            image_url: normalizeUrl(p.image_url || ''),
            image_crop: p.image_crop || null,
          }))
        : [],
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
  const headerWhatsapp = contactBlocks.find((b) => b.data.whatsapp)?.data.whatsapp
  const headerMax = contactBlocks.find((b) => b.data.max)?.data.max
  const headerEmails = contactBlocks.reduce<{ label: string; email: string }[]>((acc, b) => {
    if (b.data.emails?.length) acc.push(...b.data.emails)
    else if (b.data.email) acc.push({ label: 'Email', email: b.data.email })
    return acc
  }, [])
  // edit=<slug> restores the full saved selection (options/qty/layout/choices) in the
  // configurator, not just the model — model= is kept as a fallback in case that restore
  // fetch fails for any reason (deleted calculation row, malformed snapshot, etc.).
  const editUrl = offer?.account
    ? `/cli${offer.account}?edit=${encodeURIComponent(offer.public_slug)}${offer.model_id ? `&model=${offer.model_id}` : ''}`
    : null
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
    <ChatProvider>
    <main className="relative min-h-screen bg-[#f2ece4] px-4 py-8 md:px-8">
      <LogoWatermarkBackground />
      <div className="mx-auto max-w-2xl space-y-4">

        {/* Brand mark — sticky so the TG/call icons stay reachable while scrolling through a
            long offer, print:static since a sticky position is meaningless on paper/PDF */}
        <div className="print:static sticky top-0 z-40 -mx-4 mb-2 flex items-center justify-between gap-2 border-b border-[#e0d5c9]/70 bg-[#f2ece4]/95 px-5 py-2.5 backdrop-blur-sm md:-mx-8 md:px-9">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-siberia.svg" alt={workspaceName || 'СК Сибирия'} className="h-10 w-auto" />
            <span className={`${brandFont.className} text-2xl leading-none tracking-wide text-[#0d5a52]`}>{workspaceName || 'СК СИБЕРИЯ'}</span>
          </div>
          <HeaderContactIcons
            telegramHref={headerTelegramHref}
            whatsapp={headerWhatsapp}
            maxHref={headerMax}
            emails={headerEmails}
            phone={headerPhone}
            wid={phpWorkspaceId}
            workspaceName={workspaceName}
          />
        </div>

        {/* Hero photo — a gallery (with prev/next arrows) once the model has extra photos
            beyond the main one, otherwise just the single photo as before. */}
        {offer.model_image_url && (
          <div className="print:break-inside-avoid relative overflow-hidden rounded-2xl shadow-card">
            <PhotoGallery
              photos={[
                { image_url: offer.model_image_url, crop: offer.model_offer_image_crop },
                ...offer.model_gallery_photos.map((p) => ({ image_url: p.image_url, crop: null })),
              ]}
              alt={offer.model_name}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-6 pb-6 pt-20">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Персональное предложение</div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {offer.model_name}
              </h1>
            </div>
          </div>
        )}

        {/* Hero card (title when no photo, or details) */}
        <div className="print:break-inside-avoid overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
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

        {/* Options list — grouped into one section per group_name (the backend already sorts
            options so a group's items are contiguous, so this is just a consecutive-run split,
            not a full re-sort) instead of a flat list with the group name repeated as small
            print under every single item. */}
        {offer.selected_options.length > 0 && (() => {
          const optionGroups: { name: string; items: typeof offer.selected_options }[] = []
          for (const item of offer.selected_options) {
            const current = optionGroups[optionGroups.length - 1]
            if (current && current.name === item.group_name) current.items.push(item)
            else optionGroups.push({ name: item.group_name, items: [item] })
          }
          return (
            <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
              <div className="border-b border-[#e0d5c9] px-6 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Опции</span>
              </div>
              <div className="divide-y divide-[#e0d5c9]">
                {optionGroups.map((group, gi) => (
                  <div key={gi}>
                    <div className="bg-[#f8f4f0] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-[#0d5a52]">{group.name}</div>
                    <div className="divide-y divide-[#e0d5c9]">
                      {group.items.map((item) => (
                        <div key={item.id} className="print:break-inside-avoid flex items-center gap-4 px-6 py-3.5">
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
                          </div>
                          <div className="ml-auto shrink-0 text-sm font-semibold text-[#b87524]">
                            {item.line_total > 0 ? '+' : ''}{formatPrice(item.line_total)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Total price block */}
        <div className="print:break-inside-avoid overflow-hidden rounded-2xl border border-[#0d5a52] bg-[#0d5a52] p-6 text-white shadow-[0_4px_24px_rgba(13,90,82,0.3)]">
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
            washed-out white-on-teal ones; hidden on the printed PDF since they aren't actionable there.
            flex-1 keeps all three evenly filling one row wherever there's room (this column tops
            out at max-w-2xl, so that's effectively "desktop"); flex-wrap is the fallback for
            narrow phones where three won't fit without crowding. */}
        <div className="print:hidden flex flex-wrap gap-2">
          <ShareButton title={`Персональное предложение — ${offer.model_name}`} className="flex-1 justify-center" />
          <PrintButton slug={offer.public_slug} className="flex-1 justify-center" />
          {editUrl && (
            <a
              href={editUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#0d5a52]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d5a52] shadow-card transition-all duration-200 hover:bg-[#f0f7f5] active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 9.5-9.5z" />
              </svg>
              Изменить конфигурацию
            </a>
          )}
        </div>

        {/* Contacts */}
        <OfferContacts
          telegramHref={headerTelegramHref}
          whatsapp={headerWhatsapp}
          maxHref={headerMax}
          emails={headerEmails}
          phone={headerPhone}
          wid={phpWorkspaceId}
          workspaceName={workspaceName}
          chatDelaySeconds={chatDelaySeconds}
          chatAnimations={chatAnimations}
          chatShowFrom={chatShowFrom}
          chatShowUntil={chatShowUntil}
        />

        {/* Base package breakdown — screen version is the collapsed InclusionToggle above;
            this is a print-only, always-expanded twin placed at the end of the document, since
            the contacts block above it is hidden from print (nothing there to interact with
            on paper). */}
        {inclusionSections.length > 0 && (
          <div className="hidden print:block overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
            <div className="border-b border-[#e0d5c9] px-6 py-3.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Что входит в базовую комплектацию</span>
            </div>
            <div className="divide-y divide-[#e0d5c9]">
              {inclusionSections.map((section) => (
                <div key={section.id} className="px-6 py-4">
                  <div className="text-sm font-semibold text-[#1a1612]">{section.name}</div>
                  <ul className="mt-2 space-y-1.5">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#7a6f66]">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#0d5a52]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
    </ChatProvider>
  )
}