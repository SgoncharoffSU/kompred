'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Yeseva_One } from 'next/font/google'
import { ThemeToggle } from '@/components/ThemeProvider'
import { HeaderContactIcons } from '@/components/HeaderContactIcons'
import { SiteChatWidget } from '@/components/SiteChatWidget'

const brandFont = Yeseva_One({ subsets: ['cyrillic', 'latin'], weight: '400', display: 'swap' })

// ── Types ──────────────────────────────────────────────────────────────────

interface CropRect {
  mode?: 'position' | 'crop'
  x: number
  y: number
  w?: number
  h?: number
}

interface ClientModel {
  id: string
  name: string
  slogan: string
  image_url: string
  image_crop: string | null
  base_price: number
  status: 'active' | 'draft'
  created_at: string
  updated_at: string
}

interface ClientLayout {
  id: string
  model_id: string
  name: string
  price_modifier: number
  image_url: string
  description: string
  created_at: string
  updated_at: string
}

interface ClientGroup {
  id: string
  model_id: string
  name: string
  selection_type: 'single' | 'multiple'
  required: boolean
  enlargePhoto: boolean
  order_index: number
  parent_group_id: string | null
  block_type: 'options' | 'popup' | 'delivery' | 'contacts'
  model_ids?: number[] | null
  layout_ids?: number[] | null
  created_at: string
  updated_at: string
}

interface PopupChoice {
  id: string
  name: string
  price: number
  image_url?: string
}

interface ClientOption {
  id: string
  group_id: string
  name: string
  price_modifier: number
  base_price: number
  image_url: string
  image_crop: string | null
  description: string
  is_default: boolean
  popup_options: PopupChoice[]
  max_quantity: number
  max_length: number
  max_width: number
  unit: string
  created_at: string
  updated_at: string
}

interface Exclusion {
  id: string
  a_type: 'option' | 'group'
  a_id: string
  b_type: 'option' | 'group'
  b_id: string
}

interface VisibilityRule {
  id: string
  trigger_type: 'option' | 'group'
  trigger_id: string
  target_type: 'option' | 'group'
  target_id: string
  effect: 'show' | 'hide'
}

interface DeliveryConfig {
  km_label?: string
  base?: { label: string; base_price?: number; price_per_km?: number }
  option_rules: { option_id: string; label: string; base_price?: number; price_per_km?: number }[]
}

interface InclusionSection {
  id: string
  name: string
  items: string[]
  model_ids?: string[] | null
}

interface PopupBlock {
  id: string
  type: 'inclusion'
  title: string
  data: { sections: InclusionSection[] }
}

function sectionsForModel(sections: InclusionSection[], modelId: string): InclusionSection[] {
  return sections.filter((s) => !s.model_ids || s.model_ids.length === 0 || s.model_ids.includes(modelId))
}

interface ContactBlock {
  id: string
  title?: string
  data: {
    phone?: string
    telegram?: string
    whatsapp?: string
    email?: string
    emails?: { label: string; email: string }[]
    address?: string
    requisites?: string
    note?: string
  }
}

type PendingConflict = {
  optionId: string
  groupId: string
  qty: number
  optionName: string
  reasonIds: string[]
  reasonPhrases: string[]
}

function parseCropSafe(raw: string | null | undefined): CropRect | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.x !== 'number') return null
    // {x:0,y:0,w:100,h:100} with no mode is the "never customized" default — treat as no crop
    // so the image falls back to a normal centered object-cover instead of the legacy
    // top-left-anchored crop math, which looks wrong for any photo that isn't already square.
    if (!parsed.mode && parsed.x === 0 && parsed.y === 0 && (parsed.w === undefined || parsed.w === 100) && (parsed.h === undefined || parsed.h === 100)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

// ── Raw PHP shapes ───────────────────────────────────────────────────────────

// Image bytes are fetched server-side by /api/img-proxy, which runs on the same box as the
// PHP backend — so this must stay a loopback address, never the public IP (port 8080 there
// is firewalled to localhost-only).
const PHP_STATIC_BASE = 'http://127.0.0.1:8080'

function normalizeImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('https://')) return url
  const full = url.startsWith('http://') ? url : `${PHP_STATIC_BASE}${url.startsWith('/') ? '' : '/'}${url}`
  return `/api/img-proxy?url=${encodeURIComponent(full)}`
}

function adaptModel(m: any): ClientModel {
  return {
    id: String(m.id),
    name: m.name,
    slogan: '',
    image_url: normalizeImageUrl(m.image_url || ''),
    image_crop: m.image_crop || null,
    base_price: Number(m.base_price),
    status: 'active',
    created_at: '',
    updated_at: '',
  }
}

function adaptLayout(l: any): ClientLayout {
  return {
    id: String(l.id),
    model_id: String(l.model_id),
    name: l.name,
    price_modifier: Number(l.price_modifier),
    image_url: '',
    description: '',
    created_at: '',
    updated_at: '',
  }
}

function adaptExclusion(e: any): Exclusion {
  return { id: String(e.id), a_type: e.a_type, a_id: String(e.a_id), b_type: e.b_type, b_id: String(e.b_id) }
}

function adaptVisibilityRule(r: any): VisibilityRule {
  return {
    id: String(r.id),
    trigger_type: r.trigger_type,
    trigger_id: String(r.trigger_id),
    target_type: r.target_type,
    target_id: String(r.target_id),
    effect: r.effect === 'show' ? 'show' : 'hide',
  }
}

function adaptOption(raw: any, modelId?: string): ClientOption {
  const photoOverride = modelId ? raw.model_photos?.[modelId] : undefined
  const imageUrl = photoOverride?.image_url ?? raw.image_url ?? ''
  const imageCrop = photoOverride ? photoOverride.image_crop : raw.image_crop || null
  return {
    id: String(raw.id),
    group_id: String(raw.group_id),
    name: raw.name,
    price_modifier: Number(raw.price),
    base_price: Number(raw.base_price || 0),
    image_url: normalizeImageUrl(imageUrl),
    image_crop: imageCrop,
    description: raw.description || '',
    is_default: !!Number(raw.is_default),
    popup_options: raw.popup_options || [],
    max_quantity: Number(raw.max_quantity || 1),
    max_length: Number(raw.max_length || 0),
    max_width: Number(raw.max_width || 0),
    unit: raw.unit || 'шт',
    created_at: '',
    updated_at: '',
  }
}

// ── Workspace-scoped PHP client ─────────────────────────────────────────────

// Custom client domains (no /cli{N} path) resolve their account by hostname instead.
const HOSTNAME_ACCOUNT_MAP: Record<string, string> = {
  'siberiaa.ru': '1238',
  'www.siberiaa.ru': '1238',
}

function getAccountFromLocation(): string | null {
  const pathMatch = window.location.pathname.match(/\/cli(\d+)/)
  if (pathMatch) return pathMatch[1]
  return HOSTNAME_ACCOUNT_MAP[window.location.hostname] || null
}

let cachedPhpWorkspaceId: string | null | undefined

async function resolvePhpWorkspaceId(): Promise<string | null> {
  if (cachedPhpWorkspaceId !== undefined) return cachedPhpWorkspaceId
  const account = getAccountFromLocation()
  if (!account) return (cachedPhpWorkspaceId = null)
  try {
    const res = await fetch(`/api/workspace-lookup?account=${account}`)
    const data = await res.json()
    cachedPhpWorkspaceId = data.php_workspace_id ? String(data.php_workspace_id) : null
  } catch {
    cachedPhpWorkspaceId = null
  }
  return cachedPhpWorkspaceId
}

async function phpGet(action: string, params: Record<string, string> = {}): Promise<any> {
  const wid = await resolvePhpWorkspaceId()
  const query: Record<string, string> = { action, ...params }
  if (wid) query.wid = wid
  const res = await fetch(`/api/php-proxy?${new URLSearchParams(query)}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`PHP API error ${res.status}`)
  return res.json()
}

async function phpPost(action: string, body: Record<string, unknown>): Promise<any> {
  const wid = await resolvePhpWorkspaceId()
  const res = await fetch(`/api/php-proxy?action=${action}${wid ? `&wid=${wid}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PHP API error ${res.status}`)
  return res.json()
}

let bootstrapCache: any = null

async function getBootstrap(): Promise<any> {
  if (bootstrapCache) return bootstrapCache
  bootstrapCache = await phpGet('bootstrap')
  return bootstrapCache
}

const modelService = {
  async getAllModels(): Promise<ClientModel[]> {
    const data = await getBootstrap()
    return (data.models || []).map(adaptModel)
  },
}

const layoutService = {
  async getLayoutsByModel(modelId: string): Promise<ClientLayout[]> {
    const data = await phpGet('get_layouts', { model_id: modelId })
    return (data.layouts || []).map(adaptLayout)
  },
}

const groupService = {
  async getGroupsByModel(modelId: string): Promise<ClientGroup[]> {
    const data = await getBootstrap()
    const groupIdsWithOptions = new Set(
      (data.options || [])
        .filter((o: any) => (o.active_model_ids || o.model_ids).map(String).includes(modelId))
        .map((o: any) => o.group_id)
    )
    const allGroups = data.groups || []
    const groupById = new Map(allGroups.map((g: any) => [g.id, g]))
    const includedIds = new Set<any>()

    groupIdsWithOptions.forEach((id) => {
      let g: any = groupById.get(id)
      while (g) {
        includedIds.add(g.id)
        g = g.parent_group_id ? groupById.get(g.parent_group_id) : undefined
      }
    })
    allGroups.forEach((g: any) => {
      if ((g.block_type || 'options') !== 'options') includedIds.add(g.id)
    })

    const modelAllowed = (g: any) => !g.model_ids || g.model_ids.length === 0 || g.model_ids.map(String).includes(modelId)
    const filtered = allGroups.filter((g: any) => includedIds.has(g.id) && modelAllowed(g))
    const childrenByParent = new Map<any, any[]>()
    filtered.forEach((g: any) => {
      const parent = g.parent_group_id || 0
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, [])
      childrenByParent.get(parent)!.push(g)
    })
    childrenByParent.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order))

    const ordered: any[] = []
    const walk = (parent: any) => {
      ;(childrenByParent.get(parent) || []).forEach((g) => {
        ordered.push(g)
        walk(g.id)
      })
    }
    walk(0)

    return ordered.map(
      (g): ClientGroup => ({
        id: String(g.id),
        model_id: modelId,
        name: g.name,
        selection_type: g.selection_type === 'single' ? 'single' : 'multiple',
        required: g.required === undefined || Number(g.required) !== 0,
        enlargePhoto: Number(g.enlarge_photo || 0) !== 0,
        order_index: g.sort_order,
        parent_group_id: g.parent_group_id ? String(g.parent_group_id) : null,
        block_type: g.block_type || 'options',
        model_ids: g.model_ids || null,
        layout_ids: g.layout_ids || null,
        created_at: '',
        updated_at: '',
      })
    )
  },
}

