import { PrintButton } from './print-button'

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
  model_id: string
  layout_name: string
  selected_options: SelectedOption[]
  account: string | null
}

type ContactBlock = {
  id: string
  title?: string
  data: { phone?: string; telegram?: string; whatsapp?: string; email?: string; address?: string; note?: string }
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
    }
  } catch {
    return null
  }
}

async function getContactBlocks(account: string): Promise<ContactBlock[]> {
  const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:8016'
  try {
    const res = await fetch(`${siteUrl}/api/workspace-lookup?account=${encodeURIComponent(account)}`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data.contact_blocks) ? data.contact_blocks : []
  } catch {
    return []
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
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function OfferPage({ params }: { params: { slug: string } }) {
  const offer = await getCalculation(params.slug)
  const contactBlocks = offer?.account ? await getContactBlocks(offer.account) : []
  const editUrl = offer?.account ? `/cli${offer.account}${offer.model_id ? `?model=${offer.model_id}` : ''}` : null

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
        <div className="mb-2 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d5a52] text-base">
            🛁
          </div>
          <span className="text-sm font-bold text-[#1a1612]">Баня-конфигуратор</span>
        </div>

        {/* Hero photo */}
        {offer.model_image_url && (
          <div className="relative overflow-hidden rounded-2xl shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={offer.model_image_url}
              alt={offer.model_name}
              className="aspect-video w-full object-cover"
            />
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
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  )}
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
          <div className="mt-5 flex flex-wrap gap-2">
            <PrintButton />
            {editUrl && (
              <a
                href={editUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.5-9.5a2.121 2.121 0 013 3L12 16l-4 1 1-4 9.5-9.5z" />
                </svg>
                Изменить конфигурацию
              </a>
            )}
          </div>
        </div>

        {/* Contacts */}
        {contactBlocks.map((block) => {
          const d = block.data
          const links: { href: string; label: string }[] = []
          if (d.phone) links.push({ href: `tel:${d.phone.replace(/\s/g, '')}`, label: d.phone })
          if (d.telegram) links.push({ href: d.telegram.startsWith('http') ? d.telegram : `https://t.me/${d.telegram.replace(/^@/, '')}`, label: d.telegram })
          if (d.whatsapp) links.push({ href: `https://wa.me/${d.whatsapp.replace(/\D/g, '')}`, label: d.whatsapp })
          if (d.email) links.push({ href: `mailto:${d.email}`, label: d.email })
          if (d.address) links.push({ href: `https://yandex.ru/maps/?text=${encodeURIComponent(d.address)}`, label: d.address })
          if (links.length === 0) return null
          return (
            <div key={block.id} className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
              <div className="border-b border-[#e0d5c9] px-6 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">{block.title || 'Контакты'}</span>
              </div>
              <div className="divide-y divide-[#e0d5c9]">
                {links.map((link, i) => (
                  <a key={i} href={link.href} className="block px-6 py-3.5 text-sm font-medium text-[#0d5a52] hover:bg-[#f8f4f0]">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )
        })}

      </div>
    </main>
  )
}