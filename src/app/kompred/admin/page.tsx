'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ThemeToggle } from '@/components/ThemeProvider'

// ── Types ──────────────────────────────────────────────────────────────────

interface CropRect {
  mode?: 'position' | 'crop'
  x: number
  y: number
  w?: number
  h?: number
}

interface AdminModel {
  id: string
  name: string
  image_url: string
  image_crop: string | null
  base_price: string
  sort_order: number
}

interface AdminGroup {
  id: string
  name: string
  sort_order: string
  selection_type: 'single' | 'multiple'
  block_type: 'options' | 'delivery' | 'popup' | 'contacts' | 'text' | 'photo' | 'photo2' | 'gallery' | 'video'
  parent_group_id: string | null
  required: string
  enlarge_photo: string
  model_ids: number[] | null
  layout_ids: number[] | null
}

interface PopupChoice {
  id: string
  name: string
  price: string
  image_url: string
}

interface AdminOption {
  id: string
  group_id: string
  name: string
  price: string
  base_price: string
  is_default: boolean
  description: string
  popup_options: PopupChoice[] | null
  image_url: string
  image_crop: string | null
  model_ids: number[]
  active_model_ids: number[]
  sort_order: number
  max_quantity: number
  max_length: number
  max_width: number
  unit: string
  model_photos: Record<string, { image_url: string; image_crop: string | null }>
}

interface Exclusion {
  id: string
  a_type: 'option' | 'group'
  a_id: number
  b_type: 'option' | 'group'
  b_id: number
}

interface VisibilityRule {
  id: string
  trigger_type: 'option' | 'group'
  trigger_id: number
  target_type: 'option' | 'group'
  target_id: number
  effect: 'show' | 'hide'
}

interface MediaItem {
  id: number
  file_url: string
  file_name: string
  mime_type: string
}

interface DeliveryRule {
  option_id: string
  label: string
  base_price: number
  price_per_km: number
}