const optionService = {
  async getOptionsByGroup(groupId: string, modelId: string): Promise<ClientOption[]> {
    const data = await getBootstrap()
    return (data.options || [])
      .filter((o: any) => String(o.group_id) === groupId && (o.active_model_ids || o.model_ids).map(String).includes(modelId))
      .map((o: any) => adaptOption(o, modelId))
  },
}

const exclusionService = {
  async getExclusions(): Promise<Exclusion[]> {
    const data = await getBootstrap()
    return (data.exclusions || []).map(adaptExclusion)
  },
}

const visibilityRuleService = {
  async getVisibilityRules(): Promise<VisibilityRule[]> {
    const data = await getBootstrap()
    return (data.visibility_rules || []).map(adaptVisibilityRule)
  },
}

const calculationService = {
  async createCalculation(payload: {
    model_id: string
    layout_id: string
    selected_options: { id: string; qty: number }[]
    total_price: number
    option_choices?: Record<string, { name: string; price: number }>
    option_dimensions?: Record<string, { length: number; width: number }>
    account?: string
  }): Promise<{ public_slug: string }> {
    const data = await phpPost('create_calculation', {
      model_id: Number(payload.model_id),
      layout_id: Number(payload.layout_id),
      selected_options: payload.selected_options.map((o) => ({ id: Number(o.id), qty: o.qty })),
      total_price: payload.total_price,
      ...(payload.option_choices && Object.keys(payload.option_choices).length > 0 ? { option_choices: payload.option_choices } : {}),
      ...(payload.option_dimensions && Object.keys(payload.option_dimensions).length > 0 ? { option_dimensions: payload.option_dimensions } : {}),
      ...(payload.account ? { account: payload.account } : {}),
    })
    if (!data.ok || !data.public_slug) throw new Error(data.error || 'Failed to create calculation')
    return { public_slug: data.public_slug }
  },
}

// ── Shared UI bits ───────────────────────────────────────────────────────────