interface DeliveryConfig {
  km_label: string
  base: { label: string; base_price: number; price_per_km: number }
  option_rules: DeliveryRule[]
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

interface ContactBlock {
  id: string
  title?: string
  data: { phone?: string; telegram?: string; whatsapp?: string; email?: string; address?: string; note?: string }
}

interface Subscription {
  status: 'active' | 'trial' | 'trial_expiring' | 'expired'
  daysLeft: number | null
  isPaid: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCropSafe(raw: string | null): CropRect | null {
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

// Image bytes are fetched server-side by /api/img-proxy, which runs on the same box as the
// PHP backend — so this must stay a loopback address, never the public IP (port 8080 there
// is firewalled to localhost-only).
function normalizeImageUrl(url: string): string {
  if (!url) return ''
  const full = url.startsWith('http') ? url : `http://127.0.0.1:8080${url.startsWith('/') ? '' : '/'}${url}`
  return full.startsWith('http://') ? `/api/img-proxy?url=${encodeURIComponent(full)}` : full
}

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n)

// Custom admin domains (no /admin{N} path) resolve their account by hostname instead.
const HOSTNAME_ACCOUNT_MAP: Record<string, string> = {
  'siberiaa.ru': '1238',
  'www.siberiaa.ru': '1238',
}

async function phpGet(action: string, params: Record<string, string> = {}): Promise<any> {
  const sp = new URLSearchParams({ action, ...params })
  return fetch(`/api/php-proxy?${sp}`, { cache: 'no-store' }).then((r) => r.json())
}

async function phpPost(action: string, body: Record<string, unknown>): Promise<any> {
  return fetch(`/api/php-proxy?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json())
}

async function uploadMedia(file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
  const formData = new FormData()
  formData.append('file', file)
  return fetch('/api/php-upload', { method: 'POST', body: formData }).then((r) => r.json())
}

async function patchWorkspaceSettings(body: Record<string, unknown>): Promise<void> {
  await fetch('/api/workspace-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}

// ── Small shared UI ──────────────────────────────────────────────────────────

function CroppedImage({ src, crop, alt }: { src: string; crop?: CropRect | null; alt?: string }) {
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
      if (!cw || !ch) {
        requestAnimationFrame(apply)
        return
      }
      const { x, y, w = 100, h = 100 } = crop
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      const scale = Math.max(cw / (nw * w / 100), ch / (nh * h / 100))
      img.style.width = `${nw * scale}px`
      img.style.height = `${nh * scale}px`
      img.style.left = `${-(nw * x / 100) * scale}px`
      img.style.top = `${-(nh * y / 100) * scale}px`
    }
    if (img.complete && img.naturalWidth) requestAnimationFrame(apply)
    else img.addEventListener('load', apply, { once: true })
    return () => img.removeEventListener('load', apply)
  }, [crop, src])

  if (crop && crop.mode !== 'position') {
    return (
      <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={normalizeImageUrl(src)}
          aria-hidden
          style={{ position: 'absolute', top: -32, left: -32, width: 'calc(100% + 64px)', height: 'calc(100% + 64px)', objectFit: 'cover', filter: 'blur(20px) saturate(1.2)', pointerEvents: 'none' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={normalizeImageUrl(src)} alt={alt ?? ''} style={{ position: 'absolute', maxWidth: 'none', maxHeight: 'none', zIndex: 1 }} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizeImageUrl(src)}
      alt={alt ?? ''}
      className="h-full w-full object-cover"
      style={crop?.mode === 'position' ? { objectPosition: `${crop.x}% ${crop.y}%` } : undefined}
    />
  )
}

function RepositionableImage({
  src,
  crop,
  alt,
  onReposition,
  onChangePicker,
  onCropEditor,
}: {
  src: string
  crop?: CropRect | null
  alt?: string
  onReposition: (x: number, y: number) => void
  onChangePicker: () => void
  onCropEditor: () => void
}) {
  const [live, setLive] = useState<CropRect | null>(null)
  const drag = useRef<{ active: boolean; startX: number; startY: number; startOX: number; startOY: number; liveX: number; liveY: number } | null>(null)

  return (
    <div
      className="absolute inset-0 cursor-move touch-none select-none"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        const x = crop?.mode === 'position' ? crop.x : 50
        const y = crop?.mode === 'position' ? crop.y : 50
        drag.current = { active: true, startX: e.clientX, startY: e.clientY, startOX: x, startOY: y, liveX: x, liveY: y }
      }}
      onPointerMove={(e) => {
        if (!drag.current?.active) return
        const rect = e.currentTarget.getBoundingClientRect()
        const dx = e.clientX - drag.current.startX
        const dy = e.clientY - drag.current.startY
        const x = Math.max(0, Math.min(100, drag.current.startOX - (dx / rect.width) * 100))
        const y = Math.max(0, Math.min(100, drag.current.startOY - (dy / rect.height) * 100))
        drag.current.liveX = x
        drag.current.liveY = y
        setLive({ x, y, w: 100, h: 100, mode: 'position' })
      }}
      onPointerUp={(e) => {
        if (!drag.current?.active) return
        const moved = Math.abs(e.clientX - drag.current.startX) > 4 || Math.abs(e.clientY - drag.current.startY) > 4
        const { liveX, liveY } = drag.current
        drag.current.active = false
        setLive(null)
        if (moved) onReposition(liveX, liveY)
      }}
      onPointerCancel={() => {
        drag.current = null
        setLive(null)
      }}
    >
      <CroppedImage src={src} crop={live ?? crop} alt={alt} />
      <div className="absolute bottom-1.5 right-1.5 z-10 flex gap-1">
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onChangePicker} className="rounded-lg bg-black/60 px-2 py-1 text-[11px] font-bold text-white hover:bg-black/80" title="Изменить фото">
          📷
        </button>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onCropEditor} className="rounded-lg bg-black/60 px-2 py-1 text-[11px] font-bold text-white hover:bg-black/80" title="Кадрировать">
          ✂
        </button>
      </div>
    </div>
  )
}

// ── Crop editor modal (pan/zoom) ─────────────────────────────────────────────

function CropEditorModal({
  imageUrl,
  initialCrop,
  onConfirm,
  onCancel,
  onSkipCrop,
  aspect = '4/3',
}: {
  imageUrl: string
  initialCrop?: CropRect | null
  onConfirm: (crop: CropRect) => void
  onCancel: () => void
  onSkipCrop?: () => void
  aspect?: '1/1' | '4/3'
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const state = useRef({
    nw: 0,
    nh: 0,
    W: 360,
    H: 270,
    scale: 1,
    tx: 0,
    ty: 0,
    fitRatio: 1,
    panActive: false,
    panSX: 0,
    panSY: 0,
    panSTx: 0,
    panSTy: 0,
    pinchActive: false,
    pinchDist: 0,
    pinchScale: 0,
    pinchSTx: 0,
    pinchSTy: 0,
    pinchMidX: 0,
    pinchMidY: 0,
  })
  const [, forceRender] = useState(0)
  const tick = () => forceRender((n) => n + 1)

  const fitScale = () => {
    const { nw, nh, W, H } = state.current
    return nw && nh ? Math.max(W / nw, H / nh) : 1
  }

  const clampPan = (tx: number, ty: number, scale: number) => {
    const { nw, nh, W, H } = state.current
    const s = fitScale()
    const w = nw * s * scale
    const h = nh * s * scale
    return {
      tx: Math.max(Math.min(0, W - w), Math.min(Math.max(0, W - w), tx)),
      ty: Math.max(Math.min(0, H - h), Math.min(Math.max(0, H - h), ty)),
    }
  }

  const zoomTo = (scale: number, anchorX: number, anchorY: number) => {
    const { scale: prevScale, tx, ty } = state.current
    const next = Math.max(0.5 * state.current.fitRatio, Math.min(5, scale))
    const ratio = next / prevScale
    const clamped = clampPan(anchorX - (anchorX - tx) * ratio, anchorY - (anchorY - ty) * ratio, next)
    state.current.scale = next
    state.current.tx = clamped.tx
    state.current.ty = clamped.ty
    tick()
  }

  const fitImage = (nw: number, nh: number, W: number, H: number) => {
    const s = Math.max(W / nw, H / nh)
    const fitRatio = Math.min(W / nw, H / nh) / s
    state.current.fitRatio = fitRatio
    if (initialCrop && initialCrop.mode !== 'position' && (initialCrop.w || 0) > 0 && (initialCrop.h || 0) > 0) {
      const scale = Math.max(0.5 * fitRatio, Math.max(W / ((initialCrop.w! / 100) * nw * s), H / ((initialCrop.h! / 100) * nh * s)))
      const w = nw * s * scale
      const h = nh * s * scale
      const tx = -((initialCrop.x / 100) * nw * s * scale)
      const ty = -((initialCrop.y / 100) * nh * s * scale)
      state.current.scale = scale
      state.current.tx = Math.max(Math.min(0, W - w), Math.min(Math.max(0, W - w), tx))
      state.current.ty = Math.max(Math.min(0, H - h), Math.min(Math.max(0, H - h), ty))
    } else {
      state.current.scale = fitRatio
      state.current.tx = (W - nw * s * fitRatio) / 2
      state.current.ty = (H - nh * s * fitRatio) / 2
    }
    tick()
  }

  const computeCrop = (): CropRect => {
    const { nw, nh, W, H, scale, tx, ty } = state.current
    const s = fitScale()
    return {
      x: (-tx / (s * scale) / nw) * 100,
      y: (-ty / (s * scale) / nh) * 100,
      w: (W / (s * scale) / nw) * 100,
      h: (H / (s * scale) / nh) * 100,
    }
  }

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = box.getBoundingClientRect()
      zoomTo(state.current.scale * (e.deltaY > 0 ? 1 / 1.12 : 1.12), e.clientX - rect.left, e.clientY - rect.top)
    }
    const onTouchMove = (e: TouchEvent) => {
      const s = state.current
      if (e.touches.length === 2 && s.pinchActive) {
        e.preventDefault()
        const [t1, t2] = Array.from(e.touches)
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        const rect = box.getBoundingClientRect()
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top
        const nextScale = Math.max(0.5 * s.fitRatio, Math.min(5, (s.pinchScale * dist) / s.pinchDist))
        const ratio = nextScale / s.pinchScale
        const clamped = clampPan(s.pinchMidX - (s.pinchMidX - s.pinchSTx) * ratio + (midX - s.pinchMidX), s.pinchMidY - (s.pinchMidY - s.pinchSTy) * ratio + (midY - s.pinchMidY), nextScale)
        s.scale = nextScale
        s.tx = clamped.tx
        s.ty = clamped.ty
        tick()
      } else if (e.touches.length === 1 && s.panActive) {
        e.preventDefault()
        const t = e.touches[0]
        const clamped = clampPan(s.panSTx + t.clientX - s.panSX, s.panSTy + t.clientY - s.panSY, s.scale)
        s.tx = clamped.tx
        s.ty = clamped.ty
        tick()
      }
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    box.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      box.removeEventListener('wheel', onWheel)
      box.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver((entries) => {
      const [entry] = entries
      state.current.W = entry.contentRect.width
      state.current.H = entry.contentRect.height
      if (state.current.nw) {
        const clamped = clampPan(state.current.tx, state.current.ty, state.current.scale)
        state.current.tx = clamped.tx
        state.current.ty = clamped.ty
        tick()
      }
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  const endPan = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') state.current.panActive = false
  }

  const { scale, tx, ty, nw, nh, W, H } = state.current
  const s = fitScale()

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onCancel}>
      <div className="flex w-full flex-col rounded-t-2xl bg-white dark:bg-[#252119] shadow-2xl sm:max-w-lg sm:rounded-2xl" style={{ maxHeight: '95dvh' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-[#2e2820] px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#e8e2d9]">
            Позиция фото
            {aspect === '1/1' && <span className="ml-1.5 font-normal text-slate-400 dark:text-[#6a5f57]">— как в квадратном превью у клиента</span>}
          </h2>
          <button onClick={onCancel} className="rounded-lg p-2 text-slate-400 dark:text-[#6a5f57] hover:bg-slate-100 dark:hover:bg-[#2e2820]">
            ✕
          </button>
        </div>
        <div className="flex shrink-0 items-center justify-center bg-slate-100 dark:bg-[#1a1815] p-4">
          <div
            ref={boxRef}
            className="relative w-full max-w-sm overflow-hidden rounded-xl cursor-move select-none bg-slate-300 dark:bg-[#2a2520]"
            style={{ aspectRatio: aspect, touchAction: 'none' }}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return
              e.currentTarget.setPointerCapture(e.pointerId)
              const s = state.current
              s.panActive = true
              s.panSX = e.clientX
              s.panSY = e.clientY
              s.panSTx = s.tx
              s.panSTy = s.ty
            }}
            onPointerMove={(e) => {
              if (e.pointerType === 'touch' || !state.current.panActive) return
              const s = state.current
              const clamped = clampPan(s.panSTx + e.clientX - s.panSX, s.panSTy + e.clientY - s.panSY, s.scale)
              s.tx = clamped.tx
              s.ty = clamped.ty
              tick()
            }}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onTouchStart={(e) => {
              const s = state.current
              if (e.touches.length === 2) {
                s.panActive = false
                const [t1, t2] = Array.from(e.touches)
                const rect = boxRef.current!.getBoundingClientRect()
                s.pinchActive = true
                s.pinchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
                s.pinchScale = s.scale
                s.pinchSTx = s.tx
                s.pinchSTy = s.ty
                s.pinchMidX = (t1.clientX + t2.clientX) / 2 - rect.left
                s.pinchMidY = (t1.clientY + t2.clientY) / 2 - rect.top
              } else if (e.touches.length === 1) {
                s.pinchActive = false
                const t = e.touches[0]
                s.panActive = true
                s.panSX = t.clientX
                s.panSY = t.clientY
                s.panSTx = s.tx
                s.panSTy = s.ty
              }
            }}
            onTouchEnd={() => {
              state.current.panActive = false
              state.current.pinchActive = false
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={normalizeImageUrl(imageUrl)}
              aria-hidden
              draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(24px) saturate(1.3) brightness(0.6)', transform: 'scale(1.2)', transformOrigin: 'center', pointerEvents: 'none', userSelect: 'none' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={normalizeImageUrl(imageUrl)}
              alt=""
              onLoad={() => {
                const img = imgRef.current
                const box = boxRef.current
                if (img && box) {
                  state.current.nw = img.naturalWidth
                  state.current.nh = img.naturalHeight
                  state.current.W = box.clientWidth
                  state.current.H = box.clientHeight
                  fitImage(img.naturalWidth, img.naturalHeight, box.clientWidth, box.clientHeight)
                }
              }}
              draggable={false}
              style={{ position: 'absolute', left: tx, top: ty, width: nw * s * scale || undefined, height: nh * s * scale || undefined, maxWidth: 'none', maxHeight: 'none', pointerEvents: 'none', userSelect: 'none', zIndex: 1 }}
            />
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-x-0 border-t border-white/20" style={{ top: '33.33%' }} />
              <div className="absolute inset-x-0 border-t border-white/20" style={{ top: '66.66%' }} />
              <div className="absolute inset-y-0 border-l border-white/20" style={{ left: '33.33%' }} />
              <div className="absolute inset-y-0 border-l border-white/20" style={{ left: '66.66%' }} />
              <div className="absolute inset-0 rounded-xl ring-2 ring-white/50" />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 dark:border-[#2e2820] px-4 py-3">
          <button onClick={() => zoomTo(scale / 1.2, W / 2, H / 2)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-[#3a312a] text-base leading-none text-slate-500 hover:bg-slate-50 dark:hover:bg-[#2e2820] select-none">
            −
          </button>
          <input type="range" min={Math.floor(50 * state.current.fitRatio)} max={500} step={1} value={Math.round(100 * scale)} onChange={(e) => zoomTo(Number(e.target.value) / 100, W / 2, H / 2)} className="flex-1 accent-emerald-600" />
          <button onClick={() => zoomTo(Math.min(5, 1.2 * scale), W / 2, H / 2)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-[#3a312a] text-base leading-none text-slate-500 hover:bg-slate-50 dark:hover:bg-[#2e2820] select-none">
            +
          </button>
          <span className="w-11 shrink-0 text-right text-xs tabular-nums text-slate-400 dark:text-[#6a5f57]">{Math.round(100 * scale)}%</span>
        </div>
        <p className="shrink-0 px-5 pb-2 text-[11px] text-slate-400 dark:text-[#6a5f57]">Перетащите, масштабируйте — рамка 4:3 показывает, что увидит клиент в карточке</p>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-[#2e2820] px-4 py-3">
          <button onClick={() => fitImage(nw, nh, W, H)} className="rounded-lg border border-slate-200 dark:border-[#3a312a] px-3 py-2 text-sm text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50 dark:hover:bg-[#2e2820]">
            Сбросить
          </button>
          <div className="flex gap-2">
            {onSkipCrop && (
              <button onClick={onSkipCrop} className="rounded-lg border border-slate-200 dark:border-[#3a312a] px-3 py-2 text-sm text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50 dark:hover:bg-[#2e2820]">
                Без кадр.
              </button>
            )}
            <button onClick={onCancel} className="rounded-lg border border-slate-200 dark:border-[#3a312a] px-3 py-2 text-sm text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50 dark:hover:bg-[#2e2820]">
              Отмена
            </button>
            <button onClick={() => onConfirm(computeCrop())} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700">
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Media library modal ──────────────────────────────────────────────────────

function MediaLibraryModal({
  media,
  onSelect,
  onClose,
  onUpload,
  onDelete,
}: {
  media: MediaItem[]
  onSelect: (url: string) => void
  onClose: () => void
  onUpload: (file: File) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Удалить фото из медиатеки?')) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  const images = media.filter((m) => m.mime_type?.startsWith('image'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white dark:bg-[#252119] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2e2820] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800 dark:text-[#e8e2d9]">Выберите изображение</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 dark:text-[#6a5f57] hover:bg-slate-100 dark:hover:bg-[#2e2820] hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-4">
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#3a312a] py-3 text-sm text-slate-500 dark:text-[#9a8f87] transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50">
            {uploading ? '⏳ Загрузка…' : '+ Загрузить новое фото'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {images.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-[#6a5f57]">Медиатека пуста — загрузите первое фото</p>
          ) : (
            <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
              {images.map((m) => (
                <div key={m.id} className="group relative aspect-square">
                  <button onClick={() => onSelect(m.file_url)} className="h-full w-full overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-emerald-500 hover:shadow-md" title={m.file_name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={normalizeImageUrl(m.file_url)} alt={m.file_name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, m.id)}
                    disabled={deletingId === m.id}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    title="Удалить"
                  >
                    {deletingId === m.id ? '…' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sortable wrappers ────────────────────────────────────────────────────────

function DragHandleRow({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={`flex h-5 w-full items-center justify-center rounded-t-xl text-xs text-slate-300 dark:text-[#4a4038] hover:bg-slate-200 dark:bg-[#38322a] hover:text-slate-500 dark:text-[#9a8f87] ${disabled ? 'cursor-default' : 'cursor-grab touch-none active:cursor-grabbing'}`}
        style={{ touchAction: 'none' }}
      >
        {!disabled && '⠿'}
      </div>
      {children}
    </div>
  )
}

function DragHandleRender({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = (
    <div ref={setActivatorNodeRef} {...attributes} {...listeners} className="cursor-grab px-2 text-slate-300 dark:text-[#4a4038] hover:text-slate-500 dark:text-[#9a8f87] active:cursor-grabbing" style={{ touchAction: 'none' }}>
      ⠿
    </div>
  )
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      {children(handle)}
    </div>
  )
}

function ModelListItem({
  model,
  isSelected,
  published,
  onSelect,
  onCopy,
  onDelete,
  onTogglePublish,
}: {
  model: AdminModel
  isSelected: boolean
  published: boolean
  onSelect: () => void
  onCopy: () => void
  onDelete: () => void
  onTogglePublish: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: model.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-stretch border-r-2 transition-colors hover:bg-slate-50 dark:hover:bg-[#2a2520] dark:bg-[#1f1c16] ${isSelected ? 'border-[#0d5a52] bg-emerald-50/60' : 'border-transparent'}`}
    >
      <div ref={setActivatorNodeRef} {...attributes} {...listeners} className="flex cursor-grab items-center px-1.5 text-slate-200 hover:text-slate-400 dark:text-[#6a5f57] active:cursor-grabbing" style={{ touchAction: 'none' }}>
        ⠿
      </div>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-start gap-2 py-2.5 pr-1 text-left">
        <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {model.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={normalizeImageUrl(model.image_url)} alt={model.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg opacity-20">📷</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`break-words text-sm font-medium leading-tight ${isSelected ? 'text-[#0d5a52]' : 'text-slate-700 dark:text-[#d5cfc7]'}`} style={{ wordBreak: 'break-word' }}>
            {model.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-xs text-slate-400 dark:text-[#6a5f57]">{fmt(Number(model.base_price))} ₽</span>
            {published ? (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-px text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">опубл.</span>
            ) : (
              <span className="rounded-full bg-slate-100 dark:bg-[#2e2820] px-1.5 py-px text-[10px] font-semibold text-slate-400 dark:text-[#6a5f57]">черновик</span>
            )}
          </div>
        </div>
      </button>
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 pr-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onTogglePublish} title={published ? 'Скрыть от клиента' : 'Опубликовать для клиента'} className={`rounded p-1 transition-colors ${published ? 'text-emerald-500 hover:text-slate-400' : 'text-slate-300 dark:text-[#4a4038] hover:text-emerald-500'}`}>
          {published ? (
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5S1 8 1 8z" />
              <circle cx="7.5" cy="8" r="2" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1l13 13M6.2 3.2A6.5 6.5 0 0 1 7.5 3c4 0 6.5 5 6.5 5a13 13 0 0 1-2.1 3M3.8 6.8A13 13 0 0 0 1 8s2.5 5 6.5 5a6.5 6.5 0 0 0 3.3-.9" />
            </svg>
          )}
        </button>
        <button onClick={onCopy} title="Копировать" className="rounded p-1 text-slate-300 dark:text-[#4a4038] hover:text-[#0d5a52]">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 10V2.5A1.5 1.5 0 0 1 4.5 1H10" />
          </svg>
        </button>
        <button onClick={onDelete} title="Удалить" className="rounded p-1 text-slate-300 dark:text-[#4a4038] hover:text-red-500">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h11M5 4V2.5A.5.5 0 0 1 5.5 2h4a.5.5 0 0 1 .5.5V4M6 7v5M9 7v5" />
            <rect x="3" y="4" width="9" height="9" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Delivery config editor ───────────────────────────────────────────────────

function DeliveryConfigEditor({
  config,
  allOptions,
  saving,
  onSave,
}: {
  groupId: string
  config: DeliveryConfig
  allOptions: AdminOption[]
  saving: boolean
  onSave: (config: DeliveryConfig) => void
}) {
  const [draft, setDraft] = useState(config)
  useEffect(() => setDraft(config), [config.km_label, config.base.label])

  const updateBase = (patch: Partial<DeliveryConfig['base']>) => setDraft((d) => ({ ...d, base: { ...d.base, ...patch } }))
  const updateRule = (idx: number, patch: Partial<DeliveryRule>) =>
    setDraft((d) => {
      const rules = [...d.option_rules]
      rules[idx] = { ...rules[idx], ...patch }
      return { ...d, option_rules: rules }
    })
  const removeRule = (idx: number) => setDraft((d) => ({ ...d, option_rules: d.option_rules.filter((_, i) => i !== idx) }))

  const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1f1c16] px-2.5 py-1.5 text-xs focus:border-[#0d5a52] focus:outline-none'
  const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#6a5f57]'

  return (
    <div className="mb-4 space-y-4">
      <div>
        <span className={labelClass}>Метка расстояния</span>
        <input value={draft.km_label} onChange={(e) => setDraft((d) => ({ ...d, km_label: e.target.value }))} placeholder="км от МКАД" className={inputClass} />
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-[#3a312a] p-3 space-y-2">
        <span className={labelClass}>Базовая доставка</span>
        <div>
          <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Название строки</span>
          <input value={draft.base.label} onChange={(e) => updateBase({ label: e.target.value })} placeholder="Доставка изделия" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Базовая цена, руб.</span>
            <input type="number" min="0" value={draft.base.base_price} onChange={(e) => updateBase({ base_price: parseFloat(e.target.value) || 0 })} className={inputClass} />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Цена за км, руб.</span>
            <input type="number" min="0" value={draft.base.price_per_km} onChange={(e) => updateBase({ price_per_km: parseFloat(e.target.value) || 0 })} className={inputClass} />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <span className={labelClass}>Доставка для отдельных опций</span>
        {draft.option_rules.map((rule, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-[#3a312a] p-3 space-y-2 relative">
            <button type="button" onClick={() => removeRule(i)} className="absolute right-2 top-2 text-slate-300 dark:text-[#4a4038] hover:text-red-500 text-xs">
              ✕
            </button>
            <div>
              <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Опция</span>
              <select value={rule.option_id} onChange={(e) => updateRule(i, { option_id: e.target.value })} className={inputClass}>
                {allOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Название строки</span>
              <input value={rule.label} onChange={(e) => updateRule(i, { label: e.target.value })} placeholder="Доставка свай" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Базовая цена, руб.</span>
                <input type="number" min="0" value={rule.base_price} onChange={(e) => updateRule(i, { base_price: parseFloat(e.target.value) || 0 })} className={inputClass} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 dark:text-[#6a5f57] mb-1">Цена за км, руб.</span>
                <input type="number" min="0" value={rule.price_per_km} onChange={(e) => updateRule(i, { price_per_km: parseFloat(e.target.value) || 0 })} className={inputClass} />
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const opt = allOptions.find((o) => !draft.option_rules.some((r) => r.option_id === o.id))
            if (opt) setDraft((d) => ({ ...d, option_rules: [...d.option_rules, { option_id: opt.id, label: `Доставка ${opt.name}`, base_price: 0, price_per_km: 0 }] }))
          }}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 dark:border-[#3a312a] px-3 py-2 text-xs text-slate-400 dark:text-[#6a5f57] hover:border-[#0d5a52] hover:text-[#0d5a52] w-full justify-center"
        >
          + Добавить правило
        </button>
      </div>
      <button type="button" onClick={() => onSave(draft)} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d5a52] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0a4840] disabled:opacity-50">
        {saving ? '…' : '✓ Сохранить настройки доставки'}
      </button>
    </div>
  )
}

// ── Popup choice card (draggable) ────────────────────────────────────────────

function PopupChoiceCard({
  choice,
  onImagePick,
  onNameChange,
  onPriceChange,
  onRemove,
}: {
  choice: PopupChoice
  onImagePick: () => void
  onNameChange: (v: string) => void
  onPriceChange: (v: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: choice.id })
  const previewSrc = choice.image_url ? (choice.image_url.startsWith('/api/') ? choice.image_url : `/api/img-proxy?url=${encodeURIComponent(choice.image_url)}`) : null

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }} className="overflow-hidden rounded-xl border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612]">
      <button type="button" onClick={onImagePick} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-[#252119] hover:opacity-90 transition-opacity">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt={choice.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 dark:text-[#6a5f57]">
            <span className="text-2xl">📷</span>
            <span className="text-[10px]">Добавить фото</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
          <span className="opacity-0 hover:opacity-100 text-white text-xs font-semibold drop-shadow">Сменить</span>
        </div>
      </button>
      <div className="flex items-center gap-1.5 p-2">
        <div ref={setActivatorNodeRef} {...attributes} {...listeners} className="shrink-0 cursor-grab text-slate-300 dark:text-[#4a4038] hover:text-slate-500 dark:text-[#9a8f87] active:cursor-grabbing px-0.5" style={{ touchAction: 'none' }}>
          ⠿
        </div>
        <input value={choice.name} onChange={(e) => onNameChange(e.target.value)} placeholder="Название" className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-[#3a312a] bg-slate-50 dark:bg-[#252119] px-2.5 py-1.5 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="number" value={choice.price} onChange={(e) => onPriceChange(e.target.value)} placeholder="₽" className="w-20 shrink-0 rounded-lg border border-slate-200 dark:border-[#3a312a] bg-slate-50 dark:bg-[#252119] px-2 py-1.5 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <button type="button" onClick={onRemove} className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 text-sm">
          ✕
        </button>
      </div>
    </div>
  )
}

// ── Add-block button / picker ────────────────────────────────────────────────

const BLOCK_TYPES: { type: AdminGroup['block_type']; label: string; icon: string }[] = [
  { type: 'options', label: 'Опции', icon: '☑️' },
  { type: 'delivery', label: 'Доставка', icon: '🚚' },
  { type: 'popup', label: 'Попап', icon: '🪄' },
  { type: 'contacts', label: 'Контакты', icon: '📇' },
  { type: 'text', label: 'Текст', icon: '📝' },
  { type: 'photo', label: 'Фото', icon: '🖼️' },
  { type: 'photo2', label: '2 фото', icon: '🗂️' },
  { type: 'gallery', label: 'Галерея', icon: '🎞️' },
  { type: 'video', label: 'Видео', icon: '🎬' },
]

type InsertState = { key: string; step: 'pick' | 'name'; blockType: AdminGroup['block_type']; parentGroupId: string | null } | null

function AddBlockButton({
  posKey,
  insertState,
  name,
  adding,
  onOpen,
  onPickType,
  onChangeName,
  onAdd,
  onCancel,
  label,
}: {
  posKey: string
  insertState: InsertState
  name: string
  adding: boolean
  onOpen: () => void
  onPickType: (t: AdminGroup['block_type']) => void
  onChangeName: (v: string) => void
  onAdd: () => void
  onCancel: () => void
  label?: string
}) {
  if (insertState?.key === posKey) {
    if (insertState.step === 'pick') {
      return (
        <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Выберите тип блока</span>
            <button type="button" onClick={onCancel} className="text-xs text-slate-400 dark:text-[#6a5f57] hover:text-slate-600 dark:text-[#b5afa7]">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPickType(bt.type)
                }}
                className="relative flex flex-col items-center gap-1 rounded-xl border border-emerald-200 bg-white dark:bg-[#252119] px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-[#d5cfc7] transition-colors hover:border-[#0d5a52] hover:bg-emerald-50"
              >
                <span className="text-base">{bt.icon}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-2.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Название блока опций…"
          className="flex-1 rounded-xl border border-emerald-200 bg-white dark:bg-[#252119] px-3 py-1.5 text-sm focus:border-[#0d5a52] focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd()
            if (e.key === 'Escape') onCancel()
          }}
        />
        <button onClick={onAdd} disabled={adding || !name.trim()} className="rounded-xl bg-[#0d5a52] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0a4840] disabled:opacity-50">
          {adding ? '…' : 'Добавить'}
        </button>
        <button onClick={onCancel} className="rounded-xl border border-slate-200 dark:border-[#3a312a] px-2 py-1.5 text-xs text-slate-500 dark:text-[#9a8f87] hover:bg-slate-50">
          ✕
        </button>
      </div>
    )
  }
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 border-b border-slate-100 dark:border-[#2e2820] bg-slate-50 dark:bg-[#1f1c16] px-5 py-2 text-xs font-medium text-slate-400 dark:text-[#6a5f57] transition-colors hover:bg-emerald-50 hover:text-[#0d5a52]">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="shrink-0">＋ {label || 'Добавить блок'}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </button>
  )
}

// ── Exclusion pickers ─────────────────────────────────────────────────────────

type ExclusionItem = { type: 'option' | 'group'; id: string; name: string; groupId?: string; groupName?: string }

function ExclusionChecklist({
  excludeSelf,
  allItems,
  isExcluded,
  onToggle,
}: {
  excludeSelf: ExclusionItem
  allItems: ExclusionItem[]
  isExcluded: (type: 'option' | 'group', id: string) => boolean
  onToggle: (type: 'option' | 'group', id: string) => void
}) {
  const [query, setQuery] = useState('')
  const items = allItems.filter((it) => (it.type !== excludeSelf.type || it.id !== excludeSelf.id) && !(excludeSelf.type === 'group' && it.type === 'option' && it.groupId === excludeSelf.id))
  const excludedItems = items.filter((it) => isExcluded(it.type, it.id))
  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter((it) => it.name.toLowerCase().includes(q) || (it.groupName || '').toLowerCase().includes(q)) : items
  const groups = filtered.filter((it) => it.type === 'group')
  const options = filtered.filter((it) => it.type === 'option')

  const row = (it: ExclusionItem) => (
    <label key={`${it.type}:${it.id}`} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50 dark:hover:bg-[#2a2520]">
      <input type="checkbox" checked={isExcluded(it.type, it.id)} onChange={() => onToggle(it.type, it.id)} className="h-3.5 w-3.5 rounded accent-amber-600" />
      <span className="flex-1 truncate text-slate-700 dark:text-[#d5cfc7]">
        {it.name}
        {it.type === 'option' && it.groupName && <span className="text-slate-400 dark:text-[#6a5f57]"> · {it.groupName}</span>}
      </span>
    </label>
  )

  return (
    <div>
      {excludedItems.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {excludedItems.map((it) => (
            <span key={`${it.type}:${it.id}`} className="flex items-center gap-1 rounded-full border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-400">
              {it.name}
              <button type="button" onClick={() => onToggle(it.type, it.id)} className="text-amber-500 hover:text-amber-700" title="Убрать исключение">
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-2 text-xs text-slate-400 dark:text-[#6a5f57]">Пока ничего не исключено</div>
      )}
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти блок или опцию, чтобы исключить…" className="w-full rounded border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1f1c16] px-2 py-1 text-xs focus:border-amber-400 focus:outline-none" />
      {groups.length === 0 && options.length === 0 ? (
        <div className="px-1 py-1.5 text-xs text-slate-400 dark:text-[#6a5f57]">Ничего не найдено</div>
      ) : (
        <>
          {groups.length > 0 && (
            <>
              <div className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">Блоки</div>
              {groups.map(row)}
            </>
          )}
          {options.length > 0 && (
            <>
              <div className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">Опции</div>
              {options.map(row)}
            </>
          )}
        </>
      )}
    </div>
  )
}

function ExclusionPopover({ anchorTop, anchorBottom, left, width = 256, onClose, children }: { anchorTop: number; anchorBottom: number; left: number; width?: number; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  if (typeof document === 'undefined') return null
  const spaceBelow = window.innerHeight - anchorBottom
  const left2 = Math.max(8, Math.min(left, window.innerWidth - width - 8))
  const top = Math.max(8, Math.min(spaceBelow < 300 && anchorTop > 300 ? anchorTop - 300 - 4 : anchorBottom + 4, window.innerHeight - 8 - 40))
  return createPortal(
    <div ref={ref} style={{ position: 'fixed', top, left: left2, width, maxHeight: 300 }} className="z-[1000] overflow-y-auto rounded-xl border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] p-2.5 shadow-lg" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  )
}

function OptionExclusionPopover({
  option,
  anchorTop,
  anchorBottom,
  left,
  allItems,
  isExcluded,
  onToggleExclusion,
  onClose,
}: {
  option: { id: string; name: string }
  anchorTop: number
  anchorBottom: number
  left: number
  allItems: ExclusionItem[]
  isExcluded: (t: 'option' | 'group', id: string) => boolean
  onToggleExclusion: (t: 'option' | 'group', id: string) => void
  onClose: () => void
}) {
  return (
    <ExclusionPopover anchorTop={anchorTop} anchorBottom={anchorBottom} left={left} onClose={onClose}>
      <div className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-[#9a8f87]">Опция «{option.name}» исключает…</div>
      <ExclusionChecklist excludeSelf={{ type: 'option', id: option.id, name: option.name }} allItems={allItems} isExcluded={isExcluded} onToggle={onToggleExclusion} />
      <button onClick={onClose} className="mt-2 w-full rounded border border-slate-200 dark:border-[#3a312a] py-1 text-[11px] text-slate-500 dark:text-[#9a8f87]">
        Готово
      </button>
    </ExclusionPopover>
  )
}

function GroupExclusionPopover({
  group,
  anchorTop,
  anchorBottom,
  left,
  allItems,
  isExcluded,
  onToggleExclusion,
  onClose,
}: {
  group: { id: string; name: string }
  anchorTop: number
  anchorBottom: number
  left: number
  allItems: ExclusionItem[]
  isExcluded: (t: 'option' | 'group', id: string) => boolean
  onToggleExclusion: (t: 'option' | 'group', id: string) => void
  onClose: () => void
}) {
  return (
    <ExclusionPopover anchorTop={anchorTop} anchorBottom={anchorBottom} left={left} onClose={onClose}>
      <div className="mb-1.5 text-[11px] font-semibold text-slate-500 dark:text-[#9a8f87]">Блок «{group.name}» исключает…</div>
      <ExclusionChecklist excludeSelf={{ type: 'group', id: group.id, name: group.name }} allItems={allItems} isExcluded={isExcluded} onToggle={onToggleExclusion} />
      <button onClick={onClose} className="mt-2 w-full rounded border border-slate-200 dark:border-[#3a312a] py-1 text-[11px] text-slate-500 dark:text-[#9a8f87]">
        Готово
      </button>
    </ExclusionPopover>
  )
}

// ── Visibility-rule pickers ──────────────────────────────────────────────────
// "When this option/block is selected, hide/show that other option/block" — distinct from
// exclusions (which grey out an incompatible option but keep it visible), this actually
// removes the target from view entirely.

type VisibilityEffect = 'show' | 'hide'

function VisibilityChecklist({
  triggerSelf,
  allItems,
  effectFor,
  onSetEffect,
}: {
  triggerSelf: ExclusionItem
  allItems: ExclusionItem[]
  effectFor: (type: 'option' | 'group', id: string) => VisibilityEffect | null
  onSetEffect: (type: 'option' | 'group', id: string, effect: VisibilityEffect | null) => void
}) {
  const [query, setQuery] = useState('')
  const items = allItems.filter((it) => (it.type !== triggerSelf.type || it.id !== triggerSelf.id) && !(triggerSelf.type === 'group' && it.type === 'option' && it.groupId === triggerSelf.id))
  const activeItems = items.filter((it) => effectFor(it.type, it.id) !== null)
  const q = query.trim().toLowerCase()
  const filtered = q ? items.filter((it) => it.name.toLowerCase().includes(q) || (it.groupName || '').toLowerCase().includes(q)) : items
  const groups = filtered.filter((it) => it.type === 'group')
  const options = filtered.filter((it) => it.type === 'option')

  const row = (it: ExclusionItem) => {
    const effect = effectFor(it.type, it.id)
    return (
      <div key={`${it.type}:${it.id}`} className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-slate-50 dark:hover:bg-[#2a2520]">
        <span className="flex-1 truncate text-slate-700 dark:text-[#d5cfc7]">
          {it.name}
          {it.type === 'option' && it.groupName && <span className="text-slate-400 dark:text-[#6a5f57]"> · {it.groupName}</span>}
        </span>
        <button
          type="button"
          onClick={() => onSetEffect(it.type, it.id, effect === 'hide' ? null : 'hide')}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${effect === 'hide' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-slate-400 hover:bg-slate-100 dark:text-[#6a5f57] dark:hover:bg-[#2e2820]'}`}
          title="Скрывать при выборе триггера"
        >
          🙈 скрыть
        </button>
        <button
          type="button"
          onClick={() => onSetEffect(it.type, it.id, effect === 'show' ? null : 'show')}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${effect === 'show' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-slate-400 hover:bg-slate-100 dark:text-[#6a5f57] dark:hover:bg-[#2e2820]'}`}
          title="Показывать только при выборе триггера (скрыто по умолчанию)"
        >
          👁 показать
        </button>
      </div>
    )
  }

  return (
    <div>
      {activeItems.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {activeItems.map((it) => {
            const effect = effectFor(it.type, it.id)
            return (
              <span
                key={`${it.type}:${it.id}`}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                  effect === 'hide'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-400'
                }`}
              >
                {effect === 'hide' ? '🙈' : '👁'} {it.name}
                <button type="button" onClick={() => onSetEffect(it.type, it.id, null)} className="opacity-70 hover:opacity-100" title="Убрать правило">
                  ✕
                </button>
              </span>
            )
          })}
        </div>
      ) : (
        <div className="mb-2 text-xs text-slate-400 dark:text-[#6a5f57]">Пока нет правил видимости</div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Найти блок или опцию…"
        className="w-full rounded border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1f1c16] px-2 py-1 text-xs focus:border-sky-400 focus:outline-none"
      />
      {groups.length === 0 && options.length === 0 ? (
        <div className="px-1 py-1.5 text-xs text-slate-400 dark:text-[#6a5f57]">Ничего не найдено</div>
      ) : (
        <>
          {groups.length > 0 && (
            <>
              <div className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">Блоки</div>
              {groups.map(row)}
            </>
          )}
          {options.length > 0 && (
            <>
              <div className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">Опции</div>
              {options.map(row)}
            </>
          )}
        </>
      )}
    </div>
  )
}

function OptionVisibilityPopover({
  option,
  anchorTop,
  anchorBottom,
  left,
  allItems,
  effectFor,
  onSetEffect,
  onClose,
}: {
  option: { id: string; name: string }
  anchorTop: number
  anchorBottom: number
  left: number
  allItems: ExclusionItem[]
  effectFor: (t: 'option' | 'group', id: string) => VisibilityEffect | null
  onSetEffect: (t: 'option' | 'group', id: string, effect: VisibilityEffect | null) => void
  onClose: () => void
}) {
  return (
    <ExclusionPopover anchorTop={anchorTop} anchorBottom={anchorBottom} left={left} width={300} onClose={onClose}>
      <div className="mb-1 text-[11px] font-semibold text-slate-500 dark:text-[#9a8f87]">При выборе опции «{option.name}»…</div>
      <VisibilityChecklist triggerSelf={{ type: 'option', id: option.id, name: option.name }} allItems={allItems} effectFor={effectFor} onSetEffect={onSetEffect} />
      <button onClick={onClose} className="mt-2 w-full rounded border border-slate-200 dark:border-[#3a312a] py-1 text-[11px] text-slate-500 dark:text-[#9a8f87]">
        Готово
      </button>
    </ExclusionPopover>
  )
}

function GroupVisibilityPopover({
  group,
  anchorTop,
  anchorBottom,
  left,
  allItems,
  effectFor,
  onSetEffect,
  onClose,
}: {
  group: { id: string; name: string }
  anchorTop: number
  anchorBottom: number
  left: number
  allItems: ExclusionItem[]
  effectFor: (t: 'option' | 'group', id: string) => VisibilityEffect | null
  onSetEffect: (t: 'option' | 'group', id: string, effect: VisibilityEffect | null) => void
  onClose: () => void
}) {
  return (
    <ExclusionPopover anchorTop={anchorTop} anchorBottom={anchorBottom} left={left} width={300} onClose={onClose}>
      <div className="mb-1.5 text-[11px] font-semibold text-slate-500 dark:text-[#9a8f87]">При выборе блока «{group.name}»…</div>
      <VisibilityChecklist triggerSelf={{ type: 'group', id: group.id, name: group.name }} allItems={allItems} effectFor={effectFor} onSetEffect={onSetEffect} />
      <button onClick={onClose} className="mt-2 w-full rounded border border-slate-200 dark:border-[#3a312a] py-1 text-[11px] text-slate-500 dark:text-[#9a8f87]">
        Готово
      </button>
    </ExclusionPopover>
  )
}

const DESIGN_COLORS: Record<string, string> = { classic: '#0d5a52', modern: '#4f46e5', minimal: '#111111' }

// ── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const [models, setModels] = useState<AdminModel[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [layouts, setLayouts] = useState<{ id: string; name: string }[]>([])
  const [options, setOptions] = useState<AdminOption[]>([])
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [groupExclusionPopover, setGroupExclusionPopover] = useState<{ type: 'group'; id: string; anchorTop: number; anchorBottom: number; left: number } | null>(null)
  const [optionExclusionPopover, setOptionExclusionPopover] = useState<{ id: string; anchorTop: number; anchorBottom: number; left: number } | null>(null)
  const [visibilityRules, setVisibilityRules] = useState<VisibilityRule[]>([])
  const [groupVisibilityPopover, setGroupVisibilityPopover] = useState<{ type: 'group'; id: string; anchorTop: number; anchorBottom: number; left: number } | null>(null)
  const [optionVisibilityPopover, setOptionVisibilityPopover] = useState<{ id: string; anchorTop: number; anchorBottom: number; left: number } | null>(null)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingModel, setSavingModel] = useState(false)
  const [editingModel, setEditingModel] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const [mediaPickerState, setMediaPickerState] = useState<{ open: boolean; onPick?: (url: string, crop?: CropRect | null) => void; withCrop?: boolean; aspect?: '1/1' | '4/3' }>({ open: false })
  const [cropEditorState, setCropEditorState] = useState<{ open: boolean; imageUrl: string; initialCrop?: CropRect | null; onConfirm?: (crop: CropRect) => void; onSkipCrop?: () => void; aspect?: '1/1' | '4/3' }>({ open: false, imageUrl: '' })
  const [newBlockName, setNewBlockName] = useState('')
  const [creatingBlock, setCreatingBlock] = useState(false)
  const [insertState, setInsertState] = useState<InsertState>(null)

  const [mergingMode, setMergingMode] = useState(false)
  const [mergeSelectedIds, setMergeSelectedIds] = useState<Set<string>>(new Set())
  const [mergeName, setMergeName] = useState('')
  const [merging, setMerging] = useState(false)
  const cancelMerge = () => {
    setMergingMode(false)
    setMergeSelectedIds(new Set())
    setMergeName('')
  }

  const [addingOptionToGroupId, setAddingOptionToGroupId] = useState<string | null>(null)
  const [newOptionName, setNewOptionName] = useState('')
  const [newOptionPrice, setNewOptionPrice] = useState('0')
  const [addingOption, setAddingOption] = useState(false)

  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [editOptionName, setEditOptionName] = useState('')
  const [editOptionPrice, setEditOptionPrice] = useState('0')
  const [editOptionBasePrice, setEditOptionBasePrice] = useState('0')
  const [editOptionIsDefault, setEditOptionIsDefault] = useState(false)
  const [editOptionDescription, setEditOptionDescription] = useState('')
  const [editOptionPopupChoices, setEditOptionPopupChoices] = useState<PopupChoice[]>([])
  const [editOptionMaxLength, setEditOptionMaxLength] = useState(0)
  const [editOptionMaxWidth, setEditOptionMaxWidth] = useState(0)
  const [editOptionUnit, setEditOptionUnit] = useState('шт')
  const [savingOption, setSavingOption] = useState(false)

  const [deleteOptionConfirm, setDeleteOptionConfirm] = useState<{ optionId: string; name: string } | null>(null)
  const [deleteOptionError, setDeleteOptionError] = useState('')

  const [clientDesign, setClientDesign] = useState<'classic' | 'modern' | 'minimal'>('classic')
  const [savingDesign, setSavingDesign] = useState(false)
  const [accountNum, setAccountNum] = useState('')
  const [logoLightUrl, setLogoLightUrl] = useState('')
  const [logoDarkUrl, setLogoDarkUrl] = useState('')
  const [uploadingLogoSide, setUploadingLogoSide] = useState<'light' | 'dark' | null>(null)
  const [logoMenuOpen, setLogoMenuOpen] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  const [pageTitle, setPageTitle] = useState('')
  const [pageSubtitle, setPageSubtitle] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [offerNote, setOfferNote] = useState('')
  const [groupTexts, setGroupTexts] = useState<Record<string, string>>({})
  const [savingText, setSavingText] = useState(false)
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)

  const [deliveryConfigs, setDeliveryConfigs] = useState<Record<string, DeliveryConfig>>({})
  const [popupBlocks, setPopupBlocks] = useState<PopupBlock[]>([])
  const [contactBlocks, setContactBlocks] = useState<ContactBlock[]>([])
  const [savingPopup, setSavingPopup] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [newSectionNameByGroup, setNewSectionNameByGroup] = useState<Record<string, string>>({})
  const [newItemTextBySection, setNewItemTextBySection] = useState<Record<string, string>>({})
  const [editingItem, setEditingItem] = useState<{ secId: string; idx: number; value: string } | null>(null)

  const [publishedModelIds, setPublishedModelIds] = useState<string[] | null>(null)
  const [togglingPublish, setTogglingPublish] = useState(false)

  const loadAll = async (selectId?: string) => {
    setLoading(true)
    try {
      const data = await phpGet('bootstrap')
      const modelList: AdminModel[] = data.models || []
      const groupList: AdminGroup[] = data.groups || []
      setModels(modelList)
      setMedia(data.media || [])
      setGroups(groupList)
      setOptions(data.options || [])
      setExclusions(data.exclusions || [])
      setVisibilityRules(data.visibility_rules || [])
      const next = selectId || selectedModelId || modelList[0]?.id || ''
      setSelectedModelId(next)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!selectedModelId) {
      setLayouts([])
      return
    }
    phpGet('get_layouts', { model_id: selectedModelId }).then((data) => {
      setLayouts((data.layouts || []).map((l: any) => ({ id: String(l.id), name: l.name })))
    })
  }, [selectedModelId])

  useEffect(() => {
    fetch('/api/workspace-settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.client_design) setClientDesign(d.client_design)
        if (d.logo_light_url) setLogoLightUrl(d.logo_light_url)
        if (d.logo_dark_url) setLogoDarkUrl(d.logo_dark_url)
        if (d.page_title !== undefined) setPageTitle(d.page_title)
        if (d.page_subtitle !== undefined) setPageSubtitle(d.page_subtitle)
        if (d.cta_text !== undefined) setCtaText(d.cta_text)
        if (d.offer_note !== undefined) setOfferNote(d.offer_note)
        if (d.group_texts) setGroupTexts(d.group_texts)
        if (d.delivery_configs) setDeliveryConfigs(d.delivery_configs)
        if (Array.isArray(d.popup_blocks)) setPopupBlocks(d.popup_blocks)
        if (Array.isArray(d.contact_blocks)) setContactBlocks(d.contact_blocks)
        setPublishedModelIds(d.published_model_ids ?? null)
      })
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          window.location.href = '/login'
          return
        }
        if (d.subscription) setSubscription(d.subscription)
      })
    const match = window.location.pathname.match(/\/admin(\d+)/)
    if (match) setAccountNum(match[1])
    else if (HOSTNAME_ACCOUNT_MAP[window.location.hostname]) setAccountNum(HOSTNAME_ACCOUNT_MAP[window.location.hostname])
  }, [])

  const uploadLogo = async (side: 'light' | 'dark', file: File) => {
    setUploadingLogoSide(side)
    const res = await uploadMedia(file)
    if (res.ok && res.url) {
      const url = res.url
      if (side === 'light') setLogoLightUrl(url)
      else setLogoDarkUrl(url)
      await patchWorkspaceSettings({ [`logo_${side}_url`]: url })
    }
    setUploadingLogoSide(null)
  }

  const removeLogo = async (side: 'light' | 'dark') => {
    if (side === 'light') setLogoLightUrl('')
    else setLogoDarkUrl('')
    await patchWorkspaceSettings({ [`logo_${side}_url`]: '' })
  }

  const saveWorkspaceField = async (patch: Record<string, unknown>) => {
    setSavingText(true)
    await patchWorkspaceSettings(patch)
    setSavingText(false)
  }

  const saveGroupText = async (groupId: string, text: string) => {
    const next = { ...groupTexts, [groupId]: text }
    setGroupTexts(next)
    await saveWorkspaceField({ group_texts: next })
  }

  const savePopupBlocks = async (blocks: PopupBlock[]) => {
    setSavingPopup(true)
    await patchWorkspaceSettings({ popup_blocks: blocks })
    setSavingPopup(false)
  }

  const saveContactBlocks = async (blocks: ContactBlock[]) => {
    await patchWorkspaceSettings({ contact_blocks: blocks })
  }

  const togglePublish = async (modelId: string) => {
    setTogglingPublish(true)
    const allIds = models.map((m) => m.id)
    // Normalize to strings and drop ids for models that no longer exist — published_model_ids
    // previously accumulated stale/mixed-type entries (some numeric) from deleted models,
    // which made string-strict .includes() checks silently drop legitimately published ones.
    const validIds = new Set(allIds)
    const current = (publishedModelIds ?? allIds).map(String).filter((id) => validIds.has(id))
    const next = current.includes(modelId) ? current.filter((id) => id !== modelId) : [...current, modelId]
    setPublishedModelIds(next)
    await patchWorkspaceSettings({ published_model_ids: next })
    setTogglingPublish(false)
  }
  const isPublished = (modelId: string) => publishedModelIds === null || publishedModelIds.map(String).includes(modelId)

  const saveDeliveryConfig = async (groupId: string, config: DeliveryConfig) => {
    const next = { ...deliveryConfigs, [groupId]: config }
    setDeliveryConfigs(next)
    await saveWorkspaceField({ delivery_configs: next })
  }

  const saveClientDesign = async (design: 'classic' | 'modern' | 'minimal') => {
    setSavingDesign(true)
    setClientDesign(design)
    await patchWorkspaceSettings({ client_design: design })
    setSavingDesign(false)
  }

  const selectedModel = models.find((m) => m.id === selectedModelId) || null
  const isLocked = subscription?.status === 'expired'
  const configuratorLink = accountNum && selectedModelId ? `https://kp.glavinstrument.com/cli${accountNum}?model=${selectedModelId}&design=${clientDesign}` : accountNum ? `https://kp.glavinstrument.com/cli${accountNum}` : ''
  const accentColor = clientDesign === 'modern' ? '#4f46e5' : clientDesign === 'minimal' ? '#111111' : '#0d5a52'

  useEffect(() => {
    if (selectedModel) {
      setEditName(selectedModel.name)
      setEditPrice(String(selectedModel.base_price))
      setEditingModel(false)
    }
  }, [selectedModel?.id])

  const modelOptions = options.filter((o) => o.model_ids.includes(Number(selectedModelId)))
  const rootGroups = groups.filter((g) => !g.parent_group_id).sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
  const childGroups = (parentId: string) => groups.filter((g) => g.parent_group_id === parentId).sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
  const countOptionsIn = (groupId: string): number => modelOptions.filter((o) => o.group_id === groupId).length + childGroups(groupId).reduce((sum, g) => sum + countOptionsIn(g.id), 0)
  const allExclusionItems: ExclusionItem[] = [
    ...groups.map((g) => ({ type: 'group' as const, id: g.id, name: g.name })),
    ...options.map((o) => ({ type: 'option' as const, id: o.id, name: o.name, groupId: o.group_id, groupName: groups.find((g) => g.id === o.group_id)?.name })),
  ]

  const openMediaPicker = (onPick: (url: string, crop?: CropRect | null) => void, withCrop?: boolean, aspect?: '1/1' | '4/3') =>
    setMediaPickerState({ open: true, onPick, withCrop, aspect })
  const closeMediaPicker = () => setMediaPickerState({ open: false })

  const deleteMedia = async (id: number) => {
    await phpPost('delete_media', { id: Number(id) })
    setMedia((prev) => prev.filter((m) => m.id !== id))
  }

  const uploadToMediaLibrary = async (file: File) => {
    const res = await uploadMedia(file)
    if (res.ok && res.url) {
      mediaPickerState.onPick?.(res.url)
      closeMediaPicker()
      await loadAll(selectedModelId)
    } else {
      alert(res.error || 'Ошибка загрузки')
    }
  }

  const setModelImage = async (url: string, crop?: CropRect | null) => {
    if (!selectedModel) return
    const cropJson = crop ? JSON.stringify(crop) : null
    const res = await phpPost('update_model_image', { id: Number(selectedModel.id), image_url: url, image_crop: cropJson })
    if (!res.ok) {
      alert('Не удалось сохранить фото: ' + (res.error || 'ошибка сервера'))
      return
    }
    setModels((prev) => prev.map((m) => (m.id === selectedModel.id ? { ...m, image_url: url, image_crop: cropJson } : m)))
  }

  const saveModelEdits = async () => {
    if (!selectedModel) return
    setSavingModel(true)
    await phpPost('update_model', { id: Number(selectedModel.id), name: editName, image_url: selectedModel.image_url, base_price: Number(editPrice) })
    setModels((prev) => prev.map((m) => (m.id === selectedModel.id ? { ...m, name: editName, base_price: editPrice } : m)))
    setSavingModel(false)
    setEditingModel(false)
  }

  const createModel = async () => {
    const name = prompt('Название модели')
    if (!name?.trim()) return
    const res = await phpPost('create_model', { name: name.trim(), image_url: '', base_price: 300000 })
    if (res.ok) await loadAll(res.id ? String(res.id) : undefined)
  }

  const deleteModel = async (model?: AdminModel) => {
    const target = model || selectedModel
    if (!target || !confirm(`Удалить модель «${target.name}»?`)) return
    const res = await phpPost('delete_model', { id: Number(target.id) })
    if (!res.ok) {
      alert(res.error || 'Ошибка удаления модели. Попробуйте перезайти в систему.')
      return
    }
    if (selectedModelId === target.id) setSelectedModelId('')
    await loadAll('')
  }

  const duplicateModel = async () => {
    if (!selectedModel) return
    const res = await phpPost('duplicate_model', { id: Number(selectedModel.id) })
    if (res.ok && res.id) await loadAll(String(res.id))
    else alert(res.error || 'Ошибка дублирования')
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }))

  const onDragEndModels = useCallback((event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setModels((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id)
      const newIndex = prev.findIndex((m) => m.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex).map((m, i) => ({ ...m, sort_order: i }))
      phpPost('reorder_models', { items: reordered.map((m) => ({ id: Number(m.id), sort_order: m.sort_order })) })
      return reordered
    })
  }, [])

  const onDragEndGroups = useCallback((event: any, parentId: string | null) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setGroups((prev) => {
      const siblings = prev.filter((g) => (g.parent_group_id ?? null) === parentId)
      const others = prev.filter((g) => (g.parent_group_id ?? null) !== parentId)
      const oldIndex = siblings.findIndex((g) => g.id === active.id)
      const newIndex = siblings.findIndex((g) => g.id === over.id)
      const reordered = arrayMove(siblings, oldIndex, newIndex).map((g, i) => ({ ...g, sort_order: String(i) }))
      phpPost('reorder_groups', { items: reordered.map((g) => ({ id: Number(g.id), sort_order: Number(g.sort_order) })) })
      return [...others, ...reordered]
    })
  }, [])

  const onDragEndOptions = useCallback((event: any, groupId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOptions((prev) => {
      const siblings = prev.filter((o) => o.group_id === groupId)
      const others = prev.filter((o) => o.group_id !== groupId)
      const oldIndex = siblings.findIndex((o) => o.id === active.id)
      const newIndex = siblings.findIndex((o) => o.id === over.id)
      const reordered = arrayMove(siblings, oldIndex, newIndex).map((o, i) => ({ ...o, sort_order: i }))
      phpPost('reorder_options', { items: reordered.map((o) => ({ id: Number(o.id), sort_order: o.sort_order })) })
      return [...others, ...reordered]
    })
  }, [])

  const savedGroupNames = useRef<Record<string, string>>({})
  const saveGroupName = async (groupId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed || savedGroupNames.current[groupId] === trimmed) return
    savedGroupNames.current[groupId] = trimmed
    await phpPost('update_group_name', { id: Number(groupId), name: trimmed })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g)))
  }

  const toggleSelectionType = async (groupId: string, current: 'single' | 'multiple') => {
    const next = current === 'multiple' ? 'single' : 'multiple'
    await phpPost('update_group_selection', { id: Number(groupId), selection_type: next })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, selection_type: next } : g)))
  }

  const toggleRequired = async (groupId: string, current: string) => {
    const next = current === '1' ? '0' : '1'
    await phpPost('update_group_required', { id: Number(groupId), required: next === '1' ? 1 : 0 })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, required: next } : g)))
  }

  const toggleEnlargePhoto = async (groupId: string, current: string) => {
    const next = current === '1' ? '0' : '1'
    await phpPost('update_group_enlarge_photo', { id: Number(groupId), enlarge_photo: next === '1' ? 1 : 0 })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, enlarge_photo: next } : g)))
  }

  const toggleOptionActiveForModel = async (optionId: string, currentlyActive: boolean) => {
    const nextActive = currentlyActive ? 0 : 1
    await phpPost('toggle_option_active', { option_id: Number(optionId), model_id: Number(selectedModelId), is_active: nextActive })
    setOptions((prev) =>
      prev.map((o) => {
        if (o.id !== optionId) return o
        const mid = Number(selectedModelId)
        const nextIds = nextActive === 1 ? [...o.active_model_ids.filter((id) => id !== mid), mid] : o.active_model_ids.filter((id) => id !== mid)
        return { ...o, active_model_ids: nextIds }
      })
    )
  }

  const createBlock = async () => {
    const name = newBlockName.trim()
    if (!name || creatingBlock || !insertState) return
    const parentGroupId = insertState.parentGroupId ?? undefined
    const insertIndex = Number(insertState.key.split(':')[1] ?? 0)
    const blockType = insertState.blockType
    setCreatingBlock(true)
    const res = await phpPost('create_group', { name, sort_order: 0, block_type: blockType, ...(parentGroupId ? { parent_group_id: Number(parentGroupId) } : {}) })
    if (res.ok && res.id) {
      const newGroup: AdminGroup = { id: String(res.id), name, sort_order: '0', selection_type: 'multiple', block_type: blockType, parent_group_id: parentGroupId ?? null, required: '1', enlarge_photo: '0', model_ids: null, layout_ids: null }
      if (parentGroupId) {
        const reordered = [...groups.filter((g) => g.parent_group_id === parentGroupId).sort((a, b) => Number(a.sort_order) - Number(b.sort_order)), newGroup].map((g, i) => ({ ...g, sort_order: String(i) }))
        setGroups((prev) => [...prev.filter((g) => g.parent_group_id !== parentGroupId), ...reordered])
        setExpandedGroups((prev) => new Set(prev).add(String(res.id)))
        phpPost('reorder_groups', { items: reordered.map((g) => ({ id: Number(g.id), sort_order: Number(g.sort_order) })) })
      } else {
        const rootSiblings = groups.filter((g) => !g.parent_group_id).sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        const reordered = [...rootSiblings.slice(0, insertIndex), newGroup, ...rootSiblings.slice(insertIndex)].map((g, i) => ({ ...g, sort_order: String(i) }))
        setGroups((prev) => [...prev.filter((g) => g.parent_group_id), ...reordered])
        setExpandedGroups((prev) => new Set(prev).add(String(res.id)))
        phpPost('reorder_groups', { items: reordered.map((g) => ({ id: Number(g.id), sort_order: Number(g.sort_order) })) })
      }
      setNewBlockName('')
      setInsertState(null)
      if (blockType === 'popup') {
        const next = [...popupBlocks, { id: String(res.id), type: 'inclusion' as const, title: name, data: { sections: [] } }]
        setPopupBlocks(next)
        await savePopupBlocks(next)
      }
      if (blockType === 'contacts') {
        const next = [...contactBlocks, { id: String(res.id), title: name, data: {} }]
        setContactBlocks(next)
        await saveContactBlocks(next)
      }
    } else {
      alert(res.error || 'Ошибка создания блока')
    }
    setCreatingBlock(false)
  }

  const deleteBlock = async (groupId: string, name: string) => {
    const hasChildren = groups.some((g) => g.parent_group_id === groupId)
    const msg = hasChildren
      ? `Удалить блок «${name}»? Его собственные опции удалятся, а вложенные блоки НЕ удаляются — они станут самостоятельными блоками верхнего уровня.`
      : `Удалить блок «${name}»? Все его опции тоже будут удалены.`
    if (!confirm(msg)) return
    const res = await phpPost('delete_group', { id: Number(groupId) })
    if (!res.ok) {
      alert(res.error || 'Ошибка удаления блока. Попробуйте перезайти в систему.')
      return
    }
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.delete(groupId)
      return next
    })
    const removed = groups.find((g) => g.id === groupId)
    if (removed?.block_type === 'popup') {
      const next = popupBlocks.filter((b) => b.id !== groupId)
      setPopupBlocks(next)
      await savePopupBlocks(next)
    }
    if (removed?.block_type === 'contacts') {
      const next = contactBlocks.filter((b) => b.id !== groupId)
      setContactBlocks(next)
      await saveContactBlocks(next)
    }
    await loadAll(selectedModelId)
  }

  const [duplicatingGroupId, setDuplicatingGroupId] = useState<string | null>(null)

  const toggleGroupModels = async (groupId: string, modelId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    const current = group.model_ids ?? models.map((m) => Number(m.id))
    const mid = Number(modelId)
    const next = current.includes(mid) ? current.filter((id) => id !== mid) : [...current, mid]
    const normalized = next.length >= models.length ? null : next
    await phpPost('update_group_models', { id: Number(groupId), model_ids: normalized })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, model_ids: normalized } : g)))
  }

  const toggleGroupLayouts = async (groupId: string, layoutId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    const current = group.layout_ids ?? layouts.map((l) => Number(l.id))
    const lid = Number(layoutId)
    const next = current.includes(lid) ? current.filter((id) => id !== lid) : [...current, lid]
    const normalized = next.length >= layouts.length ? null : next
    await phpPost('update_group_layouts', { id: Number(groupId), layout_ids: normalized })
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, layout_ids: normalized } : g)))
  }

  const duplicateGroup = async (groupId: string, name: string) => {
    if (!confirm(`Скопировать блок «${name}» вместе со всеми его опциями?`)) return
    setDuplicatingGroupId(groupId)
    try {
      const res = await phpPost('duplicate_group', { id: Number(groupId) })
      if (!res.ok) {
        alert(res.error || 'Ошибка копирования блока.')
        return
      }
      // duplicate_group only clones the MySQL row (name/options) — popup section text and
      // contact details live in workspace-settings (Next.js JSON), so they must be cloned
      // here too, keyed by the new group id, or the copy would render as empty/"not found".
      const newGroupId = String(res.id)
      const source = groups.find((g) => g.id === groupId)
      if (source?.block_type === 'popup') {
        const sourceBlock = popupBlocks.find((b) => b.id === groupId)
        if (sourceBlock) {
          const cloned: PopupBlock = { ...sourceBlock, id: newGroupId }
          const next = [...popupBlocks, cloned]
          setPopupBlocks(next)
          await savePopupBlocks(next)
        }
      } else if (source?.block_type === 'contacts') {
        const sourceBlock = contactBlocks.find((b) => b.id === groupId)
        if (sourceBlock) {
          const cloned: ContactBlock = { ...sourceBlock, id: newGroupId }
          const next = [...contactBlocks, cloned]
          setContactBlocks(next)
          await saveContactBlocks(next)
        }
      }
      await loadAll(selectedModelId)
    } finally {
      setDuplicatingGroupId(null)
    }
  }

  const mergeBlocks = async () => {
    const name = mergeName.trim()
    if (!name || mergeSelectedIds.size < 2 || merging) return
    setMerging(true)
    const res = await phpPost('create_group', { name, sort_order: 0, block_type: 'options' })
    if (!res.ok || !res.id) {
      alert(res.error || 'Ошибка создания родительского блока')
      setMerging(false)
      return
    }
    const parentId = String(res.id)
    const ids = Array.from(mergeSelectedIds)
    const nameById = new Map(groups.map((g) => [g.id, g.name]))
    const results = await Promise.all(ids.map(async (id) => ({ id, res: await phpPost('update_group_parent', { id: Number(id), parent_group_id: Number(parentId) }) })))
    const failed = results.filter((r) => !r.res.ok)
    if (failed.length > 0) {
      const names = failed.map((f) => nameById.get(f.id) || f.id).join(', ')
      alert(`Не удалось перенести в родительский блок: ${names}. Остальные перенесены, родительский блок «${name}» создан.`)
    }
    await loadAll(selectedModelId)
    setExpandedGroups((prev) => new Set(prev).add(parentId))
    cancelMerge()
    setMerging(false)
  }

  const createOption = async () => {
    if (!newOptionName.trim() || !addingOptionToGroupId || addingOption) return
    setAddingOption(true)
    const res = await phpPost('create_option_json', { group_id: Number(addingOptionToGroupId), model_id: Number(selectedModelId), name: newOptionName.trim(), price: Number(newOptionPrice) })
    if (res.ok && res.id) {
      const mid = Number(selectedModelId)
      const sortOrder = options.filter((o) => o.group_id === addingOptionToGroupId).length
      setOptions((prev) => [
        ...prev,
        {
          id: String(res.id),
          group_id: addingOptionToGroupId,
          name: newOptionName.trim(),
          price: newOptionPrice,
          base_price: '0',
          is_default: false,
          description: '',
          popup_options: null,
          image_url: '',
          image_crop: null,
          model_ids: [mid],
          active_model_ids: [mid],
          sort_order: sortOrder,
          max_quantity: 1,
          max_length: 0,
          max_width: 0,
          unit: 'шт',
          model_photos: {},
        },
      ])
      setNewOptionName('')
      setNewOptionPrice('0')
      setAddingOptionToGroupId(null)
    }
    setAddingOption(false)
  }

  const openEditOption = (option: AdminOption) => {
    setEditingOptionId(option.id)
    setEditOptionName(option.name)
    setEditOptionPrice(option.price)
    setEditOptionBasePrice(option.base_price)
    setEditOptionIsDefault(!!Number(option.is_default))
    setEditOptionDescription(option.description || '')
    setEditOptionPopupChoices((option.popup_options || []).map((c) => ({ ...c, price: String(c.price) })))
    setEditOptionMaxLength(option.max_length || 0)
    setEditOptionMaxWidth(option.max_width || 0)
    setEditOptionUnit(option.unit || 'шт')
  }

  const saveEditOption = async () => {
    if (!editingOptionId || !editOptionName.trim() || savingOption) return
    setSavingOption(true)
    const choicesForState = editOptionPopupChoices.length > 0 ? editOptionPopupChoices : null
    const choicesForApi = choicesForState ? choicesForState.map((c) => ({ id: c.id, name: c.name, price: Number(c.price), image_url: c.image_url })) : null
    const maxLength = Math.max(0, Math.round(editOptionMaxLength))
    const maxWidth = Math.max(0, Math.round(editOptionMaxWidth))
    await phpPost('update_option_json', {
      id: Number(editingOptionId),
      name: editOptionName.trim(),
      price: Number(editOptionPrice),
      base_price: Number(editOptionBasePrice),
      is_default: editOptionIsDefault ? 1 : 0,
      description: editOptionDescription.trim(),
      popup_options: choicesForApi,
      max_length: maxLength,
      max_width: maxWidth,
      unit: editOptionUnit.trim() || 'шт',
    })

    // A single-select group can only have one default option — marking this one as default
    // must clear it on any siblings, or the client shows two options pre-selected at once.
    const current = options.find((o) => o.id === editingOptionId)
    const group = current ? groups.find((g) => g.id === current.group_id) : null
    const siblingIdsToUnset =
      editOptionIsDefault && current && group?.selection_type === 'multiple'
        ? []
        : editOptionIsDefault && current && group?.selection_type !== 'multiple'
          ? options.filter((o) => o.group_id === current.group_id && o.id !== editingOptionId && Number(o.is_default)).map((o) => o.id)
          : []
    if (siblingIdsToUnset.length > 0) {
      await Promise.all(
        siblingIdsToUnset.map((id) => {
          const sib = options.find((o) => o.id === id)!
          return phpPost('update_option_json', { id: Number(id), name: sib.name, price: Number(sib.price), is_default: 0 })
        })
      )
    }

    setOptions((prev) =>
      prev.map((o) => {
        if (o.id === editingOptionId) {
          return {
            ...o,
            name: editOptionName.trim(),
            price: editOptionPrice,
            base_price: editOptionBasePrice,
            is_default: editOptionIsDefault,
            description: editOptionDescription.trim(),
            popup_options: choicesForState,
            max_length: maxLength,
            max_width: maxWidth,
            unit: editOptionUnit.trim() || 'шт',
          }
        }
        if (siblingIdsToUnset.includes(o.id)) return { ...o, is_default: false }
        return o
      })
    )
    setEditingOptionId(null)
    setSavingOption(false)
  }

  const setOptionMaxQuantity = async (optionId: string, qty: number) => {
    const option = options.find((o) => o.id === optionId)
    if (!option) return
    await phpPost('update_option_json', { id: Number(optionId), name: option.name, price: Number(option.price), max_quantity: qty })
    setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, max_quantity: qty } : o)))
  }

  const isExcludedPair = (aType: 'option' | 'group', aId: string, bType: 'option' | 'group', bId: string) =>
    exclusions.some((ex) => (ex.a_type === aType && String(ex.a_id) === aId && ex.b_type === bType && String(ex.b_id) === bId) || (ex.b_type === aType && String(ex.b_id) === aId && ex.a_type === bType && String(ex.a_id) === bId))

  const toggleExclusion = async (aType: 'option' | 'group', aId: string, bType: 'option' | 'group', bId: string) => {
    const existing = exclusions.find((ex) => (ex.a_type === aType && String(ex.a_id) === aId && ex.b_type === bType && String(ex.b_id) === bId) || (ex.b_type === aType && String(ex.b_id) === aId && ex.a_type === bType && String(ex.a_id) === bId))
    if (existing) {
      await phpPost('delete_exclusion', { id: Number(existing.id) })
      setExclusions((prev) => prev.filter((ex) => ex.id !== existing.id))
    } else {
      const res = await phpPost('create_exclusion', { a_type: aType, a_id: Number(aId), b_type: bType, b_id: Number(bId) })
      if (res.ok && res.id) setExclusions((prev) => [...prev, { id: String(res.id), a_type: aType, a_id: Number(aId), b_type: bType, b_id: Number(bId) }])
    }
  }

  const visibilityEffectFor = (triggerType: 'option' | 'group', triggerId: string, targetType: 'option' | 'group', targetId: string): VisibilityEffect | null => {
    const rule = visibilityRules.find((r) => r.trigger_type === triggerType && String(r.trigger_id) === triggerId && r.target_type === targetType && String(r.target_id) === targetId)
    return rule ? rule.effect : null
  }

  const setVisibilityEffect = async (triggerType: 'option' | 'group', triggerId: string, targetType: 'option' | 'group', targetId: string, effect: VisibilityEffect | null) => {
    const existing = visibilityRules.find((r) => r.trigger_type === triggerType && String(r.trigger_id) === triggerId && r.target_type === targetType && String(r.target_id) === targetId)
    if (effect === null) {
      if (existing) {
        await phpPost('delete_visibility_rule', { id: Number(existing.id) })
        setVisibilityRules((prev) => prev.filter((r) => r.id !== existing.id))
      }
      return
    }
    const res = await phpPost('create_visibility_rule', { trigger_type: triggerType, trigger_id: Number(triggerId), target_type: targetType, target_id: Number(targetId), effect })
    if (res.ok) {
      if (existing) {
        setVisibilityRules((prev) => prev.map((r) => (r.id === existing.id ? { ...r, effect } : r)))
      } else if (res.id) {
        setVisibilityRules((prev) => [...prev, { id: String(res.id), trigger_type: triggerType, trigger_id: Number(triggerId), target_type: targetType, target_id: Number(targetId), effect }])
      }
    }
  }

  const requestDeleteOption = (optionId: string, name: string) => {
    setDeleteOptionError('')
    setDeleteOptionConfirm({ optionId, name })
  }

  const confirmDeleteOption = async () => {
    if (!deleteOptionConfirm) return
    const res = await phpPost('delete_option_json', { id: Number(deleteOptionConfirm.optionId) })
    if (!res.ok) {
      setDeleteOptionError(res.error || 'Ошибка удаления. Попробуйте перезайти в систему.')
      return
    }
    setOptions((prev) => prev.filter((o) => o.id !== deleteOptionConfirm.optionId))
    setDeleteOptionConfirm(null)
    setDeleteOptionError('')
  }

  const saveOptionImage = async (optionId: string, url: string, crop: CropRect | null) => {
    const cropJson = crop ? JSON.stringify(crop) : null
    const res = await phpPost('update_option_image', { id: Number(optionId), image_url: url, image_crop: cropJson })
    if (res.ok) setOptions((prev) => prev.map((o) => (o.id === optionId ? { ...o, image_url: url, image_crop: cropJson } : o)))
    else alert(res.error || 'Ошибка сохранения фото')
  }

  const saveOptionModelPhoto = async (optionId: string, modelId: string, url: string, crop: CropRect | null) => {
    const cropJson = crop ? JSON.stringify(crop) : ''
    const res = await phpPost('set_option_model_photo', { option_id: Number(optionId), model_id: Number(modelId), image_url: url, image_crop: cropJson })
    if (res.ok) {
      setOptions((prev) =>
        prev.map((o) => {
          if (o.id !== optionId) return o
          const photos = { ...o.model_photos }
          if (url) photos[modelId] = { image_url: url, image_crop: cropJson || null }
          else delete photos[modelId]
          return { ...o, model_photos: photos }
        })
      )
    } else {
      alert(res.error || 'Ошибка сохранения фото для этой модели')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400 dark:text-[#6a5f57]">Загрузка…</div>
      </div>
    )
  }

  const isMinimal = clientDesign === 'minimal'

  const renderGroup = (group: AdminGroup, depth: number): React.ReactNode => {
    const groupOptions = modelOptions.filter((o) => o.group_id === group.id)
    const children = childGroups(group.id)
    const isOpen = expandedGroups.has(group.id)
    const exclusionOpen = groupExclusionPopover?.type === 'group' && groupExclusionPopover.id === group.id
    const exclusionCount = allExclusionItems.filter((it) => !(it.type === 'group' && it.id === group.id) && isExcludedPair('group', group.id, it.type, it.id)).length
    const visibilityOpen = groupVisibilityPopover?.type === 'group' && groupVisibilityPopover.id === group.id
    const visibilityCount = allExclusionItems.filter((it) => !(it.type === 'group' && it.id === group.id) && visibilityEffectFor('group', group.id, it.type, it.id) !== null).length
    const blockMeta = BLOCK_TYPES.find((bt) => bt.type === (group.block_type || 'options'))

    return (
      <div key={group.id} style={depth > 0 ? { marginLeft: 16 } : undefined}>
        <DragHandleRender id={group.id}>
          {(handle) => (
            <div>
              <div className="flex items-center hover:bg-slate-50 dark:hover:bg-[#2a2520] dark:bg-[#1f1c16] transition-colors">
                {handle}
                {mergingMode && depth === 0 && (
                  <input
                    type="checkbox"
                    checked={mergeSelectedIds.has(group.id)}
                    onChange={() =>
                      setMergeSelectedIds((prev) => {
                        const next = new Set(prev)
                        next.has(group.id) ? next.delete(group.id) : next.add(group.id)
                        return next
                      })
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="ml-3 h-4 w-4 shrink-0 rounded accent-[#0d5a52]"
                    title="Выбрать для объединения"
                  />
                )}
                <button onClick={() => toggleExpanded(group.id)} className="flex items-center gap-3 py-4 pl-1 text-left">
                  <span className={`text-xs text-slate-400 dark:text-[#6a5f57] transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  <span className="text-sm">{blockMeta?.icon ?? '☑️'}</span>
                </button>
                <input
                  value={group.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g)))}
                  onBlur={() => saveGroupName(group.id, group.name)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1.5 text-sm font-medium text-slate-700 dark:text-[#d5cfc7] focus:border-slate-200 dark:focus:border-[#3a312a] focus:bg-white dark:focus:bg-[#252119] focus:outline-none"
                />
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelectionType(group.id, group.selection_type)
                  }}
                  className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${group.selection_type === 'multiple' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                  title="Нажмите чтобы переключить тип выбора"
                >
                  {group.selection_type === 'multiple' ? 'Множественный' : 'Один вариант'}
                </span>
                {group.selection_type === 'single' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRequired(group.id, group.required)
                    }}
                    className={`mr-2 cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${group.required !== '0' ? 'bg-slate-100 text-slate-500 dark:bg-[#2a2520] dark:text-[#9a8f87] hover:bg-slate-200' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                    title="Нажмите чтобы переключить обязательность выбора в этом блоке"
                  >
                    {group.required !== '0' ? 'Обязательно' : 'Необязательно'}
                  </span>
                )}
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleEnlargePhoto(group.id, group.enlarge_photo)
                  }}
                  className={`mr-2 cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${group.enlarge_photo === '1' ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-100 text-slate-400 dark:bg-[#2a2520] dark:text-[#6a5f57] hover:bg-slate-200'}`}
                  title="Разрешить покупателю увеличивать фото опций в этом блоке"
                >
                  🔍 {group.enlarge_photo === '1' ? 'Увеличение вкл.' : 'Увеличение выкл.'}
                </span>
                <span className="mx-2 rounded-full bg-slate-100 dark:bg-[#2a2520] px-2.5 py-0.5 text-xs text-slate-500 dark:text-[#9a8f87]" title={children.length > 0 ? 'Опций во вложенных блоках' : 'Опций в блоке'}>
                  {countOptionsIn(group.id)}
                </span>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (exclusionOpen) {
                        setGroupExclusionPopover(null)
                        return
                      }
                      const rect = e.currentTarget.getBoundingClientRect()
                      setGroupExclusionPopover({ type: 'group', id: group.id, anchorTop: rect.top, anchorBottom: rect.bottom, left: rect.right - 256 })
                    }}
                    className={`mr-1 rounded-lg px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-[#2a2520] ${exclusionCount > 0 ? 'text-amber-600' : 'text-slate-300 dark:text-[#4a4038]'}`}
                    title="Взаимоисключения блока"
                  >
                    🔀 искл.{exclusionCount > 0 ? ` ${exclusionCount}` : ''}
                  </button>
                  {exclusionOpen && groupExclusionPopover && (
                    <GroupExclusionPopover
                      group={group}
                      anchorTop={groupExclusionPopover.anchorTop}
                      anchorBottom={groupExclusionPopover.anchorBottom}
                      left={groupExclusionPopover.left}
                      allItems={allExclusionItems}
                      isExcluded={(t, id) => isExcludedPair('group', group.id, t, id)}
                      onToggleExclusion={(t, id) => toggleExclusion('group', group.id, t, id)}
                      onClose={() => setGroupExclusionPopover(null)}
                    />
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (visibilityOpen) {
                        setGroupVisibilityPopover(null)
                        return
                      }
                      const rect = e.currentTarget.getBoundingClientRect()
                      setGroupVisibilityPopover({ type: 'group', id: group.id, anchorTop: rect.top, anchorBottom: rect.bottom, left: rect.right - 300 })
                    }}
                    className={`mr-1 rounded-lg px-1.5 py-0.5 text-xs hover:bg-slate-100 dark:hover:bg-[#2a2520] ${visibilityCount > 0 ? 'text-sky-600' : 'text-slate-300 dark:text-[#4a4038]'}`}
                    title="Показ/скрытие других блоков и опций при выборе этого блока"
                  >
                    👁 вид.{visibilityCount > 0 ? ` ${visibilityCount}` : ''}
                  </button>
                  {visibilityOpen && groupVisibilityPopover && (
                    <GroupVisibilityPopover
                      group={group}
                      anchorTop={groupVisibilityPopover.anchorTop}
                      anchorBottom={groupVisibilityPopover.anchorBottom}
                      left={groupVisibilityPopover.left}
                      allItems={allExclusionItems}
                      effectFor={(t, id) => visibilityEffectFor('group', group.id, t, id)}
                      onSetEffect={(t, id, effect) => setVisibilityEffect('group', group.id, t, id, effect)}
                      onClose={() => setGroupVisibilityPopover(null)}
                    />
                  )}
                </div>
                {children.length === 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isLocked) duplicateGroup(group.id, group.name)
                    }}
                    disabled={isLocked || duplicatingGroupId === group.id}
                    className="mr-1 rounded-lg px-1.5 py-0.5 text-xs text-slate-300 dark:text-[#4a4038] hover:bg-slate-100 dark:hover:bg-[#2a2520] hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Копировать блок вместе с его опциями"
                  >
                    {duplicatingGroupId === group.id ? '…' : '⧉'}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isLocked) deleteBlock(group.id, group.name)
                  }}
                  disabled={isLocked}
                  className="mr-3 rounded-lg px-1.5 py-0.5 text-xs text-slate-300 dark:text-[#4a4038] hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Удалить блок"
                >
                  🗑
                </button>
              </div>

              {!isOpen && group.model_ids && models.length > 1 && (
                <div className="flex flex-wrap items-center gap-1 px-5 pb-3 pl-11">
                  <span className="mr-1 text-[10px] text-slate-400 dark:text-[#6a5f57]">🎯 Только для:</span>
                  {group.model_ids.map((id) => {
                    const m = models.find((mm) => Number(mm.id) === id)
                    return (
                      <span key={id} className="rounded-full border border-[#0d5a52]/30 bg-[#0d5a52]/10 px-2 py-0.5 text-[10px] font-medium text-[#0d5a52] dark:bg-[#0d5a52]/20 dark:text-[#4db8ae]">
                        {m?.name || id}
                      </span>
                    )
                  })}
                </div>
              )}

              {!isOpen && group.layout_ids && layouts.length > 1 && (
                <div className="flex flex-wrap items-center gap-1 px-5 pb-3 pl-11">
                  <span className="mr-1 text-[10px] text-slate-400 dark:text-[#6a5f57]">📐 Только для планировки:</span>
                  {group.layout_ids.map((id) => {
                    const l = layouts.find((ll) => Number(ll.id) === id)
                    return (
                      <span key={id} className="rounded-full border border-[#b87524]/30 bg-[#b87524]/10 px-2 py-0.5 text-[10px] font-medium text-[#b87524] dark:bg-[#b87524]/20 dark:text-[#e0a260]">
                        {l?.name || id}
                      </span>
                    )
                  })}
                </div>
              )}

              {isOpen && (
                <div className="px-5 pb-5">
                  {children.length > 0 && <p className="mb-3 rounded-lg bg-slate-50 dark:bg-[#1f1c16] px-3 py-2 text-xs text-slate-400 dark:text-[#6a5f57]">Это блок-обёртка для вложенных блоков ниже — опции сюда не добавляются напрямую.</p>}

                  {models.length > 1 && (
                    <div className="mb-3 flex flex-wrap items-center gap-1">
                      <span className="mr-1 text-[10px] text-slate-400 dark:text-[#6a5f57]">Модели:</span>
                      {models.map((m) => {
                        const active = !group.model_ids || group.model_ids.includes(Number(m.id))
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleGroupModels(group.id, m.id)}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              active ? 'border-[#0d5a52]/30 bg-[#0d5a52]/10 text-[#0d5a52]' : 'border-transparent bg-slate-100 dark:bg-[#2a2520] text-slate-400 dark:text-[#6a5f57]'
                            }`}
                            title={active ? 'Блок показывается для этой модели — нажмите, чтобы скрыть' : 'Блок скрыт для этой модели — нажмите, чтобы показать'}
                          >
                            {m.name}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {layouts.length > 1 && (
                    <div className="mb-3 flex flex-wrap items-center gap-1">
                      <span className="mr-1 text-[10px] text-slate-400 dark:text-[#6a5f57]">Планировки:</span>
                      {layouts.map((l) => {
                        const active = !group.layout_ids || group.layout_ids.includes(Number(l.id))
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => toggleGroupLayouts(group.id, l.id)}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              active ? 'border-[#b87524]/30 bg-[#b87524]/10 text-[#b87524]' : 'border-transparent bg-slate-100 dark:bg-[#2a2520] text-slate-400 dark:text-[#6a5f57]'
                            }`}
                            title={active ? 'Блок показывается для этой планировки — нажмите, чтобы скрыть' : 'Блок скрыт для этой планировки — нажмите, чтобы показать'}
                          >
                            {l.name}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {children.length === 0 && group.block_type === 'delivery' && (
                    <DeliveryConfigEditor
                      groupId={group.id}
                      config={deliveryConfigs[group.id] ?? { km_label: '', base: { label: '', base_price: 0, price_per_km: 0 }, option_rules: [] }}
                      allOptions={modelOptions}
                      saving={savingText}
                      onSave={(cfg) => saveDeliveryConfig(group.id, cfg)}
                    />
                  )}

                  {children.length === 0 && group.block_type === 'popup' && renderPopupEditor(group)}

                  {children.length === 0 && group.block_type === 'contacts' && renderContactsEditor(group)}

                  {children.length === 0 && (group.block_type || 'options') !== 'options' && group.block_type !== 'delivery' && group.block_type !== 'popup' && group.block_type !== 'contacts' && (
                    <div className="mb-4 rounded-xl border border-dashed border-slate-200 dark:border-[#3a312a] bg-slate-50 dark:bg-[#1f1c16] py-8 text-center text-xs text-slate-400 dark:text-[#6a5f57]">
                      {blockMeta?.icon} Редактор блока «{blockMeta?.label}» в разработке
                    </div>
                  )}

                  {children.length === 0 && (group.block_type || 'options') === 'options' && groupOptions.length === 0 && <p className="py-3 text-center text-xs text-slate-400 dark:text-[#6a5f57]">Нет опций — добавьте первую</p>}

                  {children.length === 0 && (group.block_type || 'options') === 'options' && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEndOptions(e, group.id)}>
                      <SortableContext items={groupOptions.map((o) => o.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {groupOptions.map((option) => renderOptionCard(option))}
                          {addingOptionToGroupId === group.id ? (
                            <div className="flex flex-col gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3">
                              <input value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} placeholder="Название опции" className="rounded border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2 py-1.5 text-xs" autoFocus onKeyDown={(e) => e.key === 'Enter' && createOption()} />
                              <input type="number" value={newOptionPrice} onChange={(e) => setNewOptionPrice(e.target.value)} placeholder="Цена, ₽" className="rounded border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2 py-1.5 text-xs" />
                              <div className="flex gap-1">
                                <button onClick={createOption} disabled={addingOption || !newOptionName.trim()} className="flex-1 rounded bg-emerald-600 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                                  {addingOption ? '…' : 'Добавить'}
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingOptionToGroupId(null)
                                    setNewOptionName('')
                                    setNewOptionPrice('0')
                                  }}
                                  className="rounded border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2 text-xs text-slate-500 dark:text-[#9a8f87]"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (!isLocked) {
                                  setAddingOptionToGroupId(group.id)
                                  setNewOptionName('')
                                  setNewOptionPrice('0')
                                }
                              }}
                              disabled={isLocked}
                              className="flex aspect-auto min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#3a312a] text-slate-400 dark:text-[#6a5f57] transition-colors hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <span className="text-xl font-light">+</span>
                              <span className="text-[11px]">Добавить опцию</span>
                            </button>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  <div className="mt-4 border-t border-dashed border-slate-200 dark:border-[#3a312a] pt-3">
                    <DndContext sensors={insertState ? [] : sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEndGroups(e, group.id)}>
                      <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        {children.map((child) => renderGroup(child, depth + 1))}
                      </SortableContext>
                    </DndContext>
                    <AddBlockButton
                      posKey={`${group.id}:sub`}
                      insertState={insertState}
                      name={newBlockName}
                      adding={creatingBlock}
                      label="Добавить вложенный блок"
                      onOpen={() => !isLocked && setInsertState({ key: `${group.id}:sub`, step: 'pick', blockType: 'options', parentGroupId: group.id })}
                      onPickType={(t) => setInsertState({ key: `${group.id}:sub`, step: 'name', blockType: t, parentGroupId: group.id })}
                      onChangeName={setNewBlockName}
                      onAdd={createBlock}
                      onCancel={() => {
                        setInsertState(null)
                        setNewBlockName('')
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DragHandleRender>
        {depth === 0 && (
          <AddBlockButton
            posKey={`root:${rootGroups.indexOf(group) + 1}`}
            insertState={insertState}
            name={newBlockName}
            adding={creatingBlock}
            onOpen={() => !isLocked && setInsertState({ key: `root:${rootGroups.indexOf(group) + 1}`, step: 'pick', blockType: 'options', parentGroupId: null })}
            onPickType={(t) => setInsertState({ key: `root:${rootGroups.indexOf(group) + 1}`, step: 'name', blockType: t, parentGroupId: null })}
            onChangeName={setNewBlockName}
            onAdd={createBlock}
            onCancel={() => {
              setInsertState(null)
              setNewBlockName('')
            }}
          />
        )}
      </div>
    )
  }

  const renderOptionCard = (option: AdminOption) => {
    const isActive = option.active_model_ids.includes(Number(selectedModelId))
    const exclusionCount = allExclusionItems.filter((it) => !(it.type === 'option' && it.id === option.id) && isExcludedPair('option', option.id, it.type, it.id)).length
    const visibilityCount = allExclusionItems.filter((it) => !(it.type === 'option' && it.id === option.id) && visibilityEffectFor('option', option.id, it.type, it.id) !== null).length
    const modelPhoto = option.model_photos[selectedModelId]
    const displayUrl = modelPhoto?.image_url || option.image_url
    const displayCrop = modelPhoto ? modelPhoto.image_crop : option.image_crop
    const exclusionOpen = optionExclusionPopover?.id === option.id
    const visibilityOpen = optionVisibilityPopover?.id === option.id

    return (
      <DragHandleRow key={option.id} id={option.id}>
        <div
          onClick={() => !isLocked && openEditOption(option)}
          className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all ${isActive ? 'border-slate-200 dark:border-[#3a312a] hover:border-emerald-400 dark:hover:border-emerald-600' : 'border-slate-200 dark:border-[#3a312a] opacity-50 hover:opacity-70'}`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-[#2a2520]">
            {displayUrl ? (
              <div className="h-full w-full transition-transform duration-200 group-hover:scale-[1.03]">
                <CroppedImage src={displayUrl} crop={parseCropSafe(displayCrop)} alt={option.name} />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 dark:text-[#6a5f57] group-hover:bg-slate-300/50">
                <span className="text-2xl">📷</span>
                <span className="text-[11px]">Нажмите для добавления</span>
              </div>
            )}
            {modelPhoto && <span className="absolute left-1.5 top-1.5 rounded-full bg-sky-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white">Фото модели</span>}
            {Array.isArray(option.popup_options) && option.popup_options.length > 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-violet-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white">{option.popup_options.length} вар.</span>
            )}
            {option.max_quantity > 1 && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-slate-700/80 px-1.5 py-0.5 text-[9px] font-medium text-white">×{option.max_quantity}</span>}
            {(option.max_length > 0 || option.max_width > 0) && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-amber-700/85 px-1.5 py-0.5 text-[9px] font-medium text-white">Д×Ш, ₽/м²</span>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-200">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold drop-shadow">Открыть</span>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5">
            <div className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-[#d5cfc7]">{option.name}</div>
            {(Number(option.price) > 0 || Number(option.base_price) > 0) && <span className="shrink-0 text-[10px] font-semibold text-amber-600">+{fmt(Number(option.base_price) + Number(option.price))} ₽</span>}
          </div>
          <div className="flex items-center gap-0.5 border-t border-slate-100 dark:border-[#3a312a] px-1.5 py-1" onClick={(e) => e.stopPropagation()}>
            <div className="relative flex-1">
              <button
                onClick={(e) => {
                  if (exclusionOpen) {
                    setOptionExclusionPopover(null)
                    return
                  }
                  const rect = e.currentTarget.getBoundingClientRect()
                  setOptionExclusionPopover({ id: option.id, anchorTop: rect.top, anchorBottom: rect.bottom, left: rect.right - 256 })
                }}
                title="Взаимоисключения"
                className={`flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] hover:bg-slate-100 dark:hover:bg-[#2a2520] ${exclusionCount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400 dark:text-[#6a5f57]'}`}
              >
                🔀{exclusionCount > 0 ? ` ${exclusionCount}` : ''}
              </button>
              {exclusionOpen && optionExclusionPopover && (
                <OptionExclusionPopover
                  option={option}
                  anchorTop={optionExclusionPopover.anchorTop}
                  anchorBottom={optionExclusionPopover.anchorBottom}
                  left={optionExclusionPopover.left}
                  allItems={allExclusionItems}
                  isExcluded={(t, id) => isExcludedPair('option', option.id, t, id)}
                  onToggleExclusion={(t, id) => toggleExclusion('option', option.id, t, id)}
                  onClose={() => setOptionExclusionPopover(null)}
                />
              )}
            </div>
            <div className="relative flex-1">
              <button
                onClick={(e) => {
                  if (visibilityOpen) {
                    setOptionVisibilityPopover(null)
                    return
                  }
                  const rect = e.currentTarget.getBoundingClientRect()
                  setOptionVisibilityPopover({ id: option.id, anchorTop: rect.top, anchorBottom: rect.bottom, left: rect.right - 300 })
                }}
                title="Показ/скрытие других блоков и опций при выборе этой опции"
                className={`flex h-6 items-center gap-0.5 rounded px-1.5 text-[10px] hover:bg-slate-100 dark:hover:bg-[#2a2520] ${visibilityCount > 0 ? 'text-sky-600 font-semibold' : 'text-slate-400 dark:text-[#6a5f57]'}`}
              >
                👁{visibilityCount > 0 ? ` ${visibilityCount}` : ''}
              </button>
              {visibilityOpen && optionVisibilityPopover && (
                <OptionVisibilityPopover
                  option={option}
                  anchorTop={optionVisibilityPopover.anchorTop}
                  anchorBottom={optionVisibilityPopover.anchorBottom}
                  left={optionVisibilityPopover.left}
                  allItems={allExclusionItems}
                  effectFor={(t, id) => visibilityEffectFor('option', option.id, t, id)}
                  onSetEffect={(t, id, effect) => setVisibilityEffect('option', option.id, t, id, effect)}
                  onClose={() => setOptionVisibilityPopover(null)}
                />
              )}
            </div>
            <button onClick={() => !isLocked && requestDeleteOption(option.id, option.name)} disabled={isLocked} title="Удалить" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 dark:text-[#6a5f57] hover:bg-red-50 hover:text-red-500 disabled:opacity-30">
              🗑
            </button>
          </div>
        </div>
      </DragHandleRow>
    )
  }

  const renderPopupEditor = (group: AdminGroup) => {
    const block = popupBlocks.find((b) => b.id === group.id)
    if (!block || block.type !== 'inclusion') {
      return <div className="mb-4 rounded-xl border border-dashed border-slate-200 dark:border-[#3a312a] bg-slate-50 dark:bg-[#1f1c16] py-6 text-center text-xs text-slate-400 dark:text-[#6a5f57]">🪄 Попап блок не найден — сохраните страницу и попробуйте снова</div>
    }
    const sections = block.data.sections
    const saveSections = async (next: typeof sections) => {
      const nextBlocks = popupBlocks.map((b) => (b.id === group.id ? { ...b, data: { ...b.data, sections: next } } : b))
      setPopupBlocks(nextBlocks)
      await savePopupBlocks(nextBlocks)
    }
    const addSection = async () => {
      const name = (newSectionNameByGroup[group.id] || '').trim()
      if (!name) return
      const section = { id: Date.now().toString(), name, items: [] as string[] }
      setExpandedSections((prev) => new Set([...prev, section.id]))
      setNewSectionNameByGroup((prev) => ({ ...prev, [group.id]: '' }))
      await saveSections([...sections, section])
    }
    const removeSection = async (id: string) => saveSections(sections.filter((s) => s.id !== id))
    const addItem = async (sectionId: string) => {
      const text = (newItemTextBySection[sectionId] || '').trim()
      if (!text) return
      const next = sections.map((s) => (s.id === sectionId ? { ...s, items: [...s.items, text] } : s))
      setNewItemTextBySection((prev) => ({ ...prev, [sectionId]: '' }))
      await saveSections(next)
    }
    const removeItem = async (sectionId: string, idx: number) => saveSections(sections.map((s) => (s.id === sectionId ? { ...s, items: s.items.filter((_, i) => i !== idx) } : s)))
    const commitItemEdit = async (sectionId: string, idx: number, value: string) => {
      const v = value.trim()
      if (!v) return
      await saveSections(sections.map((s) => (s.id === sectionId ? { ...s, items: s.items.map((it, i) => (i === idx ? v : it)) } : s)))
      setEditingItem(null)
    }
    const toggleSectionModel = async (sectionId: string, modelId: string) => {
      const section = sections.find((s) => s.id === sectionId)
      if (!section) return
      const current = section.model_ids ?? models.map((m) => m.id)
      const next = current.includes(modelId) ? current.filter((id) => id !== modelId) : [...current, modelId]
      const normalized = next.length >= models.length ? null : next
      await saveSections(sections.map((s) => (s.id === sectionId ? { ...s, model_ids: normalized } : s)))
    }

    return (
      <div className="mb-3 rounded-xl border border-slate-100 dark:border-[#2e2820] overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            const oldIndex = sections.findIndex((s) => s.id === active.id)
            const newIndex = sections.findIndex((s) => s.id === over.id)
            saveSections(arrayMove(sections, oldIndex, newIndex))
          }}
        >
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section) => {
              const isOpen = expandedSections.has(section.id)
              return (
                <DragHandleRender key={section.id} id={section.id}>
                  {(handle) => (
                    <div className="border-b border-slate-100 dark:border-[#2e2820] last:border-b-0">
                      <div className={`flex items-center gap-2 px-3 py-2 ${isOpen ? 'bg-slate-50 dark:bg-[#1a1815]' : ''}`}>
                        {handle}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSections((prev) => {
                              const next = new Set(prev)
                              next.has(section.id) ? next.delete(section.id) : next.add(section.id)
                              return next
                            })
                          }
                          className="shrink-0 text-slate-300 dark:text-[#4a4038] hover:text-slate-500"
                        >
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 16 16" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                            <path d="M6 4l4 4-4 4" />
                          </svg>
                        </button>
                        <input
                          value={section.name}
                          onChange={(e) => setPopupBlocks((prev) => prev.map((b) => (b.id === group.id ? { ...b, data: { ...b.data, sections: (b.data.sections || []).map((s) => (s.id === section.id ? { ...s, name: e.target.value } : s)) } } : b)))}
                          onBlur={() => saveSections(sections)}
                          className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold text-slate-700 dark:text-[#d5cfc7] focus:border-slate-200 dark:focus:border-[#3a312a] focus:bg-white dark:focus:bg-[#252119] focus:outline-none"
                        />
                        <span className="shrink-0 rounded-full border border-slate-200 dark:border-[#3a312a] px-1.5 py-px text-[10px] tabular-nums text-slate-400 dark:text-[#6a5f57]">{section.items.length}</span>
                        <button type="button" onClick={() => removeSection(section.id)} className="shrink-0 rounded p-0.5 text-slate-300 dark:text-[#4a4038] hover:text-red-500">
                          <svg width="11" height="11" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h11M5 4V2.5A.5.5 0 0 1 5.5 2h4a.5.5 0 0 1 .5.5V4M6 7v5M9 7v5" />
                            <rect x="3" y="4" width="9" height="9" rx="1" />
                          </svg>
                        </button>
                      </div>
                      {!isOpen && section.model_ids && models.length > 1 && (
                        <div className="flex flex-wrap items-center gap-1 px-6 pb-2">
                          <span className="mr-1 text-[10px] text-slate-400 dark:text-[#6a5f57]">🎯 Только для:</span>
                          {section.model_ids.map((id) => {
                            const m = models.find((mm) => mm.id === id)
                            return (
                              <span key={id} className="rounded-full border border-[#0d5a52]/30 bg-[#0d5a52]/10 px-2 py-0.5 text-[10px] font-medium text-[#0d5a52] dark:bg-[#0d5a52]/20 dark:text-[#4db8ae]">
                                {m?.name || id}
                              </span>
                            )
                          })}
                        </div>
                      )}
                      {isOpen && (
                        <div className="px-6 pb-2 pt-1">
                          {models.length > 1 && (
                            <div className="mb-2 flex flex-wrap items-center gap-1">
                              <span className="mr-1 text-[10px] text-slate-400 dark:text-[#6a5f57]">Модели:</span>
                              {models.map((m) => {
                                const active = !section.model_ids || section.model_ids.includes(m.id)
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleSectionModel(section.id, m.id)}
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                      active ? 'border-[#0d5a52]/30 bg-[#0d5a52]/10 text-[#0d5a52]' : 'border-transparent bg-slate-100 dark:bg-[#2a2520] text-slate-400 dark:text-[#6a5f57]'
                                    }`}
                                    title={active ? 'Показывается для этой модели — нажмите, чтобы скрыть' : 'Скрыто для этой модели — нажмите, чтобы показать'}
                                  >
                                    {m.name}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          <ul className="mb-2 space-y-0.5">
                            {section.items.map((item, idx) => {
                              const isEditing = editingItem?.secId === section.id && editingItem?.idx === idx
                              return (
                                <li key={idx} className="group flex items-center gap-1.5 py-0.5">
                                  <span className="mt-px h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d5a52] opacity-40" />
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      value={editingItem.value}
                                      onChange={(e) => setEditingItem((prev) => (prev ? { ...prev, value: e.target.value } : null))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitItemEdit(section.id, idx, editingItem.value)
                                        if (e.key === 'Escape') setEditingItem(null)
                                      }}
                                      onBlur={() => commitItemEdit(section.id, idx, editingItem.value)}
                                      className="flex-1 rounded border border-[#0d5a52]/40 bg-white dark:bg-[#252119] px-1.5 py-0.5 text-xs text-slate-700 dark:text-[#d5cfc7] focus:outline-none focus:border-[#0d5a52]"
                                    />
                                  ) : (
                                    <span className="flex-1 text-xs text-slate-600 dark:text-[#b5afa7] leading-relaxed">{item}</span>
                                  )}
                                  {!isEditing && (
                                    <button type="button" onClick={() => setEditingItem({ secId: section.id, idx, value: item })} className="shrink-0 rounded p-0.5 text-slate-200 dark:text-[#3a312a] opacity-0 group-hover:opacity-100 hover:text-[#0d5a52] transition-opacity" title="Редактировать">
                                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 12 12">
                                        <path d="M8 1.5l2.5 2.5-6 6H2V7.5l6-6z" />
                                      </svg>
                                    </button>
                                  )}
                                  <button type="button" onClick={() => removeItem(section.id, idx)} className="shrink-0 rounded p-0.5 text-slate-200 dark:text-[#3a312a] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity">
                                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 12 12">
                                      <path d="M1 1l10 10M11 1L1 11" />
                                    </svg>
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                          <div className="flex gap-1.5">
                            <input
                              value={newItemTextBySection[section.id] || ''}
                              onChange={(e) => setNewItemTextBySection((prev) => ({ ...prev, [section.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addItem(section.id)}
                              placeholder="Новая позиция…"
                              className="flex-1 rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2.5 py-1.5 text-xs focus:border-[#0d5a52] focus:outline-none"
                            />
                            <button type="button" onClick={() => addItem(section.id)} disabled={savingPopup || !(newItemTextBySection[section.id] || '').trim()} className="rounded-lg bg-[#0d5a52] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#0a4840] disabled:opacity-40">
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </DragHandleRender>
              )
            })}
          </SortableContext>
        </DndContext>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 dark:bg-[#1a1815]">
          <input
            value={newSectionNameByGroup[group.id] || ''}
            onChange={(e) => setNewSectionNameByGroup((prev) => ({ ...prev, [group.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
            placeholder="Новый раздел…"
            className="flex-1 rounded-lg border border-dashed border-slate-300 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2.5 py-1.5 text-xs focus:border-[#0d5a52] focus:outline-none"
          />
          <button type="button" onClick={addSection} disabled={savingPopup || !(newSectionNameByGroup[group.id] || '').trim()} className="rounded-lg bg-[#0d5a52] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#0a4840] disabled:opacity-40">
            {savingPopup ? '…' : '+ Раздел'}
          </button>
        </div>
      </div>
    )
  }

  const renderContactsEditor = (group: AdminGroup) => {
    const block = contactBlocks.find((b) => b.id === group.id)
    const data = block?.data ?? {}
    const saveField = async (key: string, value: string) => {
      const nextData = { ...data, [key]: value }
      const next = contactBlocks.some((b) => b.id === group.id) ? contactBlocks.map((b) => (b.id === group.id ? { ...b, data: nextData } : b)) : [...contactBlocks, { id: group.id, title: group.name, data: nextData }]
      setContactBlocks(next)
      await saveContactBlocks(next)
    }
    const fields: { key: keyof typeof data; label: string; placeholder: string; prefix: string }[] = [
      { key: 'phone', label: 'Телефон', placeholder: '+7 999 123-45-67', prefix: '📞' },
      { key: 'telegram', label: 'Telegram', placeholder: '@username или t.me/...', prefix: '✈️' },
      { key: 'whatsapp', label: 'WhatsApp', placeholder: '+7 999 123-45-67', prefix: '💬' },
      { key: 'email', label: 'Email', placeholder: 'info@example.com', prefix: '✉️' },
      { key: 'address', label: 'Адрес', placeholder: 'г. Москва, ул. Пример, 1', prefix: '📍' },
      { key: 'note', label: 'Доп. текст', placeholder: 'Режим работы, описание…', prefix: '📄' },
    ]
    return (
      <div className="mb-3 rounded-xl border border-slate-100 dark:border-[#2e2820] overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-[#2e2820]">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 shrink-0 text-center text-sm">{f.prefix}</span>
              <label className="w-24 shrink-0 text-xs font-medium text-slate-500 dark:text-[#9a8f87]">{f.label}</label>
              <input defaultValue={data[f.key] || ''} placeholder={f.placeholder} onBlur={(e) => saveField(f.key, e.target.value.trim())} className="flex-1 rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2.5 py-1.5 text-xs text-slate-700 dark:text-[#d5cfc7] placeholder-slate-300 dark:placeholder-[#5a5048] focus:border-[#0d5a52] focus:outline-none" />
            </div>
          ))}
        </div>
        <div className="bg-slate-50/60 dark:bg-[#1a1815] px-4 py-2 text-[10px] text-slate-400 dark:text-[#6a5f57]">Данные сохраняются при потере фокуса (клик вне поля)</div>
      </div>
    )
  }

  const editingOption = editingOptionId ? options.find((o) => o.id === editingOptionId) : null

  return (
    <div className={`flex flex-col min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden font-sans ${isMinimal ? '' : 'bg-slate-50 dark:bg-[#1f1c16]'}`} style={isMinimal ? { background: '#fafafa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif' } : undefined}>
      <div style={{ height: 4, background: accentColor, flexShrink: 0, transition: 'background 0.3s ease' }} />

      <header
        className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6 shadow-sm transition-colors"
        style={clientDesign === 'modern' ? { background: '#0f0f13', borderColor: '#1e1e2e' } : clientDesign === 'minimal' ? { background: '#ffffff', borderColor: '#e0e0e0' } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative shrink-0">
            <button onClick={() => setLogoMenuOpen((v) => !v)} title="Загрузить логотип" className="group flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden transition-opacity hover:opacity-80" style={{ background: logoLightUrl ? 'transparent' : accentColor, transition: 'background 0.3s ease' }}>
              {logoLightUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={normalizeImageUrl(logoLightUrl)} alt="" className="h-8 w-8 object-contain" />
              ) : (
                <span className="text-xs font-extrabold text-white tracking-tight">КП</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold">✎</span>
            </button>
            {logoMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLogoMenuOpen(false)} />
                <div className="absolute left-0 top-10 z-50 w-52 rounded-xl border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] p-3 shadow-xl">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#6a5f57]">Логотип</div>
                  {(['light', 'dark'] as const).map((side) => {
                    const url = side === 'light' ? logoLightUrl : logoDarkUrl
                    const busy = uploadingLogoSide === side
                    return (
                      <div key={side} className="mb-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">{side === 'light' ? '☀ Светлая' : '🌙 Тёмная'}</span>
                          {url && (
                            <button onClick={() => removeLogo(side)} className="text-[9px] text-slate-400 hover:text-red-400 transition-colors">
                              удалить
                            </button>
                          )}
                        </div>
                        <label className="group/lbl relative block cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={busy}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) uploadLogo(side, file)
                              e.target.value = ''
                            }}
                          />
                          <div className="flex h-12 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 dark:border-[#3a312a] bg-slate-50 dark:bg-[#1f1c16] transition-colors group-hover/lbl:border-[#0d5a52]">
                            {busy ? (
                              <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={normalizeImageUrl(url)} alt="" className="h-full w-full object-contain p-1" />
                            ) : (
                              <span className="text-[10px] text-slate-400">+ загрузить</span>
                            )}
                          </div>
                        </label>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <span className="text-sm lg:text-base font-bold truncate" style={clientDesign === 'modern' ? { color: '#e8e8f0' } : clientDesign === 'minimal' ? { color: '#111' } : undefined}>
            Конфигуратор
          </span>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <ThemeToggle />
          {configuratorLink && (
            <a href={configuratorLink} target="_blank" rel="noreferrer" className="inline-flex rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors" style={{ color: accentColor, borderColor: accentColor + '55', background: accentColor + '12' }}>
              Открыть конфигуратор ↗
            </a>
          )}
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="rounded-xl border border-slate-200 dark:border-[#3a312a] px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-[#6a5f57] hover:border-red-200 hover:text-red-500 transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      {subscription && subscription.status !== 'active' && (
        <div className={`flex shrink-0 items-center justify-between gap-2 px-4 py-2 text-xs font-medium ${subscription.status === 'expired' ? 'bg-red-600 text-white' : subscription.status === 'trial_expiring' ? 'bg-amber-500 text-white' : 'bg-[#0d5a52] text-white'}`}>
          <span>{subscription.status === 'expired' ? 'Тестовый период завершён. Все изменения заблокированы.' : subscription.status === 'trial_expiring' ? `Тестовый период заканчивается через ${subscription.daysLeft} дн.` : `Тестовый период: осталось ${subscription.daysLeft} дн.`}</span>
          <a href="/upgrade" className="shrink-0 rounded-lg border border-white/40 bg-white/20 px-3 py-1 font-semibold hover:bg-white/30 transition-colors">
            Подключить →
          </a>
        </div>
      )}

      <div className="sticky top-14 z-20 flex lg:hidden shrink-0 overflow-x-auto border-b border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119] px-2 py-2" style={{ scrollbarWidth: 'none' }}>
        {models.map((m) => (
          <button key={m.id} onClick={() => setSelectedModelId(m.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap mr-1 ${selectedModelId === m.id ? 'bg-[#0d5a52] text-white' : 'text-slate-500 dark:text-[#9a8f87] hover:bg-slate-100 dark:hover:bg-[#2e2820]'}`}>
            {m.name}
          </button>
        ))}
        <button onClick={createModel} disabled={isLocked} className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#0d5a52] text-sm font-bold text-white hover:bg-[#0a4840] disabled:opacity-40 disabled:cursor-not-allowed">
          +
        </button>
      </div>

      <div className="flex flex-1 lg:overflow-hidden">
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#252119]" style={isMinimal ? { background: '#fff', borderColor: '#e5e7eb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif' } : undefined}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2e2820] px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#6a5f57]">Модели</span>
            <button onClick={createModel} disabled={isLocked} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0d5a52] text-sm font-bold text-white hover:bg-[#0a4840] disabled:opacity-40 disabled:cursor-not-allowed" title="Добавить модель">
              +
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndModels}>
            <SortableContext items={models.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="flex-1 overflow-y-auto">
                {models.map((m) => (
                  <ModelListItem
                    key={m.id}
                    model={m}
                    isSelected={selectedModelId === m.id}
                    published={isPublished(m.id)}
                    onSelect={() => setSelectedModelId(m.id)}
                    onCopy={async () => {
                      const res = await phpPost('duplicate_model', { id: Number(m.id) })
                      if (res.ok && res.id) await loadAll(String(res.id))
                      else alert(res.error || 'Ошибка')
                    }}
                    onDelete={() => deleteModel(m)}
                    onTogglePublish={() => !togglingPublish && togglePublish(m.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="shrink-0 border-t border-slate-100 dark:border-[#2e2820] px-3 py-3">
            <div className="mb-2" style={{ fontSize: 10, fontWeight: isMinimal ? 400 : 700, textTransform: 'uppercase', letterSpacing: isMinimal ? '0.2em' : '0.08em', color: isMinimal ? '#999' : undefined }}>
              <span className={isMinimal ? '' : 'text-slate-400 dark:text-[#6a5f57]'}>Дизайн клиента</span>
              {savingDesign && <span style={{ color: accentColor }}> ·</span>}
            </div>
            <div className="flex gap-1.5">
              {(['classic', 'modern', 'minimal'] as const).map((d) => {
                const active = clientDesign === d
                const color = DESIGN_COLORS[d]
                const titleMap = { classic: 'Классик', modern: 'Модерн', minimal: 'Минимал' }
                return (
                  <button
                    key={d}
                    onClick={() => saveClientDesign(d)}
                    title={titleMap[d]}
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-semibold transition-all ${active ? 'text-white' : 'bg-slate-100 dark:bg-[#2e2820] text-slate-500 dark:text-[#6a5f57] hover:bg-slate-200 dark:hover:bg-[#38322a]'}`}
                    style={active ? { background: color } : undefined}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: active ? '#ffffff99' : color }} />
                    {titleMap[d] === 'Классик' ? 'Класс' : titleMap[d]}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 lg:overflow-y-auto p-3 lg:p-6" style={isMinimal ? { background: '#ffffff' } : undefined}>
          {selectedModel ? (
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-[#2e2820] bg-white dark:bg-[#252119] shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 p-4 lg:p-5">
                  <div className="group relative h-36 w-full sm:w-52 sm:shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-slate-200 dark:border-[#3a312a] bg-slate-50 dark:bg-[#1f1c16]">
                    {selectedModel.image_url ? (
                      <RepositionableImage
                        src={selectedModel.image_url}
                        crop={parseCropSafe(selectedModel.image_crop)}
                        alt={selectedModel.name}
                        onReposition={(x, y) => setModelImage(selectedModel.image_url, { x, y, w: 100, h: 100, mode: 'position' })}
                        onChangePicker={() => openMediaPicker((url, crop) => setModelImage(url, crop ?? null), true, '1/1')}
                        onCropEditor={() =>
                          setCropEditorState({
                            open: true,
                            imageUrl: selectedModel.image_url,
                            initialCrop: parseCropSafe(selectedModel.image_crop),
                            aspect: '1/1',
                            onConfirm: (crop) => {
                              setModelImage(selectedModel.image_url, crop)
                              setCropEditorState({ open: false, imageUrl: '' })
                            },
                          })
                        }
                      />
                    ) : (
                      <button
                        onClick={() => !isLocked && openMediaPicker((url, crop) => setModelImage(url, crop ?? null), true)}
                        disabled={isLocked}
                        className={`flex h-full w-full flex-col items-center justify-center gap-1 text-slate-300 dark:text-[#4a4038] transition-colors ${isLocked ? 'cursor-not-allowed' : 'hover:border-[#0d5a52]'}`}
                      >
                        <span className="text-4xl">🖼</span>
                        <span className="text-xs">Нажмите для выбора</span>
                      </button>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    {editingModel ? (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Название</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-[#3a312a] px-3 py-2 text-sm font-medium focus:border-[#0d5a52] focus:outline-none" autoFocus />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Базовая стоимость, ₽</label>
                          <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-[#3a312a] px-3 py-2 text-sm font-medium focus:border-[#0d5a52] focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={saveModelEdits} disabled={savingModel || isLocked} className="rounded-xl bg-[#0d5a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a4840] disabled:opacity-50">
                            {savingModel ? 'Сохранение…' : 'Сохранить'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingModel(false)
                              setEditName(selectedModel.name)
                              setEditPrice(String(selectedModel.base_price))
                            }}
                            className="rounded-xl border border-slate-200 dark:border-[#3a312a] px-4 py-2 text-sm text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50"
                          >
                            Отмена
                          </button>
                          <div className="ml-auto flex gap-2">
                            <button onClick={duplicateModel} disabled={isLocked} className="rounded-xl border border-slate-200 dark:border-[#3a312a] px-3 py-2 text-xs text-slate-500 dark:text-[#9a8f87] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                              Дублировать
                            </button>
                            <button onClick={() => deleteModel()} disabled={isLocked} className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">
                              Удалить
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-[#e8e2d9]">{selectedModel.name}</h1>
                        <div className="text-sm text-slate-500 dark:text-[#9a8f87]">
                          Базовая стоимость: <span className="font-semibold text-slate-700 dark:text-[#d5cfc7]">{fmt(Number(selectedModel.base_price))} ₽</span>
                        </div>
                        <button onClick={() => setEditingModel(true)} disabled={isLocked} className="w-fit rounded-xl border border-slate-200 dark:border-[#3a312a] px-4 py-2 text-sm text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                          ✎ Редактировать
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-[#2e2820] bg-white dark:bg-[#252119] shadow-sm">
                <div className="border-b border-slate-100 dark:border-[#2e2820] px-5 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">Блоки опций</span>
                    {mergingMode ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          autoFocus
                          value={mergeName}
                          onChange={(e) => setMergeName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && mergeBlocks()}
                          placeholder="Название нового родительского блока (например «Двери»)…"
                          className="w-64 rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1f1c16] px-2 py-1 text-xs focus:border-[#0d5a52] focus:outline-none"
                        />
                        <button
                          onClick={mergeBlocks}
                          disabled={mergeSelectedIds.size < 2 || !mergeName.trim() || merging}
                          title={mergeSelectedIds.size < 2 ? 'Отметьте галочками минимум 2 блока ниже' : mergeName.trim() ? undefined : 'Введите название родительского блока'}
                          className="rounded-lg bg-[#0d5a52] px-2.5 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {merging ? '…' : `Объединить (${mergeSelectedIds.size})`}
                        </button>
                        <button onClick={cancelMerge} className="rounded-lg border border-slate-200 dark:border-[#3a312a] px-2 py-1 text-xs text-slate-500 dark:text-[#9a8f87]">
                          ✕ Отмена
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => !isLocked && setMergingMode(true)} disabled={isLocked} className="rounded-lg border border-slate-200 dark:border-[#3a312a] px-2.5 py-1 text-xs text-slate-500 dark:text-[#9a8f87] hover:border-[#0d5a52] hover:text-[#0d5a52] disabled:cursor-not-allowed disabled:opacity-30">
                        Объединить блоки в один
                      </button>
                    )}
                  </div>
                  {mergingMode && (
                    <p className="mt-1.5 text-[11px] text-slate-400 dark:text-[#6a5f57]">
                      Отметьте галочками у блоков ниже минимум два, которые нужно объединить, впишите название нового родительского блока и нажмите «Объединить».
                      {mergeSelectedIds.size > 0 && mergeSelectedIds.size < 2 && ' Выбран только 1 блок — нужно минимум 2.'}
                    </p>
                  )}
                </div>
                <DndContext sensors={insertState ? [] : sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEndGroups(e, null)}>
                  <SortableContext items={rootGroups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                    <div>
                      <AddBlockButton
                        posKey="root:0"
                        insertState={insertState}
                        name={newBlockName}
                        adding={creatingBlock}
                        onOpen={() => !isLocked && setInsertState({ key: 'root:0', step: 'pick', blockType: 'options', parentGroupId: null })}
                        onPickType={(t) => setInsertState({ key: 'root:0', step: 'name', blockType: t, parentGroupId: null })}
                        onChangeName={setNewBlockName}
                        onAdd={createBlock}
                        onCancel={() => {
                          setInsertState(null)
                          setNewBlockName('')
                        }}
                      />
                      {rootGroups.map((g) => renderGroup(g, 0))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-[#2e2820] bg-white dark:bg-[#252119] shadow-sm">
                <button onClick={() => setTextsPanelOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left">
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-[#d5cfc7]">Тексты страницы клиента</div>
                    <div className="mt-0.5 text-xs text-slate-400 dark:text-[#6a5f57]">Заголовок, подпись, кнопка, описания блоков</div>
                  </div>
                  <span className={`text-slate-400 dark:text-[#6a5f57] transition-transform ${textsPanelOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {textsPanelOpen && (
                  <div className="border-t border-slate-100 dark:border-[#2e2820] px-5 pb-5 pt-4 space-y-4">
                    {[
                      { key: 'page_title', label: 'Заголовок страницы', value: pageTitle, set: setPageTitle, placeholder: 'Название компании или проекта' },
                      { key: 'page_subtitle', label: 'Подзаголовок / описание', value: pageSubtitle, set: setPageSubtitle, placeholder: 'Выберите модель, планировку и опции…' },
                      { key: 'cta_text', label: 'Текст кнопки', value: ctaText, set: setCtaText, placeholder: 'Сформировать предложение' },
                      { key: 'offer_note', label: 'Подпись под ссылкой', value: offerNote, set: setOfferNote, placeholder: 'Предложение фиксируется по ссылке и не меняется' },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">{f.label}</label>
                        <div className="flex gap-2">
                          <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder} className="flex-1 rounded-xl border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1f1c16] px-3 py-2 text-sm focus:border-[#0d5a52] focus:outline-none" />
                          <button onClick={() => saveWorkspaceField({ [f.key]: f.value })} disabled={savingText} className="shrink-0 rounded-xl bg-[#0d5a52] px-3 py-2 text-xs font-bold text-white hover:bg-[#0a4840] disabled:opacity-50">
                            {savingText ? '…' : '✓'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {rootGroups.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#6a5f57]">Описания блоков опций</div>
                        <div className="space-y-3">
                          {rootGroups.map((g) => (
                            <div key={g.id}>
                              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">{g.name}</label>
                              <div className="flex gap-2">
                                <input
                                  value={groupTexts[g.id] || ''}
                                  onChange={(e) => setGroupTexts((prev) => ({ ...prev, [g.id]: e.target.value }))}
                                  placeholder="Описание блока для клиента (необязательно)"
                                  className="flex-1 rounded-xl border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1f1c16] px-3 py-2 text-sm focus:border-[#0d5a52] focus:outline-none"
                                />
                                <button onClick={() => saveGroupText(g.id, groupTexts[g.id] || '')} disabled={savingText} className="shrink-0 rounded-xl bg-[#0d5a52] px-3 py-2 text-xs font-bold text-white hover:bg-[#0a4840] disabled:opacity-50">
                                  {savingText ? '…' : '✓'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400 dark:text-[#6a5f57]">Выберите модель</p>
            </div>
          )}
        </main>
      </div>

      {mediaPickerState.open && (
        <MediaLibraryModal
          media={media}
          onSelect={(url) => {
            if (mediaPickerState.withCrop) {
              const onPick = mediaPickerState.onPick
              const aspect = mediaPickerState.aspect
              closeMediaPicker()
              setCropEditorState({
                open: true,
                imageUrl: url,
                initialCrop: null,
                aspect,
                onConfirm: (crop) => {
                  onPick?.(url, crop)
                  setCropEditorState({ open: false, imageUrl: '' })
                },
                onSkipCrop: () => {
                  onPick?.(url, null)
                  setCropEditorState({ open: false, imageUrl: '' })
                },
              })
            } else {
              mediaPickerState.onPick?.(url)
              closeMediaPicker()
            }
          }}
          onClose={closeMediaPicker}
          onUpload={uploadToMediaLibrary}
          onDelete={deleteMedia}
        />
      )}

      {cropEditorState.open && (
        <CropEditorModal
          imageUrl={cropEditorState.imageUrl}
          initialCrop={cropEditorState.initialCrop}
          onConfirm={(crop) => cropEditorState.onConfirm?.(crop)}
          onCancel={() => setCropEditorState({ open: false, imageUrl: '' })}
          onSkipCrop={cropEditorState.onSkipCrop}
          aspect={cropEditorState.aspect}
        />
      )}

      {editingOption &&
        (() => {
          const option = editingOption
          const modelPhoto = option.model_photos[selectedModelId]
          const displayUrl = modelPhoto?.image_url || option.image_url
          const displayCrop = modelPhoto ? modelPhoto.image_crop : option.image_crop
          const savePhoto = (url: string, crop: CropRect | null) => (modelPhoto ? saveOptionModelPhoto(option.id, selectedModelId, url, crop) : saveOptionImage(option.id, url, crop))

          return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6" onClick={(e) => e.target === e.currentTarget && setEditingOptionId(null)}>
              <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-[#252119] shadow-2xl max-h-[90dvh]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#3a312a] px-6 py-4 shrink-0">
                  <h2 className="text-base font-bold text-slate-800 dark:text-[#e8e2d9]">Редактирование опции</h2>
                  <button onClick={() => setEditingOptionId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3a312a] hover:text-slate-600">
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                    <div className="border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-[#3a312a] p-6">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-[#6a5f57]">Фото</div>
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-200 dark:bg-[#3a312a] mb-3">
                        {displayUrl ? (
                          <>
                            <RepositionableImage
                              src={displayUrl}
                              crop={parseCropSafe(displayCrop)}
                              alt={option.name}
                              onReposition={(x, y) => savePhoto(displayUrl, { x, y, w: 100, h: 100, mode: 'position' })}
                              onChangePicker={() => openMediaPicker((url, crop) => savePhoto(url, crop ?? null), true)}
                              onCropEditor={() =>
                                setCropEditorState({
                                  open: true,
                                  imageUrl: displayUrl,
                                  initialCrop: parseCropSafe(displayCrop),
                                  onConfirm: (crop) => {
                                    savePhoto(displayUrl, crop)
                                    setCropEditorState({ open: false, imageUrl: '' })
                                  },
                                })
                              }
                            />
                            {modelPhoto && <span className="absolute left-1.5 top-1.5 rounded-full bg-sky-600/90 px-1.5 py-0.5 text-[9px] font-medium text-white">Фото для этой модели</span>}
                          </>
                        ) : (
                          <button onClick={() => openMediaPicker((url, crop) => savePhoto(url, crop ?? null), true)} className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-300">
                            <span className="text-2xl">📷</span>
                            <span className="text-[11px]">Добавить фото</span>
                          </button>
                        )}
                      </div>
                      {modelPhoto ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 text-xs text-sky-700 dark:text-sky-400">
                          Своё фото для модели
                          <button onClick={() => saveOptionModelPhoto(option.id, selectedModelId, '', null)} className="text-sky-500 hover:text-sky-700">
                            ✕
                          </button>
                        </span>
                      ) : (
                        <button onClick={() => openMediaPicker((url, crop) => saveOptionModelPhoto(option.id, selectedModelId, url, crop ?? null), true)} className="rounded-full border border-slate-200 dark:border-[#3a312a] px-3 py-1 text-xs text-slate-500 dark:text-[#6a5f57] hover:border-sky-400 hover:text-sky-600">
                          + Своё фото для этой модели
                        </button>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Название</label>
                        <input value={editOptionName} onChange={(e) => setEditOptionName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveEditOption()} className="w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">
                            {editOptionMaxLength > 0 || editOptionMaxWidth > 0 ? 'Цена за м² (длина×ширина), ₽' : 'Цена за единицу, ₽'}
                          </label>
                          <input type="number" value={editOptionPrice} onChange={(e) => setEditOptionPrice(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]" title="Фиксированная надбавка, один раз при выборе">
                            Базовая часть, ₽
                          </label>
                          <input type="number" value={editOptionBasePrice} onChange={(e) => setEditOptionBasePrice(e.target.value)} className="w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]" title="Максимальная длина, которую клиент сможет выбрать бегунком. Оставьте 0, чтобы не показывать этот бегунок.">
                            Макс. длина, м (0 — выкл.)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editOptionMaxLength}
                            onChange={(e) => setEditOptionMaxLength(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                            className="w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]" title="Максимальная ширина, которую клиент сможет выбрать бегунком. Оставьте 0, чтобы не показывать этот бегунок.">
                            Макс. ширина, м (0 — выкл.)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editOptionMaxWidth}
                            onChange={(e) => setEditOptionMaxWidth(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                            className="w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      {(editOptionMaxLength > 0 || editOptionMaxWidth > 0) && (
                        <p className="rounded-lg bg-amber-50 dark:bg-amber-900/15 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                          Клиент будет выбирать {editOptionMaxLength > 0 && editOptionMaxWidth > 0 ? 'длину и ширину' : editOptionMaxLength > 0 ? 'длину' : 'ширину'} бегунком, и итоговая цена опции рассчитается как «Цена за м²» × длина × ширина.
                        </p>
                      )}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Единица измерения</label>
                        <select
                          value={['шт', 'м', 'м²', 'м³', 'компл.', 'кг', 'л'].includes(editOptionUnit) ? editOptionUnit : '__custom'}
                          onChange={(e) => e.target.value !== '__custom' && setEditOptionUnit(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="шт">шт</option>
                          <option value="м">м</option>
                          <option value="м²">м²</option>
                          <option value="м³">м³</option>
                          <option value="компл.">компл.</option>
                          <option value="кг">кг</option>
                          <option value="л">л</option>
                          <option value="__custom">Другое…</option>
                        </select>
                        {!['шт', 'м', 'м²', 'м³', 'компл.', 'кг', 'л'].includes(editOptionUnit) && (
                          <input
                            value={editOptionUnit}
                            onChange={(e) => setEditOptionUnit(e.target.value)}
                            placeholder="Своя единица"
                            className="mt-1.5 w-full rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2.5 select-none">
                        <input type="checkbox" checked={editOptionIsDefault} onChange={(e) => setEditOptionIsDefault(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
                        <span className="text-sm text-slate-600 dark:text-[#b5afa7]">По умолчанию выбрана</span>
                      </label>
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Описание</label>
                        <textarea value={editOptionDescription} onChange={(e) => setEditOptionDescription(e.target.value)} rows={3} placeholder="Краткое описание опции для клиента…" className="w-full resize-none rounded-lg border border-slate-200 dark:border-[#3a312a] bg-white dark:bg-[#1a1612] px-3 py-2 text-sm text-slate-800 dark:text-[#e8e2d9] focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-500 dark:text-[#9a8f87]">Попап-варианты</label>
                          <button type="button" onClick={() => setEditOptionPopupChoices((prev) => [...prev, { id: String(Date.now()), name: '', price: '0', image_url: '' }])} className="rounded-lg bg-slate-100 dark:bg-[#2a2520] px-2.5 py-1 text-xs text-slate-600 dark:text-[#9a8f87] hover:bg-slate-200 dark:hover:bg-[#333027]">
                            + Вариант
                          </button>
                        </div>
                        {editOptionPopupChoices.length === 0 && <p className="text-xs text-slate-400 dark:text-[#6a5f57]">Клиент сможет выбрать один из вариантов (напр. цвет, размер)</p>}
                        {editOptionPopupChoices.length > 0 && (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => {
                              const { active, over } = e
                              if (!over || active.id === over.id) return
                              setEditOptionPopupChoices((prev) => {
                                const oldIndex = prev.findIndex((c) => c.id === String(active.id))
                                const newIndex = prev.findIndex((c) => c.id === String(over.id))
                                return arrayMove(prev, oldIndex, newIndex)
                              })
                            }}
                          >
                            <SortableContext items={editOptionPopupChoices.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                              <div className="grid grid-cols-2 gap-2">
                                {editOptionPopupChoices.map((choice, i) => (
                                  <PopupChoiceCard
                                    key={choice.id}
                                    choice={choice}
                                    onImagePick={() => openMediaPicker((url) => setEditOptionPopupChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, image_url: url } : c))))}
                                    onNameChange={(v) => setEditOptionPopupChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, name: v } : c)))}
                                    onPriceChange={(v) => setEditOptionPopupChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, price: v } : c)))}
                                    onRemove={() => setEditOptionPopupChoices((prev) => prev.filter((_, idx) => idx !== i))}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                      <div className="rounded-lg border border-slate-200 dark:border-[#3a312a] divide-y divide-slate-100 dark:divide-[#3a312a]">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-sm text-slate-600 dark:text-[#b5afa7]">Макс. кол-во</span>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setOptionMaxQuantity(option.id, Math.max(1, option.max_quantity - 1))} disabled={option.max_quantity <= 1 || isLocked} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-[#3a312a] font-bold text-slate-600 dark:text-[#b5afa7] disabled:opacity-30">
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-slate-700 dark:text-[#d5cfc7]">{option.max_quantity}</span>
                            <button type="button" onClick={() => setOptionMaxQuantity(option.id, option.max_quantity + 1)} disabled={isLocked} className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-300 font-bold text-emerald-700 disabled:opacity-30">
                              +
                            </button>
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
                          <span className="text-sm text-slate-600 dark:text-[#b5afa7]">Доступна в этой модели</span>
                          <input type="checkbox" checked={option.active_model_ids.includes(Number(selectedModelId))} onChange={() => toggleOptionActiveForModel(option.id, option.active_model_ids.includes(Number(selectedModelId)))} className="h-4 w-4 rounded accent-emerald-600" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-[#3a312a] px-6 py-4 shrink-0">
                  <button onClick={() => setEditingOptionId(null)} className="rounded-xl border border-slate-200 dark:border-[#3a312a] px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50 dark:hover:bg-[#3a312a]">
                    Отмена
                  </button>
                  <button onClick={saveEditOption} disabled={savingOption || isLocked} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {savingOption ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      {deleteOptionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#252119] p-6 shadow-xl">
            <div className="mb-1 text-base font-bold text-slate-800 dark:text-[#e8e2d9]">Удалить опцию?</div>
            <div className="mb-4 text-sm text-slate-500 dark:text-[#9a8f87]">«{deleteOptionConfirm.name}» будет удалена без возможности восстановления.</div>
            {deleteOptionError && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">{deleteOptionError}</div>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteOptionConfirm(null)
                  setDeleteOptionError('')
                }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-[#3a312a] py-2.5 text-sm font-semibold text-slate-600 dark:text-[#b5afa7] hover:bg-slate-50"
              >
                Отмена
              </button>
              <button onClick={confirmDeleteOption} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