function CroppedImage({ src, crop, className }: { src: string; crop?: CropRect | null; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    const wrap = wrapRef.current
    if (!img || !wrap || !crop || crop.mode === 'position') return
    const apply = () => {
      if (!img.naturalWidth) return
      const cw = wrap.clientWidth
      const ch = wrap.clientHeight
      if (!cw || !ch) return
      const { x, y, w = 100, h = 100 } = crop
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      const scale = Math.max(cw / (nw * w / 100), ch / (nh * h / 100))
      img.style.width = `${nw * scale}px`
      img.style.height = `${nh * scale}px`
      img.style.left = `${-(nw * x / 100) * scale}px`
      img.style.top = `${-(nh * y / 100) * scale}px`
    }
    const resizeObserver = new ResizeObserver(() => {
      if (img.naturalWidth) apply()
    })
    resizeObserver.observe(wrap)
    if (img.complete && img.naturalWidth) requestAnimationFrame(apply)
    else img.addEventListener('load', apply, { once: true })
    return () => {
      resizeObserver.disconnect()
      img.removeEventListener('load', apply)
    }
  }, [crop, src])

  if (crop && crop.mode !== 'position') {
    return (
      <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          aria-hidden
          style={{
            position: 'absolute',
            top: -32,
            left: -32,
            width: 'calc(100% + 64px)',
            height: 'calc(100% + 64px)',
            objectFit: 'cover',
            filter: 'blur(20px) saturate(1.2)',
            pointerEvents: 'none',
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={src} alt="" style={{ position: 'absolute', maxWidth: 'none', maxHeight: 'none', pointerEvents: 'none' }} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className ?? 'h-full w-full object-cover'}
      style={crop?.mode === 'position' ? { objectPosition: `${crop.x}% ${crop.y}%` } : undefined}
    />
  )
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M1.5 5l2.5 2.5L8.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 3V2a1 1 0 011-1h4.5a1 1 0 011 1V7a1 1 0 01-1 1H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[#e8ddd3] dark:bg-[#2e2820] ${className}`} />
}

// ── Modals ───────────────────────────────────────────────────────────────────

function InclusionPopup({ title, sections, onClose }: { title: string; sections: InclusionSection[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="flex w-full max-w-[680px] flex-col rounded-t-2xl border border-b-0 border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-2xl"
        style={{ maxHeight: '85dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-[#d5c9be] dark:bg-[#4a4038]" />
        <div className="flex shrink-0 items-center gap-3 border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
          <div className="flex-1">
            <div className="text-sm font-bold text-[#1a1612] dark:text-[#ede7de]">{title}</div>
            <div className="mt-0.5 text-xs text-[#7a6f66] dark:text-[#9a8f87]">
              {sections.length} разделов · {totalItems} позиций
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e0d5c9] dark:border-[#38322a] text-[#7a6f66] dark:text-[#9a8f87] hover:border-[#1a1612] dark:hover:border-[#ede7de] hover:text-[#1a1612] dark:hover:text-[#ede7de] transition-colors"
            aria-label="Закрыть"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>
        <div className="flex shrink-0 gap-1 border-b border-[#e0d5c9] dark:border-[#38322a] bg-[#f8f4f0] dark:bg-[#1c1a16] px-4 py-2">
          <button
            onClick={() => setExpanded(new Set(sections.map((s) => s.id)))}
            className="rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a6f66] dark:text-[#9a8f87] hover:text-[#0d5a52] transition-colors"
          >
            Развернуть все
          </button>
          <button
            onClick={() => setExpanded(new Set())}
            className="rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a6f66] dark:text-[#9a8f87] hover:text-[#0d5a52] transition-colors"
          >
            Свернуть все
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {sections.map((s) => {
            const isOpen = expanded.has(s.id)
            return (
              <div key={s.id} className="border-b border-[#e0d5c9] dark:border-[#38322a] last:border-b-0">
                <button
                  onClick={() => toggle(s.id)}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                    isOpen
                      ? 'border-l-2 border-[#0d5a52] bg-[#f0f7f5] dark:bg-[#0d5a52]/10'
                      : 'border-l-2 border-transparent bg-white dark:bg-[#252119] hover:bg-[#f8f4f0] dark:hover:bg-[#2e2820]'
                  }`}
                >
                  <span className="flex-1 text-sm font-semibold text-[#1a1612] dark:text-[#ede7de]">{s.name}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums transition-colors ${
                      isOpen ? 'border-[#0d5a52]/30 bg-[#0d5a52]/10 text-[#0d5a52]' : 'border-[#e0d5c9] dark:border-[#38322a] text-[#7a6f66] dark:text-[#9a8f87]'
                    }`}
                  >
                    {s.items.length}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={`shrink-0 text-[#7a6f66] dark:text-[#9a8f87] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 16 16"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
                {isOpen && (
                  <ul className="bg-[#f8f4f0] dark:bg-[#1c1a16] px-5 pb-3 pt-1">
                    {s.items.map((item, i) => (
                      <li key={i} className="relative py-1.5 pl-3.5 text-sm leading-snug text-[#7a6f66] dark:text-[#9a8f87] border-b border-[#e8ddd5] dark:border-[#2e2820] last:border-b-0">
                        <span className="absolute left-0 top-[11px] h-1.5 w-1.5 rounded-full bg-[#0d5a52] opacity-50" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-[#e0d5c9] dark:border-[#38322a] bg-[#f8f4f0] dark:bg-[#1c1a16] px-5 py-2.5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-[#7a6f66] dark:text-[#9a8f87]">
            <rect x="3" y="1" width="10" height="14" rx="1" />
            <path d="M6 5h4M6 8h4M6 11h2" />
          </svg>
          <span className="text-[11px] text-[#7a6f66] dark:text-[#9a8f87]">В PDF комплектация выводится отдельной страницей в конце документа</span>
        </div>
      </div>
    </div>
  )
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
        title="Закрыть"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

function ConflictDialog({
  optionName,
  reasonPhrases,
  onCancel,
  onConfirm,
}: {
  optionName: string
  reasonPhrases: string[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const reasonText = reasonPhrases.length > 0 ? reasonPhrases.join(', либо если выбрана ') : 'уже выбранной опции'
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#252119] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-5 text-sm text-[#7a6f66] dark:text-[#9a8f87]">
          Данную опцию «{optionName}» нельзя выбрать, если выбрана {reasonText}.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#e0d5c9] dark:border-[#38322a] px-4 py-2.5 text-sm font-medium text-[#7a6f66] dark:text-[#9a8f87] hover:bg-[#f8f4f0] dark:hover:bg-[#2e2820]"
          >
            Отмена
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-xl bg-[#0d5a52] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0a4840]">
            Отказаться и выбрать
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Classic design ───────────────────────────────────────────────────────────

interface DesignProps {
  workspaceName: string
  pageTitle: string
  pageSubtitle: string
  ctaText: string
  offerNote: string
  groupTexts: Record<string, string>
  deliveryConfigs: Record<string, DeliveryConfig>
  deliveryKm: Record<string, string>
  setDeliveryKm: (groupId: string, km: string) => void
  deliveryBreakdowns: { groupId: string; km: number; lines: { label: string; cost: number }[]; total: number }[]
  models: ClientModel[]
  selectedModelId: string
  layouts: ClientLayout[]
  selectedLayoutId: string
  groups: ClientGroup[]
  optionsByGroup: Record<string, ClientOption[]>
  selectedOptions: Record<string, string[]>
  quantities: Record<string, number>
  dimensions: Record<string, { length: number; width: number }>
  disabledOptionIds: Set<string>
  hiddenGroupIds: Set<string>
  hiddenOptionIds: Set<string>
  loading: boolean
  saving: boolean
  offerLink: string
  error: string
  copied: boolean
  selectedModel: ClientModel | null
  selectedLayout: ClientLayout | null
  selectedOptionEntities: ClientOption[]
  previewImageUrl: string
  totalPrice: number
  fmt: (n: number) => string
  onModelChange: (id: string) => void
  onLayoutChange: (id: string) => void
  toggleOption: (group: ClientGroup, optionId: string) => void
  setQuantity: (optionId: string, qty: number) => void
  setOptionDimensions: (optionId: string, next: { length: number; width: number }) => void
  createOffer: () => void
  copyLink: () => void
  onEnlargePhoto: (url: string) => void
  popupBlocks: PopupBlock[]
  onOpenPopup: (groupId: string) => void
  contactBlocks: ContactBlock[]
  chatWelcome: string
  chatDelaySeconds: number
  chatAnimations: boolean
  chatShowFrom: string
  chatShowUntil: string
  selectedOptionChoices: Record<string, PopupChoice>
  onOptionChoiceSelect: (optionId: string, choice: PopupChoice) => void
}

type RenderRow = { kind: 'options'; groups: ClientGroup[] } | { kind: 'popup' | 'delivery' | 'contacts'; group: ClientGroup }

function ClassicDesign(props: DesignProps) {
  const {
    workspaceName,
    chatWelcome,
    chatDelaySeconds,
    chatAnimations,
    chatShowFrom,
    chatShowUntil,
    pageTitle,
    pageSubtitle,
    ctaText,
    offerNote,
    groupTexts,
    deliveryConfigs,
    deliveryKm,
    setDeliveryKm,
    deliveryBreakdowns,
    models,
    selectedModelId,
    layouts,
    selectedLayoutId,
    groups,
    optionsByGroup,
    selectedOptions,
    quantities,
    dimensions,
    disabledOptionIds,
    hiddenGroupIds,
    hiddenOptionIds,
    loading,
    saving,
    offerLink,
    error,
    copied,
    selectedModel,
    selectedLayout,
    selectedOptionEntities,
    previewImageUrl,
    totalPrice,
    fmt,
    onModelChange,
    onLayoutChange,
    toggleOption,
    setQuantity,
    setOptionDimensions,
    createOffer,
    copyLink,
    onEnlargePhoto,
    popupBlocks,
    onOpenPopup,
    contactBlocks,
    selectedOptionChoices,
    onOptionChoiceSelect,
  } = props

  const [pendingPopupOption, setPendingPopupOption] = useState<{ option: ClientOption; group: ClientGroup } | null>(null)

  const handleOptionClick = (group: ClientGroup, option: ClientOption, isActive: boolean) => {
    if (option.max_length > 0 || option.max_width > 0) {
      setOptionDimensions(option.id, isActive ? { length: 0, width: 0 } : { length: option.max_length > 0 ? 1 : 0, width: option.max_width > 0 ? 1 : 0 })
    } else if (option.max_quantity > 1) {
      setQuantity(option.id, isActive ? 0 : 1)
    } else if (option.popup_options?.length && !isActive) {
      setPendingPopupOption({ option, group })
    } else {
      toggleOption(group, option.id)
    }
  }

  const layoutAllowed = (g: ClientGroup) => !g.layout_ids || g.layout_ids.length === 0 || (!!selectedLayoutId && g.layout_ids.map(String).includes(selectedLayoutId))

  const rows: RenderRow[] = []
  let pendingOptionGroups: ClientGroup[] = []
  for (const g of groups) {
    if (!layoutAllowed(g) || hiddenGroupIds.has(g.id)) continue
    const blockType = g.block_type || 'options'
    if (blockType === 'popup' || blockType === 'delivery' || blockType === 'contacts') {
      if (pendingOptionGroups.length) {
        rows.push({ kind: 'options', groups: [...pendingOptionGroups] })
        pendingOptionGroups = []
      }
      rows.push({ kind: blockType, group: g })
    } else {
      pendingOptionGroups.push(g)
    }
  }
  if (pendingOptionGroups.length) rows.push({ kind: 'options', groups: [...pendingOptionGroups] })

  let optionsHeaderShown = 0
  const offerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const optionsAnchorRef = useRef<HTMLDivElement>(null)
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [contactsNearBottom, setContactsNearBottom] = useState(false)
  const [contactsExpanded, setContactsExpanded] = useState(false)
  const [ctaBarVisible, setCtaBarVisible] = useState(false)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const near = distanceFromBottom < 160
      setContactsNearBottom(near)
      if (!near) setContactsExpanded(false)
      // The CTA/price bar only makes sense once the visitor has scrolled past the free
      // model/layout pickers and the roofing block ("кровля") — showing "Сформировать" any
      // earlier, before there's anything meaningful priced yet, is confusing.
      const roofGroup = groups.find((g) => g.name.toLowerCase().includes('кровл'))
      const roofEl = roofGroup ? groupRefs.current[roofGroup.id] : null
      const anchor = roofEl || optionsAnchorRef.current
      setCtaBarVisible(anchor ? anchor.getBoundingClientRect().bottom < el.getBoundingClientRect().bottom : true)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [groups])
  useEffect(() => {
    if (offerLink && offerRef.current) offerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [offerLink])

  const photoBlock = (
    <div className="relative overflow-hidden rounded-2xl shadow-card">
      {previewImageUrl ? (
        <>
          <div key={previewImageUrl} className="aspect-square w-full transition-opacity duration-500">
            <CroppedImage src={previewImageUrl} crop={parseCropSafe(selectedModel?.image_crop)} className="aspect-square w-full object-cover" />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-16">
            {workspaceName && <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">{workspaceName}</div>}
            {selectedModel && <div className="mt-0.5 text-lg font-bold leading-tight text-white">{selectedModel.name}</div>}
            {selectedLayout && <div className="mt-0.5 text-sm text-white/65">{selectedLayout.name}</div>}
          </div>
        </>
      ) : (
        <div className="flex aspect-square flex-col items-center justify-center bg-[#e8ddd3] dark:bg-[#2e2820]">
          <div className="text-7xl opacity-15">🛁</div>
          <div className="mt-4 text-sm font-semibold text-[#7a6f66] dark:text-[#9a8f87]">{selectedModel?.name || 'Выберите модель'}</div>
          <div className="mt-1 text-xs text-[#b0a499] dark:text-[#5a5048]">Добавьте фото модели в админке</div>
        </div>
      )}
    </div>
  )

  const visibleContactBlocks = contactBlocks.filter((b) => {
    const d = b.data
    return d.phone || d.telegram || d.whatsapp || d.email || d.address || d.note
  })

  const contactsCards = visibleContactBlocks.map((block) => {
    const d = block.data
    const textLinks: { href: string; label: string; icon: React.ReactNode }[] = []
    if (d.phone)
      textLinks.push({
        href: `tel:${d.phone.replace(/\s/g, '')}`,
        label: d.phone,
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 11.39 19a19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        ),
      })
    if (d.email)
      textLinks.push({
        href: `mailto:${d.email}`,
        label: d.email,
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        ),
      })
    if (d.address)
      textLinks.push({
        href: `https://yandex.ru/maps/?text=${encodeURIComponent(d.address)}`,
        label: d.address,
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        ),
      })

    const iconLinks: { href: string; label: string; icon: React.ReactNode }[] = []
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

    return (
      <div key={block.id} className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
        <div className="border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">{block.title || 'Контакты'}</span>
        </div>
        <div className="divide-y divide-[#e0d5c9] dark:divide-[#38322a]">
          {textLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f8f4f0] dark:hover:bg-[#1f1c16] group"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d5a52]/10 dark:bg-[#0d5a52]/20 text-[#0d5a52] group-hover:bg-[#0d5a52] group-hover:text-white transition-colors">
                {link.icon}
              </span>
              <span className="text-sm text-[#1a1612] dark:text-[#ede7de] group-hover:text-[#0d5a52] dark:group-hover:text-[#4db8ac] transition-colors">{link.label}</span>
            </a>
          ))}
          {iconLinks.length > 0 && (
            <div className="flex items-center gap-2 px-5 py-3.5">
              {iconLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  title={link.label}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0d5a52]/10 dark:bg-[#0d5a52]/20 text-[#0d5a52] transition-colors hover:bg-[#0d5a52] hover:text-white"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          )}
          {d.note && (
            <div className="px-5 py-3.5 flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0d5a52]/10 dark:bg-[#0d5a52]/20 text-[#0d5a52]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <span className="pt-1.5 text-sm text-[#7a6f66] dark:text-[#9a8f87] leading-relaxed whitespace-pre-line">{d.note}</span>
            </div>
          )}
        </div>
      </div>
    )
  })

  const headerTelegram = visibleContactBlocks.find((b) => b.data.telegram)?.data.telegram
  const headerTelegramHref = headerTelegram ? (headerTelegram.startsWith('http') ? headerTelegram : `https://t.me/${headerTelegram.replace(/^@/, '')}`) : null
  const headerPhone = visibleContactBlocks.find((b) => b.data.phone)?.data.phone

  return (
    <>
      <main className="h-screen flex flex-col bg-[#f2ece4] dark:bg-[#1c1a16]">
        <header className="relative shrink-0 z-40 border-b border-[#e0d5c9] dark:border-[#38322a] bg-white/90 dark:bg-[#252119]/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-4 px-4 py-1 md:px-8">
            <div className="flex items-center gap-3">
              <HeaderContactIcons telegramHref={headerTelegramHref} phone={headerPhone} onRequestCallback={headerPhone ? handleRequestCallback : undefined} />
              <ThemeToggle />
            </div>
          </div>
          {/* Below lg, the icon row above is already tight on width, so the logo/wordmark gets
              its own full-width row in normal flow instead of hanging (overlapping) below the
              header — that overlap trick is what caused it to collide with the TG/phone icons
              on narrow screens. At lg+ there's room, so it reverts to the original hang-below-header layout. */}
          <div className="flex items-center gap-3 px-4 pb-1 lg:absolute lg:left-8 lg:top-full lg:z-50 lg:-translate-y-1/2 lg:px-0 lg:pb-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-siberia.svg" alt={workspaceName || 'СК Сибирия'} className="h-20 w-auto drop-shadow-[0_1px_3px_rgba(255,255,255,0.5)]" />
            <span
              className={`${brandFont.className} text-4xl leading-none tracking-wide text-[#0d5a52] drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)] dark:text-[#5fcabf] dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] md:text-5xl`}
            >
              СК СИБЕРИЯ
            </span>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* The logo no longer hangs past the header on mobile (see above), so the sticky
              photo can sit flush at top-0 instead of leaving room for it. */}
          <div className="lg:hidden sticky top-0 z-0 [&>div]:rounded-none [&>div]:shadow-none [&_.aspect-square]:!aspect-auto [&_.aspect-square]:!h-[62vh]">{photoBlock}</div>

          <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-6 pt-16 md:px-8 md:pb-10 md:pt-20 lg:h-full lg:flex lg:flex-col lg:pt-10">
            <div className="bg-[#f2ece4] dark:bg-[#1c1a16] lg:flex lg:flex-1 lg:flex-col lg:min-h-0">
            <div className="mb-6 lg:shrink-0 lg:pl-[340px]">
              {(pageTitle || workspaceName) && (
                <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1612] dark:text-[#ede7de] md:text-3xl">{pageTitle || workspaceName}</h1>
              )}
              {(pageSubtitle || !pageTitle) && (
                <p className="mt-1 rounded-md bg-white/70 dark:bg-[#252119]/70 px-4 py-3 text-base lg:bg-transparent lg:px-0 lg:py-0 lg:text-sm text-[#7a6f66] dark:text-[#9a8f87]">
                  {pageSubtitle || 'Выберите модель, планировку и опции — получите ссылку с персональным расчётом'}
                  <span className="lg:hidden ml-1 inline-block animate-bounce text-2xl align-middle">👇</span>
                </p>
              )}
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:flex-1 lg:min-h-0">
              <div className="space-y-5 lg:overflow-y-auto lg:pb-6 lg:pr-1">
                <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                  <div className="border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Модель</span>
                  </div>
                  <div className="p-4">
                    {!models.length && loading ? (
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-28" />
                        <Skeleton className="h-9 w-28" />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {models.map((m) => {
                          const active = selectedModelId === m.id
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => onModelChange(m.id)}
                              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                active
                                  ? 'border-[#0d5a52] bg-[#0d5a52] text-white shadow-sm'
                                  : 'border-[#e0d5c9] dark:border-[#38322a] text-[#1a1612] dark:text-[#ede7de] hover:border-[#0d5a52]/50 hover:bg-[#f0f7f5] dark:hover:bg-[#0d5a52]/10'
                              }`}
                            >
                              {m.name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {selectedModel?.slogan && <p className="mt-3 text-xs italic text-[#7a6f66] dark:text-[#9a8f87]">{selectedModel.slogan}</p>}
                  </div>
                </div>

                {(loading || layouts.length > 0) && (
                  <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                    <div className="border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Планировка</span>
                    </div>
                    <div className="p-4">
                      {loading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Skeleton className="h-20" />
                          <Skeleton className="h-20" />
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {layouts.map((l) => {
                            const active = selectedLayoutId === l.id
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => onLayoutChange(l.id)}
                                className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                                  active
                                    ? 'border-[#0d5a52] bg-[#f0f7f5] dark:bg-[#0d5a52]/15 ring-2 ring-[#0d5a52]/25'
                                    : 'border-[#e0d5c9] dark:border-[#38322a] hover:border-[#0d5a52]/40 hover:bg-[#f8f4f0] dark:hover:bg-[#2e2820]'
                                }`}
                              >
                                {active && (
                                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d5a52] text-white">
                                    <CheckIcon />
                                  </span>
                                )}
                                <div className="pr-6 text-sm font-semibold text-[#1a1612] dark:text-[#ede7de]">{l.name}</div>
                                {l.description && <div className="mt-0.5 line-clamp-2 text-xs text-[#7a6f66] dark:text-[#9a8f87]">{l.description}</div>}
                                <div className={`mt-2 text-xs font-semibold ${active ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>+{fmt(l.price_modifier)}</div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={optionsAnchorRef} />

                {loading && (
                  <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                    <div className="border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Опции и комплектация</span>
                    </div>
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-4 w-40" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                      </div>
                    </div>
                  </div>
                )}

                {!loading &&
                  rows.map((row, rowIndex) => {
                    if (row.kind === 'popup') {
                      const block = popupBlocks.find((b) => b.id === row.group.id)
                      if (!block) return null
                      const visibleSections = block.type === 'inclusion' ? sectionsForModel(block.data.sections, selectedModelId) : []
                      if (block.type === 'inclusion' && visibleSections.length === 0) return null
                      return (
                        <div key={row.group.id} className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                          <div className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => onOpenPopup(row.group.id)}
                              className="flex w-full items-center gap-3 rounded-xl border border-[#0d5a52]/30 bg-[#f0f7f5] dark:bg-[#0d5a52]/10 px-4 py-3 text-left transition-colors hover:border-[#0d5a52] hover:bg-[#e6f3f0] dark:hover:bg-[#0d5a52]/20"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0d5a52] text-white text-sm">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 16 16">
                                  <path d="M2 4h12M2 8h8M2 12h10" strokeLinecap="round" />
                                </svg>
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-[#1a1612] dark:text-[#ede7de]">{block.title}</div>
                                {block.type === 'inclusion' && (
                                  <div className="mt-0.5 text-xs text-[#7a6f66] dark:text-[#9a8f87]">
                                    {visibleSections.length > 0 ? `${visibleSections.length} разделов` : 'Открыть'}
                                  </div>
                                )}
                              </div>
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 14 14" className="shrink-0 text-[#0d5a52]">
                                <path d="M5 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    }

                    if (row.kind === 'delivery') {
                      const group = row.group
                      const config = deliveryConfigs[group.id]
                      const km = deliveryKm[group.id] || ''
                      const breakdown = deliveryBreakdowns.find((b) => b.groupId === group.id)
                      return (
                        <div key={group.id} className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                          <div className="flex items-center gap-4 bg-[#f8f4f0] dark:bg-[#1f1c16] border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0d5a52]">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="15" height="13" rx="1" />
                                <path d="M16 8h4l3 5v4h-7V8z" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[#1a1612] dark:text-[#ede7de]">{group.name}</div>
                              <div className="text-xs text-[#7a6f66] dark:text-[#9a8f87]">Укажите расстояние до объекта</div>
                            </div>
                          </div>
                          <div className="p-5">
                            {groupTexts[group.id] && <p className="mb-4 text-xs text-[#7a6f66] dark:text-[#9a8f87]">{groupTexts[group.id]}</p>}
                            {config ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={km}
                                    onChange={(e) => setDeliveryKm(group.id, e.target.value)}
                                    placeholder="0"
                                    className="w-28 rounded-xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#1c1a16] px-3 py-2 text-sm text-[#1a1612] dark:text-[#ede7de] focus:border-[#0d5a52] focus:outline-none"
                                  />
                                  <span className="text-sm text-[#7a6f66] dark:text-[#9a8f87]">{config.km_label || 'км'}</span>
                                </div>
                                {breakdown && breakdown.lines.length > 0 && (
                                  <div className="space-y-1.5 rounded-xl border border-[#e0d5c9] dark:border-[#38322a] p-3">
                                    {breakdown.lines.map((line, i) => (
                                      <div key={i} className="flex items-baseline justify-between gap-2">
                                        <span className="text-sm text-[#1a1612] dark:text-[#ede7de]">{line.label}</span>
                                        <span className="shrink-0 text-sm font-semibold text-[#b87524]">+{fmt(line.cost)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-[#7a6f66] dark:text-[#9a8f87]">Стоимость доставки будет настроена позднее</p>
                            )}
                          </div>
                        </div>
                      )
                    }

                    if (row.kind !== 'options') return null

                    const showHeader = optionsHeaderShown === 0
                    optionsHeaderShown++
                    const rowGroups = row.groups
                    const hasContent = rowGroups.some((g) => {
                      const opts = (optionsByGroup[g.id] || []).filter((o) => !hiddenOptionIds.has(o.id))
                      const hasChildren = groups.some((c) => c.parent_group_id === g.id)
                      return opts.length > 0 || hasChildren
                    })
                    if (!hasContent) return null

                    return (
                      <div key={`options-${rowIndex}`} className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                        {showHeader && (
                          <div className="border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
                            <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Опции и комплектация</span>
                          </div>
                        )}
                        <div className="divide-y divide-[#e0d5c9] dark:divide-[#38322a]">
                          {rowGroups.map((group) => {
                            const options = (optionsByGroup[group.id] || []).filter((o) => !hiddenOptionIds.has(o.id))
                            const hasImages = options.some((o) => o.image_url)
                            const isParent = groups.some((c) => c.parent_group_id === group.id)
                            const isChild = !!group.parent_group_id
                            if (options.length === 0 && !isParent) return null

                            return (
                              <div
                                key={group.id}
                                ref={(node) => {
                                  groupRefs.current[group.id] = node
                                }}
                                className={`p-5 ${isChild ? 'pl-8' : ''}`}
                              >
                                <div className="mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className={isParent ? 'text-base font-bold text-[#1a1612] dark:text-[#ede7de]' : 'text-sm font-semibold text-[#1a1612] dark:text-[#ede7de]'}>
                                      {group.name}
                                    </span>
                                    {!isParent && (
                                      <span className="rounded-full bg-[#f2ece4] dark:bg-[#2e2820] px-2.5 py-0.5 text-xs text-[#7a6f66] dark:text-[#9a8f87]">
                                        {group.selection_type === 'single' ? 'один вариант' : 'несколько'}
                                      </span>
                                    )}
                                  </div>
                                  {groupTexts[group.id] && <p className="mt-1 text-xs text-[#7a6f66] dark:text-[#9a8f87]">{groupTexts[group.id]}</p>}
                                </div>

                                {!isParent && (
                                  <div className={`grid gap-2 ${hasImages ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
                                    {options.map((option) => {
                                      const isActive = (selectedOptions[group.id] || []).includes(option.id)
                                      const isDisabled = disabledOptionIds.has(option.id)
                                      const hasStepper = option.max_quantity > 1
                                      const hasDimensions = option.max_length > 0 || option.max_width > 0
                                      const qty = quantities[option.id] ?? 0
                                      const dim = dimensions[option.id] ?? { length: 0, width: 0 }
                                      const choice = selectedOptionChoices[option.id]
                                      const hasChoices = (option.popup_options?.length ?? 0) > 0

                                      const priceLine = hasDimensions ? (
                                        <>
                                          {option.base_price > 0 && `+${fmt(option.base_price)} `}
                                          {fmt(option.price_modifier)}/м²
                                        </>
                                      ) : (
                                        <>
                                          {option.base_price > 0 && `+${fmt(option.base_price)} `}
                                          {option.price_modifier > 0 ? '+' : ''}
                                          {fmt(option.price_modifier)}
                                        </>
                                      )

                                      const dimensionControls = (
                                        <div className="mt-1.5 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                                          {option.max_length > 0 && (
                                            <div className="flex items-center gap-2">
                                              <span className="w-10 shrink-0 text-[10px] text-[#7a6f66] dark:text-[#9a8f87]">Длина</span>
                                              <input
                                                type="range"
                                                min={1}
                                                max={option.max_length}
                                                value={dim.length || 1}
                                                onChange={(e) => setOptionDimensions(option.id, { length: Number(e.target.value), width: dim.width || (option.max_width > 0 ? 1 : 0) })}
                                                className="h-1.5 flex-1 accent-[#0d5a52]"
                                              />
                                              <span className="w-10 shrink-0 text-right text-[10px] font-semibold text-[#1a1612] dark:text-[#ede7de]">{dim.length || 1} м</span>
                                            </div>
                                          )}
                                          {option.max_width > 0 && (
                                            <div className="flex items-center gap-2">
                                              <span className="w-10 shrink-0 text-[10px] text-[#7a6f66] dark:text-[#9a8f87]">Ширина</span>
                                              <input
                                                type="range"
                                                min={1}
                                                max={option.max_width}
                                                value={dim.width || 1}
                                                onChange={(e) => setOptionDimensions(option.id, { length: dim.length || (option.max_length > 0 ? 1 : 0), width: Number(e.target.value) })}
                                                className="h-1.5 flex-1 accent-[#0d5a52]"
                                              />
                                              <span className="w-10 shrink-0 text-right text-[10px] font-semibold text-[#1a1612] dark:text-[#ede7de]">{dim.width || 1} м</span>
                                            </div>
                                          )}
                                          <div className="text-xs font-semibold text-[#0d5a52] dark:text-[#4db8ae]">Итого: {fmt(option.price_modifier * (dim.length || 1) * (dim.width || 1))}</div>
                                        </div>
                                      )

                                      const stepper = (
                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            disabled={qty <= 0}
                                            onClick={() => setQuantity(option.id, Math.max(0, qty - 1))}
                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#e0d5c9] dark:border-[#38322a] text-xs font-bold text-[#1a1612] dark:text-[#ede7de] disabled:opacity-40"
                                          >
                                            −
                                          </button>
                                          <input
                                            type="number"
                                            min={0}
                                            max={option.max_quantity}
                                            value={qty}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => setQuantity(option.id, Math.max(0, Math.min(option.max_quantity, parseInt(e.target.value) || 0)))}
                                            className="w-10 rounded border border-[#e0d5c9] dark:border-[#38322a] bg-transparent text-center text-xs font-semibold text-[#1a1612] dark:text-[#ede7de]"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setQuantity(option.id, Math.min(option.max_quantity, qty + 1))}
                                            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0d5a52] text-xs font-bold text-[#0d5a52]"
                                          >
                                            +
                                          </button>
                                          {option.unit && option.unit !== 'шт' && <span className="text-[10px] text-[#7a6f66] dark:text-[#9a8f87]">{option.unit}</span>}
                                        </div>
                                      )

                                      if (option.image_url) {
                                        return (
                                          <div
                                            key={option.id}
                                            onClick={() => handleOptionClick(group, option, isActive)}
                                            title={isDisabled ? 'Нельзя выбрать вместе с уже выбранной опцией — нажмите, чтобы посмотреть варианты' : undefined}
                                            className={`relative overflow-hidden rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                                              isActive ? 'border-[#0d5a52] ring-2 ring-[#0d5a52]/25' : 'border-[#e0d5c9] dark:border-[#38322a] hover:border-[#0d5a52]/40'
                                            } ${isDisabled ? 'opacity-40 grayscale' : ''}`}
                                          >
                                            <div className="aspect-[4/3] overflow-hidden bg-[#e8ddd3] dark:bg-[#2e2820]">
                                              <CroppedImage
                                                src={option.image_url}
                                                crop={
                                                  option.image_crop
                                                    ? (() => {
                                                        try {
                                                          return JSON.parse(option.image_crop)
                                                        } catch {
                                                          return null
                                                        }
                                                      })()
                                                    : null
                                                }
                                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                              />
                                            </div>
                                            {isActive && (
                                              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d5a52] text-white shadow-sm">
                                                <CheckIcon />
                                              </span>
                                            )}
                                            {hasChoices && !isActive && (
                                              <span className="absolute left-2 top-2 rounded-full bg-[#b87524]/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">Выбор</span>
                                            )}
                                            {group.enlargePhoto && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  onEnlargePhoto(option.image_url)
                                                }}
                                                className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                                                title="Увеличить фото"
                                              >
                                                🔍
                                              </button>
                                            )}
                                            <div className="px-2.5 pb-2.5 pt-2">
                                              <div className="text-xs font-semibold text-[#1a1612] dark:text-[#ede7de]">{option.name}</div>
                                              {isActive && choice && (
                                                <div className="mt-0.5 text-[10px] text-[#0d5a52] dark:text-[#4db8ae] font-medium truncate">
                                                  {choice.name}
                                                  {choice.price > 0 ? ` +${fmt(choice.price)}` : ''}
                                                </div>
                                              )}
                                              {!isActive && option.description && (
                                                <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#7a6f66] dark:text-[#9a8f87]">{option.description}</div>
                                              )}
                                              {hasDimensions ? (
                                                <div className="mt-1">
                                                  <span className={`text-xs font-semibold ${isActive ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>{priceLine}</span>
                                                  {isActive && dimensionControls}
                                                </div>
                                              ) : hasStepper ? (
                                                <div className="mt-1 flex items-center justify-between">
                                                  <span className={`text-xs font-semibold ${isActive ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>{priceLine}</span>
                                                  {stepper}
                                                </div>
                                              ) : (
                                                <div className={`mt-0.5 text-xs font-semibold ${isActive ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>{priceLine}</div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      }

                                      return (
                                        <div
                                          key={option.id}
                                          onClick={() => handleOptionClick(group, option, isActive)}
                                          title={isDisabled ? 'Нельзя выбрать вместе с уже выбранной опцией — нажмите, чтобы посмотреть варианты' : undefined}
                                          className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                                            isActive ? 'border-[#0d5a52] bg-[#f0f7f5] dark:bg-[#0d5a52]/15' : 'border-[#e0d5c9] dark:border-[#38322a] hover:border-[#0d5a52]/40 hover:bg-[#f8f4f0] dark:hover:bg-[#2e2820]'
                                          } ${isDisabled ? 'opacity-40 grayscale' : ''}`}
                                        >
                                          {!hasDimensions && (
                                            <span
                                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                                isActive ? 'border-[#0d5a52] bg-[#0d5a52] text-white' : 'border-[#c4b8a8] dark:border-[#5a5048]'
                                              }`}
                                            >
                                              {isActive && <CheckIcon />}
                                            </span>
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-[#1a1612] dark:text-[#ede7de]">
                                              {option.name}
                                              {hasChoices && !isActive && (
                                                <span className="ml-1.5 rounded-full bg-[#b87524]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#b87524]">Выбор</span>
                                              )}
                                            </div>
                                            {isActive && choice && (
                                              <div className="mt-0.5 text-xs text-[#0d5a52] dark:text-[#4db8ae] font-medium">
                                                {choice.name}
                                                {choice.price > 0 ? ` +${fmt(choice.price)}` : ''}
                                              </div>
                                            )}
                                            {!isActive && option.description && <div className="mt-0.5 line-clamp-1 text-sm text-[#7a6f66] dark:text-[#9a8f87]">{option.description}</div>}
                                            {hasDimensions ? (
                                              <div className="mt-1">
                                                <span className={`text-xs font-semibold ${isActive ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>{priceLine}</span>
                                                {isActive && dimensionControls}
                                              </div>
                                            ) : hasStepper ? (
                                              <div className="mt-1 flex items-center justify-between">
                                                <span className={`text-xs font-semibold ${isActive ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>{priceLine}</span>
                                                {stepper}
                                              </div>
                                            ) : (
                                              <div className={`mt-1 text-xs font-semibold ${isActive ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>{priceLine}</div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                {!loading && <div className="hidden lg:contents">{contactsCards}</div>}
              </div>

              <aside className="space-y-3 lg:overflow-y-auto lg:pb-6">
                {/* Desktop-only: use a wider aspect ratio here (matching the hero photo on the
                    generated offer page) instead of the shared square crop, which cuts off much
                    more of the photo than admin/calc show. */}
                <div className="hidden lg:block [&_.aspect-square]:!aspect-video">{photoBlock}</div>

                <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] dark:border-[#38322a] bg-white dark:bg-[#252119] shadow-card">
                  <div className="border-b border-[#e0d5c9] dark:border-[#38322a] px-5 py-3.5">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Ваша конфигурация</span>
                  </div>
                  <div className="space-y-4 p-5">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Итоговая стоимость</div>
                      <div key={totalPrice} className="mt-1 text-3xl font-extrabold tracking-tight text-[#1a1612] dark:text-[#ede7de] animate-fade-in">
                        {fmt(totalPrice)}
                      </div>
                    </div>
                    <div className="border-t border-[#e0d5c9] dark:border-[#38322a]" />
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[#7a6f66] dark:text-[#9a8f87]">Модель</span>
                        <span className="text-right font-semibold text-[#1a1612] dark:text-[#ede7de]">{selectedModel?.name || '—'}</span>
                      </div>
                      {layouts.length > 0 && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[#7a6f66] dark:text-[#9a8f87]">Планировка</span>
                          <span className="text-right font-semibold text-[#1a1612] dark:text-[#ede7de]">{selectedLayout?.name || '—'}</span>
                        </div>
                      )}
                      {selectedOptionEntities.length > 0 &&
                        (() => {
                          const optionToGroup = new Map<string, string>()
                          groups.forEach((g) => (optionsByGroup[g.id] || []).forEach((o) => optionToGroup.set(o.id, g.id)))
                          const byGroup = new Map<string, ClientOption[]>()
                          selectedOptionEntities.forEach((o) => {
                            const gid = optionToGroup.get(o.id) || ''
                            if (!byGroup.has(gid)) byGroup.set(gid, [])
                            byGroup.get(gid)!.push(o)
                          })
                          const entries = groups.filter((g) => byGroup.has(g.id)).map((g): [string, ClientOption[]] => [g.id, byGroup.get(g.id)!])
                          return (
                            <div className="border-t border-[#e0d5c9] dark:border-[#38322a] pt-3 space-y-3">
                              {entries.map(([gid, opts], i) => (
                                <div key={gid}>
                                  {i > 0 && <div className="border-t border-[#e0d5c9] dark:border-[#38322a] mb-3" />}
                                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7a6f66] dark:text-[#9a8f87]">
                                    {groups.find((g) => g.id === gid)?.name || 'Опции'}
                                  </div>
                                  <div className="space-y-1.5">
                                    {opts.map((o) => {
                                      const isDimension = o.max_length > 0 || o.max_width > 0
                                      const dim = dimensions[o.id]
                                      const qty = quantities[o.id] ?? 1
                                      const choicePrice = selectedOptionChoices[o.id]?.price ?? 0
                                      const line = isDimension
                                        ? o.base_price + o.price_modifier * (dim?.length || 1) * (dim?.width || 1) + choicePrice
                                        : o.base_price + o.price_modifier * qty + choicePrice
                                      const choiceName = selectedOptionChoices[o.id]?.name
                                      return (
                                        <div key={o.id} className="flex items-baseline justify-between gap-2">
                                          <span className="text-xs text-[#1a1612] dark:text-[#ede7de]">
                                            {o.name}
                                            {isDimension && dim
                                              ? dim.length > 0 && dim.width > 0
                                                ? ` (${dim.length}×${dim.width} м)`
                                                : dim.length > 0
                                                  ? ` (${dim.length} м)`
                                                  : dim.width > 0
                                                    ? ` (${dim.width} м)`
                                                    : ''
                                              : qty > 1
                                                ? ` × ${qty} ${o.unit || 'шт'}`
                                                : ''}
                                            {choiceName && <span className="block text-[10px] text-[#7a6f66] dark:text-[#9a8f87]">{choiceName}</span>}
                                          </span>
                                          <span className="shrink-0 text-xs font-semibold text-[#b87524]">
                                            {line > 0 ? '+' : ''}
                                            {fmt(line)}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                    </div>

                    {deliveryBreakdowns.length > 0 && (
                      <div className="border-t border-[#e0d5c9] dark:border-[#38322a] pt-3">
                        <div className="mb-2 text-xs font-medium text-[#7a6f66] dark:text-[#9a8f87]">Доставка</div>
                        <div className="space-y-1.5">
                          {deliveryBreakdowns
                            .flatMap((b) => b.lines)
                            .map((line, i) => (
                              <div key={i} className="flex items-baseline justify-between gap-2">
                                <span className="text-xs text-[#1a1612] dark:text-[#ede7de]">{line.label}</span>
                                <span className="shrink-0 text-xs font-semibold text-[#b87524]">+{fmt(line.cost)}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={createOffer}
                      disabled={saving || !selectedModelId || (layouts.length > 0 && !selectedLayoutId)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d5a52] px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#0a4840] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <SpinnerIcon />
                          Формируем…
                        </>
                      ) : (
                        ctaText || 'Сформировать предложение'
                      )}
                    </button>

                    {offerLink && (
                      <div ref={offerRef} className="animate-slide-up space-y-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Предложение готово
                        </div>
                        <a href={offerLink} target="_blank" rel="noreferrer" className="block break-all text-xs text-[#0d5a52] underline underline-offset-2">
                          {offerLink}
                        </a>
                        <button
                          type="button"
                          onClick={copyLink}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0d5a52]/40 px-3 py-2 text-xs font-semibold text-[#0d5a52] transition-all duration-200 hover:bg-[#0d5a52] hover:text-white"
                        >
                          <CopyIcon />
                          {copied ? 'Скопировано!' : 'Скопировать ссылку'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="px-1 text-center text-xs text-[#7a6f66] dark:text-[#9a8f87]">{offerNote || 'Предложение фиксируется по ссылке и не меняется'}</p>
              </aside>
            </div>
            </div>

            {/* Transparent gap so the sticky photo shows through once everything above has
                scrolled past — the final screen assembles from photo (behind) + contacts +
                price bar (both fixed, overlaid on top). */}
            <div className="lg:hidden h-[45vh]" />
          </div>
          <div className="lg:hidden h-20" />
        </div>

        {contactsCards.length > 0 && (
          <div
            className={`lg:hidden fixed bottom-20 inset-x-0 z-20 border-t border-[#e0d5c9] dark:border-[#38322a] bg-[#f2ece4]/95 backdrop-blur-sm transition-all duration-200 dark:bg-[#1c1a16]/95 ${
              contactsNearBottom ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
            }`}
          >
            {contactsExpanded ? (
              <div className="space-y-2 px-4 pb-2 pt-2">{contactsCards}</div>
            ) : (
              <button
                type="button"
                onClick={() => setContactsExpanded(true)}
                className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#0d5a52] dark:text-[#4db8ae]"
              >
                📞 Связаться с нами
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16">
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div
          className={`lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#e0d5c9] dark:border-[#38322a] bg-white/95 dark:bg-[#252119]/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 transition-all duration-200 ${
            ctaBarVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Итого</div>
            <div className="text-lg font-extrabold tracking-tight text-[#1a1612] dark:text-[#ede7de] leading-none">{fmt(totalPrice)}</div>
          </div>
          {offerLink ? (
            <div className="flex gap-2 shrink-0">
              <a href={offerLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-[#0d5a52]/40 px-3 py-2.5 text-xs font-semibold text-[#0d5a52]">
                Открыть ↗
              </a>
              <button type="button" onClick={copyLink} className="flex items-center gap-1.5 rounded-xl bg-[#0d5a52] px-4 py-2.5 text-xs font-bold text-white">
                <CopyIcon />
                {copied ? 'Скопировано!' : 'Скопировать'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={createOffer}
              disabled={saving || !selectedModelId || (layouts.length > 0 && !selectedLayoutId)}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-[#0d5a52] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <SpinnerIcon />
                  Формируем…
                </>
              ) : (
                ctaText || 'Сформировать предложение'
              )}
            </button>
          )}
        </div>
      </main>

      {pendingPopupOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPendingPopupOption(null)}>
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#1f1c18] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPendingPopupOption(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#7a6f66] dark:text-[#9a8f87] hover:bg-[#f2ece4] dark:hover:bg-[#2e2820] transition-colors"
              aria-label="Закрыть"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="px-6 pt-6 pb-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66] dark:text-[#9a8f87]">Выберите вариант</div>
              <div className="mt-1 text-lg font-bold text-[#1a1612] dark:text-[#ede7de]">{pendingPopupOption.option.name}</div>
              {pendingPopupOption.option.description && (
                <p className="mt-1.5 text-sm text-[#7a6f66] dark:text-[#9a8f87] leading-relaxed">{pendingPopupOption.option.description}</p>
              )}
            </div>
            <div className={`grid gap-3 px-6 pb-6 pt-3 ${pendingPopupOption.option.popup_options.some((c) => c.image_url) ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {pendingPopupOption.option.popup_options.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => {
                    onOptionChoiceSelect(pendingPopupOption.option.id, choice)
                    toggleOption(pendingPopupOption.group, pendingPopupOption.option.id)
                    setPendingPopupOption(null)
                  }}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#e0d5c9] dark:border-[#38322a] text-left transition-all duration-200 hover:border-[#0d5a52] hover:shadow-md active:scale-[0.98]"
                >
                  {choice.image_url && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-[#e8ddd3] dark:bg-[#2e2820]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={choice.image_url} alt={choice.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 p-3">
                    <div className="text-sm font-semibold text-[#1a1612] dark:text-[#ede7de]">{choice.name}</div>
                    <div className={`text-xs font-semibold ${choice.price > 0 ? 'text-[#b87524]' : 'text-[#7a6f66] dark:text-[#9a8f87]'}`}>
                      {choice.price > 0 ? `+${fmt(choice.price)}` : 'Без доплаты'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <SiteChatWidget
        workspaceName={workspaceName}
        welcomeMessage={chatWelcome}
        appearDelaySeconds={chatDelaySeconds}
        animationsEnabled={chatAnimations}
        showFrom={chatShowFrom}
        showUntil={chatShowUntil}
      />
    </>
  )
}

// ── Page (data orchestration) ────────────────────────────────────────────────

export default function ClientPage() {
  const [workspaceName, setWorkspaceName] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [pageSubtitle, setPageSubtitle] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [groupTexts, setGroupTexts] = useState<Record<string, string>>({})
  const [deliveryConfigs, setDeliveryConfigs] = useState<Record<string, DeliveryConfig>>({})
  const [deliveryKm, setDeliveryKmState] = useState<Record<string, string>>({})
  const [popupBlocks, setPopupBlocks] = useState<PopupBlock[]>([])
  const [contactBlocks, setContactBlocks] = useState<ContactBlock[]>([])
  const [chatWelcome, setChatWelcome] = useState('')
  const [chatDelaySeconds, setChatDelaySeconds] = useState(8)
  const [chatAnimations, setChatAnimations] = useState(true)
  const [chatShowFrom, setChatShowFrom] = useState('')
  const [chatShowUntil, setChatShowUntil] = useState('')
  const [publishedModelIds, setPublishedModelIds] = useState<string[] | null>(null)
  const [clientDesign, setClientDesign] = useState<'classic' | 'modern' | 'minimal'>('classic')

  const [models, setModels] = useState<ClientModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [layouts, setLayouts] = useState<ClientLayout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = useState('')
  const [groups, setGroups] = useState<ClientGroup[]>([])
  const [optionsByGroup, setOptionsByGroup] = useState<Record<string, ClientOption[]>>({})
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [dimensions, setDimensions] = useState<Record<string, { length: number; width: number }>>({})
  const [selectedOptionChoices, setSelectedOptionChoices] = useState<Record<string, PopupChoice>>({})
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offerLink, setOfferLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null)
  const [openPopupId, setOpenPopupId] = useState<string | null>(null)
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null)

  // Switching layout can hide groups scoped to a different layout — drop any selections made
  // inside them so they don't keep silently contributing to the price.
  useEffect(() => {
    const hiddenByLayout = new Set(
      groups.filter((g) => g.layout_ids && g.layout_ids.length > 0 && (!selectedLayoutId || !g.layout_ids.map(String).includes(selectedLayoutId))).map((g) => g.id)
    )
    if (hiddenByLayout.size === 0) return
    setSelectedOptions((prev) => {
      let changed = false
      const next = { ...prev }
      hiddenByLayout.forEach((gid) => {
        if (next[gid]) {
          changed = true
          delete next[gid]
        }
      })
      return changed ? next : prev
    })
  }, [selectedLayoutId, groups])

  // Workspace branding + design
  useEffect(() => {
    const account = getAccountFromLocation()
    if (!account) return
    const designOverride = new URLSearchParams(window.location.search).get('design')
    fetch(`/api/workspace-lookup?account=${account}`)
      .then((r) => r.json())
      .then((data) => {
        if (designOverride && ['classic', 'modern', 'minimal'].includes(designOverride)) setClientDesign(designOverride as any)
        else if (data.client_design) setClientDesign(data.client_design)
        if (data.workspace_name) setWorkspaceName(data.workspace_name)
        if (data.page_title) setPageTitle(data.page_title)
        if (data.page_subtitle) setPageSubtitle(data.page_subtitle)
        if (data.cta_text) setCtaText(data.cta_text)
        if (data.offer_note) setOfferNote(data.offer_note)
        if (data.group_texts) setGroupTexts(data.group_texts)
        if (data.delivery_configs) setDeliveryConfigs(data.delivery_configs)
        if (Array.isArray(data.popup_blocks)) setPopupBlocks(data.popup_blocks)
        if (Array.isArray(data.contact_blocks)) setContactBlocks(data.contact_blocks)
        if (data.chat_widget_welcome) setChatWelcome(data.chat_widget_welcome)
        if (typeof data.chat_widget_delay_seconds === 'number') setChatDelaySeconds(data.chat_widget_delay_seconds)
        if (typeof data.chat_widget_animations === 'boolean') setChatAnimations(data.chat_widget_animations)
        if (data.chat_widget_show_from) setChatShowFrom(data.chat_widget_show_from)
        if (data.chat_widget_show_until) setChatShowUntil(data.chat_widget_show_until)
        setPublishedModelIds(data.published_model_ids ?? null)
      })
  }, [])

  // Models
  useEffect(() => {
    const modelParam = new URLSearchParams(window.location.search).get('model')
    modelService
      .getAllModels()
      .then((all) => {
        setModels(all)
        const initial = modelParam && all.find((m) => m.id === modelParam) ? modelParam : all[0]?.id || ''
        if (initial) setSelectedModelId(initial)
      })
      .catch(() => setError('Не удалось загрузить модели'))
      .finally(() => setLoading(false))
  }, [])

  // Exclusions
  useEffect(() => {
    exclusionService.getExclusions().then(setExclusions).catch(() => {})
  }, [])

  // Visibility rules ("when X is selected, show/hide Y")
  useEffect(() => {
    visibilityRuleService.getVisibilityRules().then(setVisibilityRules).catch(() => {})
  }, [])

  // Layouts + groups + options for selected model
  useEffect(() => {
    if (!selectedModelId) return
    setLoading(true)
    setError('')
    setSelectedLayoutId('')
    setSelectedOptions({})
    setQuantities({})
    setDimensions({})
    setSelectedOptionChoices({})

    Promise.all([layoutService.getLayoutsByModel(selectedModelId), groupService.getGroupsByModel(selectedModelId)])
      .then(async ([layoutList, groupList]) => {
        setLayouts(layoutList)
        setGroups(groupList)
        if (layoutList.length > 0) setSelectedLayoutId(layoutList[0].id)

        const perGroup = await Promise.all(groupList.map(async (g) => ({ groupId: g.id, options: await optionService.getOptionsByGroup(g.id, selectedModelId) })))
        const groupById = new Map(groupList.map((g) => [g.id, g]))
        const byGroup: Record<string, ClientOption[]> = {}
        const defaults: Record<string, string[]> = {}
        perGroup.forEach(({ groupId, options }) => {
          byGroup[groupId] = options
          let defaultIds = options.filter((o) => o.is_default).map((o) => o.id)
          // A single-select group can only have one default selected — if the data has
          // several (e.g. left over from duplicating a model/option), keep just the first.
          if (groupById.get(groupId)?.selection_type === 'single' && defaultIds.length > 1) {
            defaultIds = defaultIds.slice(0, 1)
          }
          if (defaultIds.length > 0) defaults[groupId] = defaultIds
        })
        setOptionsByGroup(byGroup)
        setSelectedOptions(defaults)
      })
      .catch(() => setError('Не удалось загрузить конфигуратор'))
      .finally(() => setLoading(false))
  }, [selectedModelId])

  const visibleModels = useMemo(() => {
    if (publishedModelIds === null) return models
    const published = new Set(publishedModelIds.map(String))
    return models.filter((m) => published.has(m.id))
  }, [models, publishedModelIds])
  const selectedModel = useMemo(() => visibleModels.find((m) => m.id === selectedModelId) ?? null, [visibleModels, selectedModelId])
  const selectedLayout = useMemo(() => layouts.find((l) => l.id === selectedLayoutId) ?? null, [layouts, selectedLayoutId])
  const selectedOptionIds = useMemo(() => Object.values(selectedOptions).flat(), [selectedOptions])
  const selectedOptionEntities = useMemo(() => Object.values(optionsByGroup).flat().filter((o) => selectedOptionIds.includes(o.id)), [optionsByGroup, selectedOptionIds])
  const previewImageUrl = selectedModel?.image_url || ''

  const deliveryBreakdowns = useMemo(
    () =>
      groups
        .filter((g) => g.block_type === 'delivery')
        .flatMap((g) => {
          const config = deliveryConfigs[g.id]
          if (!config) return []
          const km = parseFloat(deliveryKm[g.id] || '0') || 0
          if (km <= 0) return []
          const lines: { label: string; cost: number }[] = []
          if (config.base?.label) lines.push({ label: config.base.label, cost: (config.base.base_price || 0) + (config.base.price_per_km || 0) * km })
          for (const rule of config.option_rules || []) {
            if (selectedOptionIds.includes(rule.option_id)) lines.push({ label: rule.label, cost: (rule.base_price || 0) + (rule.price_per_km || 0) * km })
          }
          return [{ groupId: g.id, km, lines, total: lines.reduce((sum, l) => sum + l.cost, 0) }]
        }),
    [groups, deliveryConfigs, deliveryKm, selectedOptionIds]
  )
  const deliveryTotal = useMemo(() => deliveryBreakdowns.reduce((sum, b) => sum + b.total, 0), [deliveryBreakdowns])

  const totalPrice = useMemo(() => {
    const base = selectedModel?.base_price ?? 0
    const layout = selectedLayout?.price_modifier ?? 0
    const options = selectedOptionEntities.reduce((sum, o) => {
      const choicePrice = selectedOptionChoices[o.id]?.price ?? 0
      const isDimension = o.max_length > 0 || o.max_width > 0
      if (isDimension) {
        const dim = dimensions[o.id]
        // An option might only use ONE axis (e.g. length-only, no width slider) — a missing/0
        // axis means "not applicable", not "zero it out", so it must default to 1, not 0.
        return sum + o.base_price + o.price_modifier * (dim?.length || 1) * (dim?.width || 1) + choicePrice
      }
      return sum + o.base_price + o.price_modifier * (quantities[o.id] ?? 1) + choicePrice
    }, 0)
    return base + layout + options + deliveryTotal
  }, [selectedModel, selectedLayout, selectedOptionEntities, quantities, dimensions, deliveryTotal, selectedOptionChoices])

  const allOptions = useMemo(() => Object.values(optionsByGroup).flat(), [optionsByGroup])
  const optionNameById = (id: string) => allOptions.find((o) => o.id === id)?.name || ''
  const groupNameById = (id: string) => groups.find((g) => g.id === id)?.name || ''
  const groupIdByOptionId = (optionId: string): string | null => {
    for (const [groupId, options] of Object.entries(optionsByGroup)) {
      if (options.some((o) => o.id === optionId)) return groupId
    }
    return null
  }

  // Map of optionId -> conflicting selections that should be cleared if this option is chosen
  const conflictMap = useMemo(() => {
    const map: Record<string, { ruleKind: 'option' | 'group'; selectedOptionId: string; ruleGroupName: string }[]> = {}
    const optionsInGroup = (groupId: string) => (optionsByGroup[groupId] || []).map((o) => o.id)
    const activeIdsFor = (kind: 'option' | 'group', id: string) => (kind === 'option' ? (selectedOptionIds.includes(id) ? [id] : []) : optionsInGroup(id).filter((oid) => selectedOptionIds.includes(oid)))
    const targetIdsFor = (kind: 'option' | 'group', id: string) => (kind === 'option' ? [id] : optionsInGroup(id))
    const addRule = (targets: string[], activeSelections: string[], ruleKind: 'option' | 'group', ruleId: string) => {
      const ruleGroupName = ruleKind === 'group' ? groupNameById(ruleId) : ''
      targets.forEach((targetId) => {
        if (!map[targetId]) map[targetId] = []
        activeSelections.forEach((selId) => map[targetId].push({ ruleKind, selectedOptionId: selId, ruleGroupName }))
      })
    }
    exclusions.forEach((ex) => {
      const activeA = activeIdsFor(ex.a_type, ex.a_id)
      const activeB = activeIdsFor(ex.b_type, ex.b_id)
      if (activeA.length > 0) addRule(targetIdsFor(ex.b_type, ex.b_id), activeA, ex.a_type, ex.a_id)
      if (activeB.length > 0) addRule(targetIdsFor(ex.a_type, ex.a_id), activeB, ex.b_type, ex.b_id)
    })
    selectedOptionIds.forEach((id) => delete map[id])
    return map
  }, [exclusions, selectedOptionIds, optionsByGroup, groups])

  const disabledOptionIds = useMemo(() => new Set(Object.keys(conflictMap)), [conflictMap])

  // "When X is selected, show/hide Y" — distinct from exclusions (which grey out an
  // incompatible option but keep it visible), these rules remove the target from view entirely.
  const { hiddenGroupIds, hiddenOptionIds } = useMemo(() => {
    const optionsInGroup = (groupId: string) => (optionsByGroup[groupId] || []).map((o) => o.id)
    const isTriggerActive = (rule: VisibilityRule) =>
      rule.trigger_type === 'option' ? selectedOptionIds.includes(rule.trigger_id) : optionsInGroup(rule.trigger_id).some((oid) => selectedOptionIds.includes(oid))

    const key = (type: 'option' | 'group', id: string) => `${type}:${id}`
    const showRulesByTarget = new Map<string, VisibilityRule[]>()
    const hideRulesByTarget = new Map<string, VisibilityRule[]>()
    visibilityRules.forEach((r) => {
      const map = r.effect === 'show' ? showRulesByTarget : hideRulesByTarget
      const k = key(r.target_type, r.target_id)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    })

    const isHidden = (type: 'option' | 'group', id: string) => {
      const k = key(type, id)
      const hideRules = hideRulesByTarget.get(k) || []
      if (hideRules.some(isTriggerActive)) return true
      const showRules = showRulesByTarget.get(k) || []
      if (showRules.length > 0 && !showRules.some(isTriggerActive)) return true
      return false
    }

    const gIds = new Set(groups.filter((g) => isHidden('group', g.id)).map((g) => g.id))
    const oIds = new Set(Object.values(optionsByGroup).flat().filter((o) => isHidden('option', o.id)).map((o) => o.id))
    return { hiddenGroupIds: gIds, hiddenOptionIds: oIds }
  }, [visibilityRules, selectedOptionIds, optionsByGroup, groups])

  // Selecting a trigger option/block can hide other options/blocks — drop any selections made
  // inside them so a now-invisible option can't keep silently contributing to the price.
  useEffect(() => {
    if (hiddenGroupIds.size === 0 && hiddenOptionIds.size === 0) return
    setSelectedOptions((prev) => {
      let changed = false
      const next: Record<string, string[]> = {}
      Object.entries(prev).forEach(([groupId, optionIds]) => {
        if (hiddenGroupIds.has(groupId)) {
          changed = true
          return
        }
        const kept = optionIds.filter((id) => !hiddenOptionIds.has(id))
        if (kept.length !== optionIds.length) changed = true
        next[groupId] = kept
      })
      return changed ? next : prev
    })
  }, [hiddenGroupIds, hiddenOptionIds])

  const reasonPhrasesFor = (rules: { ruleKind: 'option' | 'group'; selectedOptionId: string; ruleGroupName: string }[]) => {
    const seen = new Set<string>()
    const phrases: string[] = []
    rules.forEach((rule) => {
      if (rule.ruleKind === 'group') {
        const key = `group:${rule.ruleGroupName}`
        if (!seen.has(key)) {
          seen.add(key)
          phrases.push(`любая опция из раздела «${rule.ruleGroupName}»`)
        }
      } else {
        const key = `option:${rule.selectedOptionId}`
        if (!seen.has(key)) {
          seen.add(key)
          const optionName = optionNameById(rule.selectedOptionId)
          const groupName = groupNameById(groupIdByOptionId(rule.selectedOptionId) || '')
          phrases.push(groupName ? `опция «${optionName}» в разделе «${groupName}»` : `опция «${optionName}»`)
        }
      }
    })
    return phrases
  }

  const buildConflict = (optionId: string, groupId: string, qty: number, optionName: string): PendingConflict => {
    const rules = conflictMap[optionId] || []
    return {
      optionId,
      groupId,
      qty,
      optionName,
      reasonIds: Array.from(new Set(rules.map((r) => r.selectedOptionId))),
      reasonPhrases: reasonPhrasesFor(rules),
    }
  }

  const resolveConflict = (confirmed: boolean) => {
    if (!confirmed || !pendingConflict) {
      setPendingConflict(null)
      return
    }
    const { optionId, groupId, qty, reasonIds } = pendingConflict
    setSelectedOptions((prev) => {
      const next = { ...prev }
      reasonIds.forEach((rid) => {
        const gid = groupIdByOptionId(rid)
        if (gid) next[gid] = (next[gid] || []).filter((id) => id !== rid)
      })
      const current = next[groupId] || []
      next[groupId] = current.includes(optionId) ? current : [...current, optionId]
      return next
    })
    setQuantities((prev) => {
      const next = { ...prev }
      reasonIds.forEach((rid) => delete next[rid])
      if (qty > 1) next[optionId] = qty
      else delete next[optionId]
      return next
    })
    setDimensions((prev) => {
      const next = { ...prev }
      reasonIds.forEach((rid) => delete next[rid])
      const opt = allOptions.find((o) => o.id === optionId)
      if (opt && (opt.max_length > 0 || opt.max_width > 0)) {
        next[optionId] = { length: opt.max_length > 0 ? 1 : 0, width: opt.max_width > 0 ? 1 : 0 }
      } else {
        delete next[optionId]
      }
      return next
    })
    setPendingConflict(null)
  }

  const toggleOption = (group: ClientGroup, optionId: string) => {
    if (disabledOptionIds.has(optionId)) {
      const name = optionNameById(optionId) || (optionsByGroup[group.id] || []).find((o) => o.id === optionId)?.name || ''
      setPendingConflict(buildConflict(optionId, group.id, 1, name))
      return
    }
    setSelectedOptions((prev) => {
      const current = prev[group.id] || []
      if (group.selection_type === 'single') {
        return !group.required && current.includes(optionId) ? { ...prev, [group.id]: [] } : { ...prev, [group.id]: [optionId] }
      }
      const has = current.includes(optionId)
      return { ...prev, [group.id]: has ? current.filter((id) => id !== optionId) : [...current, optionId] }
    })
  }

  // In a single-select group, activating one stepper/dimension option must deactivate any
  // sibling so the group can't end up with two options priced in at once.
  const clearSiblingsInSingleSelectGroup = (groupId: string, keepOptionId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (group?.selection_type !== 'single') return
    const siblingIds = (optionsByGroup[groupId] || []).map((o) => o.id).filter((id) => id !== keepOptionId)
    if (!siblingIds.length) return
    setQuantities((prev) => {
      const next = { ...prev }
      siblingIds.forEach((id) => delete next[id])
      return next
    })
    setDimensions((prev) => {
      const next = { ...prev }
      siblingIds.forEach((id) => delete next[id])
      return next
    })
  }

  const setQuantity = (optionId: string, qty: number) => {
    if (qty > 0 && disabledOptionIds.has(optionId)) {
      const groupId = groupIdByOptionId(optionId)
      if (!groupId) return
      setPendingConflict(buildConflict(optionId, groupId, qty, optionNameById(optionId)))
      return
    }
    const groupId = groupIdByOptionId(optionId)
    if (!groupId) return
    setQuantities((prev) => {
      if (qty <= 0) {
        const next = { ...prev }
        delete next[optionId]
        return next
      }
      return { ...prev, [optionId]: qty }
    })
    setSelectedOptions((prev) => {
      const current = prev[groupId] || []
      const has = current.includes(optionId)
      if (qty <= 0) return has ? { ...prev, [groupId]: current.filter((id) => id !== optionId) } : prev
      const group = groups.find((g) => g.id === groupId)
      if (group?.selection_type === 'single') return { ...prev, [groupId]: [optionId] }
      return has ? prev : { ...prev, [groupId]: [...current, optionId] }
    })
    if (qty > 0) clearSiblingsInSingleSelectGroup(groupId, optionId)
  }

  const setOptionDimensions = (optionId: string, next: { length: number; width: number }) => {
    const groupId = groupIdByOptionId(optionId)
    if (!groupId) return
    const length = Math.max(0, Math.round(next.length))
    const width = Math.max(0, Math.round(next.width))
    const isSelected = length > 0 || width > 0
    if (isSelected && disabledOptionIds.has(optionId)) {
      setPendingConflict(buildConflict(optionId, groupId, 1, optionNameById(optionId)))
      return
    }
    setDimensions((prev) => {
      if (!isSelected) {
        const copy = { ...prev }
        delete copy[optionId]
        return copy
      }
      return { ...prev, [optionId]: { length, width } }
    })
    setSelectedOptions((prev) => {
      const current = prev[groupId] || []
      const has = current.includes(optionId)
      if (!isSelected) return has ? { ...prev, [groupId]: current.filter((id) => id !== optionId) } : prev
      const group = groups.find((g) => g.id === groupId)
      if (group?.selection_type === 'single') return { ...prev, [groupId]: [optionId] }
      return has ? prev : { ...prev, [groupId]: [...current, optionId] }
    })
    if (isSelected) clearSiblingsInSingleSelectGroup(groupId, optionId)
  }

  const createOffer = async () => {
    if (!selectedModelId) {
      setError('Выберите модель')
      return
    }
    if (layouts.length > 0 && !selectedLayoutId) {
      setError('Выберите планировку')
      return
    }
    setSaving(true)
    setError('')
    try {
      const optionChoices: Record<string, { name: string; price: number }> = {}
      for (const id of selectedOptionIds) {
        const choice = selectedOptionChoices[id]
        if (choice) optionChoices[id] = { name: choice.name, price: choice.price }
      }
      const optionDimensions: Record<string, { length: number; width: number }> = {}
      for (const id of selectedOptionIds) {
        const dim = dimensions[id]
        if (dim && (dim.length > 0 || dim.width > 0)) optionDimensions[id] = dim
      }
      const account = getAccountFromLocation()
      const result = await calculationService.createCalculation({
        model_id: selectedModelId,
        layout_id: selectedLayoutId || '0',
        selected_options: selectedOptionIds.map((id) => ({ id, qty: quantities[id] ?? 1 })),
        total_price: totalPrice,
        option_choices: Object.keys(optionChoices).length > 0 ? optionChoices : undefined,
        option_dimensions: Object.keys(optionDimensions).length > 0 ? optionDimensions : undefined,
        account: account || undefined,
      })
      setOfferLink(`${window.location.origin}/calc/${result.public_slug}`)
    } catch {
      setError('Не удалось создать предложение')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    if (!offerLink) return
    await navigator.clipboard.writeText(offerLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activePopupBlock = openPopupId ? popupBlocks.find((b) => b.id === openPopupId) ?? null : null

  const designProps: DesignProps = {
    workspaceName,
    chatWelcome,
    chatDelaySeconds,
    chatAnimations,
    chatShowFrom,
    chatShowUntil,
    pageTitle,
    pageSubtitle,
    ctaText,
    offerNote,
    groupTexts,
    deliveryConfigs,
    deliveryKm,
    setDeliveryKm: (groupId, km) => setDeliveryKmState((prev) => ({ ...prev, [groupId]: km })),
    deliveryBreakdowns,
    models: visibleModels,
    selectedModelId,
    layouts,
    selectedLayoutId,
    groups,
    optionsByGroup,
    selectedOptions,
    quantities,
    dimensions,
    disabledOptionIds,
    hiddenGroupIds,
    hiddenOptionIds,
    loading,
    saving,
    offerLink,
    error,
    copied,
    selectedModel,
    selectedLayout,
    selectedOptionEntities,
    previewImageUrl,
    totalPrice,
    fmt: (n) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n),
    onModelChange: setSelectedModelId,
    onLayoutChange: setSelectedLayoutId,
    toggleOption,
    setQuantity,
    setOptionDimensions,
    createOffer,
    copyLink,
    onEnlargePhoto: setEnlargedPhotoUrl,
    popupBlocks,
    onOpenPopup: setOpenPopupId,
    contactBlocks,
    selectedOptionChoices,
    onOptionChoiceSelect: (optionId, choice) => setSelectedOptionChoices((prev) => ({ ...prev, [optionId]: choice })),
  }

  // "modern" and "minimal" designs are not yet ported from production — fall back to "classic"
  void clientDesign

  return (
    <>
      <ClassicDesign {...designProps} />
      {activePopupBlock?.type === 'inclusion' && (
        <InclusionPopup title={activePopupBlock.title} sections={sectionsForModel(activePopupBlock.data.sections, selectedModelId)} onClose={() => setOpenPopupId(null)} />
      )}
      {pendingConflict && (
        <ConflictDialog
          optionName={pendingConflict.optionName}
          reasonPhrases={pendingConflict.reasonPhrases}
          onCancel={() => resolveConflict(false)}
          onConfirm={() => resolveConflict(true)}
        />
      )}
      {enlargedPhotoUrl && <ImageLightbox url={enlargedPhotoUrl} onClose={() => setEnlargedPhotoUrl(null)} />}
    </>
  )
}
