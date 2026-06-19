'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Types ─────────────────────────────────────────────────────────────────────

type RawModel  = { id: string; name: string; image_url: string; base_price: string; sort_order: number }
type RawLayout = { id: string; name: string; price_modifier: string; sort_order: string; model_id: string }
type RawGroup  = { id: string; name: string; sort_order: string; selection_type: string }
type RawOption = { id: string; group_id: string; name: string; price: string; image_url: string; image_crop?: string | null; description: string; model_ids: number[]; active_model_ids: number[]; sort_order: number }
type RawMedia  = { id: string; file_url: string; file_name: string; mime_type: string }
type CropRect  = { x: number; y: number; w: number; h: number }

function parseCrop(s?: string | null): CropRect | null {
  if (!s) return null
  try { return JSON.parse(s) } catch { return null }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PHP_STATIC = 'http://159.194.225.55:8080'
const absUrl = (u: string) => !u ? '' : u.startsWith('http') ? u : PHP_STATIC + (u.startsWith('/') ? '' : '/') + u
const fmt = (v: number) => new Intl.NumberFormat('ru-RU').format(v)

async function apiGet<T = Record<string, unknown>>(action: string, params: Record<string, string> = {}): Promise<T> {
  const sp = new URLSearchParams({ action, ...params })
  return fetch(`/api/php-proxy?${sp}`, { cache: 'no-store' }).then(r => r.json())
}

async function apiPost<T = Record<string, unknown>>(action: string, body: Record<string, unknown>): Promise<T> {
  return fetch(`/api/php-proxy?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())
}

async function apiUpload(file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return fetch('/api/php-upload', { method: 'POST', body: fd }).then(r => r.json())
}

// ── CroppedImage ─────────────────────────────────────────────────────────────

function CroppedImage({ src, crop, alt }: { src: string; crop?: CropRect | null; alt?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef  = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img  = imgRef.current
    const wrap = wrapRef.current
    if (!img || !wrap || !crop) return
    const apply = () => {
      if (!img.naturalWidth) return
      const cw = wrap.clientWidth, ch = wrap.clientHeight
      if (!cw || !ch) { requestAnimationFrame(apply); return }
      const { x, y, w, h } = crop
      const nw = img.naturalWidth, nh = img.naturalHeight
      const scale = Math.max(cw / (nw * w / 100), ch / (nh * h / 100))
      img.style.width  = `${nw * scale}px`
      img.style.height = `${nh * scale}px`
      img.style.left   = `${-(nw * x / 100) * scale}px`
      img.style.top    = `${-(nh * y / 100) * scale}px`
    }
    if (img.complete && img.naturalWidth) { requestAnimationFrame(apply) }
    else { img.addEventListener('load', apply, { once: true }) }
    return () => img.removeEventListener('load', apply)
  }, [crop, src])

  if (!crop) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={absUrl(src)} alt={alt ?? ''} className="h-full w-full object-cover" />
  }
  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={absUrl(src)} alt={alt ?? ''} style={{ position: 'absolute', maxWidth: 'none', maxHeight: 'none' }} />
    </div>
  )
}

// ── CropEditor ────────────────────────────────────────────────────────────────

function CropEditor({ imageUrl, initialCrop, onConfirm, onCancel }: {
  imageUrl: string
  initialCrop?: CropRect | null
  onConfirm: (crop: CropRect) => void
  onCancel: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [crop, setCrop] = useState<CropRect>(initialCrop ?? { x: 5, y: 5, w: 90, h: 90 })
  const dragRef = useRef<{
    type: 'move' | 'tl' | 'tr' | 'bl' | 'br'
    startX: number; startY: number
    startCrop: CropRect
    cw: number; ch: number
  } | null>(null)

  const MIN = 5

  const startDrag = (type: 'move' | 'tl' | 'tr' | 'bl' | 'br', e: React.PointerEvent) => {
    e.stopPropagation()
    const r = containerRef.current?.getBoundingClientRect()
    if (!r) return
    dragRef.current = { type, startX: e.clientX, startY: e.clientY, startCrop: { ...crop }, cw: r.width, ch: r.height }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.startX) / d.cw * 100
    const dy = (e.clientY - d.startY) / d.ch * 100
    const s = d.startCrop
    let { x, y, w, h } = s

    if (d.type === 'move') {
      x = Math.max(0, Math.min(100 - w, s.x + dx))
      y = Math.max(0, Math.min(100 - h, s.y + dy))
    } else if (d.type === 'br') {
      w = Math.max(MIN, Math.min(100 - s.x, s.w + dx))
      h = Math.max(MIN, Math.min(100 - s.y, s.h + dy))
    } else if (d.type === 'tl') {
      const nx = Math.max(0, Math.min(s.x + s.w - MIN, s.x + dx))
      const ny = Math.max(0, Math.min(s.y + s.h - MIN, s.y + dy))
      w = s.x + s.w - nx; h = s.y + s.h - ny; x = nx; y = ny
    } else if (d.type === 'tr') {
      const ny = Math.max(0, Math.min(s.y + s.h - MIN, s.y + dy))
      w = Math.max(MIN, Math.min(100 - s.x, s.w + dx))
      h = s.y + s.h - ny; y = ny
    } else if (d.type === 'bl') {
      const nx = Math.max(0, Math.min(s.x + s.w - MIN, s.x + dx))
      w = s.x + s.w - nx
      h = Math.max(MIN, Math.min(100 - s.y, s.h + dy))
      x = nx
    }
    setCrop({ x, y, w, h })
  }

  const onUp = () => { dragRef.current = null }

  const corners = [
    { id: 'tl' as const, style: { top: -5, left: -5, cursor: 'nwse-resize' } },
    { id: 'tr' as const, style: { top: -5, right: -5, cursor: 'nesw-resize' } },
    { id: 'bl' as const, style: { bottom: -5, left: -5, cursor: 'nesw-resize' } },
    { id: 'br' as const, style: { bottom: -5, right: -5, cursor: 'nwse-resize' } },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Кадрирование</h2>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <div
          ref={containerRef}
          className="relative select-none overflow-hidden bg-slate-900"
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={absUrl(imageUrl)} alt="" className="block w-full" draggable={false} />

          {/* dark overlay: 4 regions */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/55" style={{ height: `${crop.y}%` }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55" style={{ height: `${100 - crop.y - crop.h}%` }} />
          <div className="pointer-events-none absolute bg-black/55" style={{ left: 0, top: `${crop.y}%`, width: `${crop.x}%`, height: `${crop.h}%` }} />
          <div className="pointer-events-none absolute bg-black/55" style={{ right: 0, top: `${crop.y}%`, width: `${100 - crop.x - crop.w}%`, height: `${crop.h}%` }} />

          {/* crop rect */}
          <div
            className="absolute cursor-move border-2 border-white"
            style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.w}%`, height: `${crop.h}%` }}
            onPointerDown={e => startDrag('move', e)}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute h-full border-r border-white/30" style={{ left: '33.3%' }} />
              <div className="absolute h-full border-r border-white/30" style={{ left: '66.6%' }} />
              <div className="absolute w-full border-b border-white/30" style={{ top: '33.3%' }} />
              <div className="absolute w-full border-b border-white/30" style={{ top: '66.6%' }} />
            </div>
            {corners.map(c => (
              <div
                key={c.id}
                className="absolute h-4 w-4 rounded-sm bg-white shadow"
                style={{ ...c.style, position: 'absolute' }}
                onPointerDown={e => startDrag(c.id, e)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <button
            onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            Вся область
          </button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
              Отмена
            </button>
            <button
              onClick={() => onConfirm(crop)}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MediaPicker ───────────────────────────────────────────────────────────────

function MediaPicker({
  media,
  onSelect,
  onClose,
  onUpload,
  onDelete,
}: {
  media: RawMedia[]
  onSelect: (url: string) => void
  onClose: () => void
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { await onUpload(file) } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Удалить фото из медиатеки?')) return
    setDeletingId(id)
    try { await onDelete(id) } finally { setDeletingId(null) }
  }

  const images = media.filter(m => m.mime_type?.startsWith('image'))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Выберите изображение</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="p-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50"
          >
            {uploading ? '⏳ Загрузка…' : '+ Загрузить новое фото'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {images.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Медиатека пуста — загрузите первое фото</p>
          ) : (
            <div className="grid max-h-[55vh] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5 md:grid-cols-6">
              {images.map(m => (
                <div key={m.id} className="group relative aspect-square">
                  <button
                    onClick={() => onSelect(m.file_url)}
                    className="h-full w-full overflow-hidden rounded-xl border-2 border-transparent transition-all hover:border-emerald-500 hover:shadow-md"
                    title={m.file_name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={absUrl(m.file_url)} alt={m.file_name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </button>
                  <button
                    onClick={e => handleDelete(e, m.id)}
                    disabled={deletingId === m.id}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
                    title="Удалить"
                  >
                    ✕
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

// ── LayoutRow ─────────────────────────────────────────────────────────────────

function LayoutRow({
  layout,
  onSave,
  onDelete,
}: {
  layout: RawLayout
  onSave: (id: string, name: string, price: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(layout.name)
  const [price, setPrice] = useState(String(layout.price_modifier))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(layout.name); setPrice(String(layout.price_modifier)) }, [layout.name, layout.price_modifier])

  const save = async () => {
    setSaving(true)
    await onSave(layout.id, name, Number(price))
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Название"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="0"
          className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
        />
        <span className="shrink-0 text-xs text-slate-400">₽</span>
        <button onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? '…' : 'Сохр.'}
        </button>
        <button onClick={() => { setEditing(false); setName(layout.name); setPrice(String(layout.price_modifier)) }} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50">
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex-1">
        <span className="text-sm font-medium text-slate-800">{layout.name}</span>
        {Number(layout.price_modifier) > 0 && (
          <span className="ml-2 text-xs text-amber-600">+{fmt(Number(layout.price_modifier))} ₽</span>
        )}
        {Number(layout.price_modifier) === 0 && (
          <span className="ml-2 text-xs text-slate-400">включена в цену</span>
        )}
      </div>
      <button onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700">✎</button>
      <button onClick={() => onDelete(layout.id)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-100 hover:text-red-600">🗑</button>
    </div>
  )
}

// ── SortableCard ─────────────────────────────────────────────────────────────

function SortableCard({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      {/* drag strip */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={`flex h-5 w-full items-center justify-center rounded-t-xl text-xs text-slate-300 hover:bg-slate-200 hover:text-slate-500 ${disabled ? 'cursor-default' : 'cursor-grab touch-none active:cursor-grabbing'}`}
        style={{ touchAction: 'none' }}
      >
        {!disabled && '⠿'}
      </div>
      {children}
    </div>
  )
}

// ── SortableGroupItem ─────────────────────────────────────────────────────────

function SortableGroupItem({ id, children }: { id: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const handle = (
    <div
      ref={setActivatorNodeRef} {...attributes} {...listeners}
      className="cursor-grab px-2 text-slate-300 hover:text-slate-500 active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >⠿</div>
  )
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      {children(handle)}
    </div>
  )
}

// ── SortableModelRow ──────────────────────────────────────────────────────────

function SortableModelRow({ model, isSelected, onSelect, onCopy, onDelete, fmt, absUrl }: {
  model: RawModel; isSelected: boolean
  onSelect: () => void; onCopy: () => void; onDelete: () => void
  fmt: (v: number) => string; absUrl: (u: string) => string
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: model.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`group flex items-stretch border-r-2 transition-colors hover:bg-slate-50 ${isSelected ? 'border-[#0d5a52] bg-emerald-50/60' : 'border-transparent'}`}
    >
      {/* drag grip */}
      <div ref={setActivatorNodeRef} {...attributes} {...listeners}
        className="flex cursor-grab items-center px-1.5 text-slate-200 hover:text-slate-400 active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >⠿</div>
      {/* select area */}
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-start gap-2 py-2.5 pr-1 text-left">
        <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {model.image_url
            ? <img src={absUrl(model.image_url)} alt={model.name} className="h-full w-full object-cover" /> // eslint-disable-line @next/next/no-img-element
            : <div className="flex h-full w-full items-center justify-center text-lg opacity-20">🛁</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`break-words text-sm font-medium leading-tight ${isSelected ? 'text-[#0d5a52]' : 'text-slate-700'}`} style={{ wordBreak: 'break-word' }}>
            {model.name}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">{fmt(Number(model.base_price))} ₽</div>
        </div>
      </button>
      {/* actions */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 pr-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={onCopy} title="Копировать"
          className="rounded p-1 text-slate-300 hover:text-[#0d5a52]">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10V2.5A1.5 1.5 0 0 1 4.5 1H10"/>
          </svg>
        </button>
        <button onClick={onDelete} title="Удалить"
          className="rounded p-1 text-slate-300 hover:text-red-500">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h11M5 4V2.5A.5.5 0 0 1 5.5 2h4a.5.5 0 0 1 .5.5V4M6 7v5M9 7v5"/><rect x="3" y="4" width="9" height="9" rx="1"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Admin2Page() {
  const [models, setModels] = useState<RawModel[]>([])
  const [media, setMedia] = useState<RawMedia[]>([])
  const [groups, setGroups] = useState<RawGroup[]>([])
  const [options, setOptions] = useState<RawOption[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [layouts, setLayouts] = useState<RawLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [newLayoutName, setNewLayoutName] = useState('')
  const [newLayoutPrice, setNewLayoutPrice] = useState('0')
  const [addingLayout, setAddingLayout] = useState(false)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ open: boolean; withCrop?: boolean; onPick?: (url: string, crop?: CropRect | null) => void }>({ open: false })
  const [cropEditor, setCropEditor] = useState<{ open: boolean; imageUrl: string; initialCrop?: CropRect | null; onConfirm?: (crop: CropRect) => void }>({ open: false, imageUrl: '' })
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [addingOptGroupId, setAddingOptGroupId] = useState<string | null>(null)
  const [newOptName, setNewOptName] = useState('')
  const [newOptPrice, setNewOptPrice] = useState('0')
  const [newOptAdding, setNewOptAdding] = useState(false)
  const [editingOptId, setEditingOptId] = useState<string | null>(null)
  const [editOptName, setEditOptName] = useState('')
  const [editOptPrice, setEditOptPrice] = useState('0')
  const [editOptSaving, setEditOptSaving] = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadBootstrap = async (keepModel?: string) => {
    setLoading(true)
    try {
      const data = await apiGet<{ ok: boolean; models: RawModel[]; media: RawMedia[]; groups: RawGroup[]; options: RawOption[] }>('bootstrap')
      const ms = data.models || []
      setModels(ms)
      setMedia(data.media || [])
      setGroups(data.groups || [])
      setOptions(data.options || [])
      const activeId = keepModel || selectedModelId || (ms[0]?.id ?? '')
      setSelectedModelId(activeId)
    } finally {
      setLoading(false)
    }
  }

  const loadLayouts = async (modelId: string) => {
    const data = await apiGet<{ layouts: RawLayout[] }>('get_layouts', { model_id: modelId })
    setLayouts(data.layouts || [])
  }

  useEffect(() => { loadBootstrap() }, [])
  useEffect(() => { if (selectedModelId) loadLayouts(selectedModelId) }, [selectedModelId])

  const selectedModel = models.find(m => m.id === selectedModelId)

  useEffect(() => {
    if (selectedModel) {
      setEditName(selectedModel.name)
      setEditPrice(String(selectedModel.base_price))
      setEditingMeta(false)
    }
  }, [selectedModel?.id])

  // ── Filtered data ─────────────────────────────────────────────────────────────

  const modelOptions = options.filter(o => o.model_ids.includes(Number(selectedModelId)))
  const modelGroups = [...groups].sort((a, b) => Number(a.sort_order) - Number(b.sort_order))

  // ── Media picker ──────────────────────────────────────────────────────────────

  const openPicker = (onPick: (url: string, crop?: CropRect | null) => void, withCrop?: boolean) =>
    setPicker({ open: true, onPick, withCrop })
  const closePicker = () => setPicker({ open: false, imageUrl: '' } as typeof picker)

  const handlePickerSelect = (url: string) => {
    if (picker.withCrop) {
      const onPick = picker.onPick
      closePicker()
      setCropEditor({ open: true, imageUrl: url, initialCrop: null, onConfirm: (crop) => {
        onPick?.(url, crop)
        setCropEditor({ open: false, imageUrl: '' })
      }})
    } else {
      picker.onPick?.(url)
      closePicker()
    }
  }

  const handleMediaDelete = async (id: string) => {
    await apiPost('delete_media', { id: Number(id) })
    setMedia(prev => prev.filter(m => m.id !== id))
  }

  const handleUpload = async (file: File) => {
    const res = await apiUpload(file)
    if (res.ok && res.url) {
      await loadBootstrap(selectedModelId)
      picker.onPick?.(res.url)
      closePicker()
    } else {
      alert(res.error || 'Ошибка загрузки')
    }
  }

  // ── Model actions ─────────────────────────────────────────────────────────────

  const setModelPhoto = async (url: string) => {
    if (!selectedModel) return
    await apiPost('update_model_image', { id: Number(selectedModel.id), image_url: url })
    setModels(ms => ms.map(m => m.id === selectedModel.id ? { ...m, image_url: url } : m))
  }

  const saveModelMeta = async () => {
    if (!selectedModel) return
    setSaving(true)
    await apiPost('update_model', {
      id: Number(selectedModel.id),
      name: editName,
      image_url: selectedModel.image_url,
      base_price: Number(editPrice),
    })
    setModels(ms => ms.map(m => m.id === selectedModel.id ? { ...m, name: editName, base_price: editPrice } : m))
    setSaving(false)
    setEditingMeta(false)
  }

  const addModel = async () => {
    const name = prompt('Название модели')
    if (!name?.trim()) return
    const res = await apiPost<{ ok: boolean; id?: number }>('create_model', { name: name.trim(), image_url: '', base_price: 300000 })
    if (res.ok) await loadBootstrap(res.id ? String(res.id) : undefined)
  }

  const deleteModel = async (m?: RawModel) => {
    const target = m ?? selectedModel
    if (!target) return
    if (!confirm(`Удалить модель «${target.name}»?`)) return
    await apiPost('delete_model', { id: Number(target.id) })
    if (selectedModelId === target.id) setSelectedModelId('')
    await loadBootstrap('')
  }

  const duplicateModel = async () => {
    if (!selectedModel) return
    const res = await apiPost<{ ok: boolean; id?: number; name?: string; error?: string }>('duplicate_model', { id: Number(selectedModel.id) })
    if (res.ok && res.id) {
      await loadBootstrap(String(res.id))
    } else {
      alert(res.error || 'Ошибка дублирования')
    }
  }

  // ── DnD ──────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleModelDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setModels(prev => {
      const oldIdx = prev.findIndex(m => m.id === active.id)
      const newIdx = prev.findIndex(m => m.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx).map((m, i) => ({ ...m, sort_order: i }))
      apiPost('reorder_models', { items: reordered.map(m => ({ id: Number(m.id), sort_order: m.sort_order })) })
      return reordered
    })
  }, [])

  const handleGroupDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setGroups(prev => {
      const oldIdx = prev.findIndex(g => g.id === active.id)
      const newIdx = prev.findIndex(g => g.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx).map((g, i) => ({ ...g, sort_order: String(i) }))
      apiPost('reorder_groups', { items: reordered.map(g => ({ id: Number(g.id), sort_order: Number(g.sort_order) })) })
      return reordered
    })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent, groupId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOptions(prev => {
      const grp = prev.filter(o => o.group_id === groupId)
      const rest = prev.filter(o => o.group_id !== groupId)
      const oldIdx = grp.findIndex(o => o.id === active.id)
      const newIdx = grp.findIndex(o => o.id === over.id)
      const reordered = arrayMove(grp, oldIdx, newIdx).map((o, i) => ({ ...o, sort_order: i }))
      // fire-and-forget bulk update
      apiPost('reorder_options', { items: reordered.map(o => ({ id: Number(o.id), sort_order: o.sort_order })) })
      return [...rest, ...reordered]
    })
  }, [])

  // ── Layout actions ────────────────────────────────────────────────────────────

  const addLayout = async () => {
    if (!newLayoutName.trim() || !selectedModelId) return
    setAddingLayout(true)
    await apiPost('create_layout', {
      model_id: Number(selectedModelId),
      name: newLayoutName.trim(),
      price_modifier: Number(newLayoutPrice),
      sort_order: layouts.length,
    })
    await loadLayouts(selectedModelId)
    setNewLayoutName('')
    setNewLayoutPrice('0')
    setAddingLayout(false)
  }

  const saveLayout = async (id: string, name: string, price: number) => {
    await apiPost('update_layout', { id: Number(id), name, price_modifier: price })
    await loadLayouts(selectedModelId)
  }

  const deleteLayout = async (id: string) => {
    if (!confirm('Удалить планировку?')) return
    await apiPost('delete_layout', { id: Number(id) })
    await loadLayouts(selectedModelId)
  }

  // ── Group actions ─────────────────────────────────────────────────────────────

  const toggleGroupSelection = async (groupId: string, currentType: string) => {
    const newType = currentType === 'multiple' ? 'single' : 'multiple'
    await apiPost('update_group_selection', { id: Number(groupId), selection_type: newType })
    setGroups(gs => gs.map(g => g.id === groupId ? { ...g, selection_type: newType } : g))
  }

  // ── Option actions ────────────────────────────────────────────────────────────

  const toggleOptionActive = async (optionId: string, currentlyActive: boolean) => {
    const newVal = currentlyActive ? 0 : 1
    await apiPost('toggle_option_active', { option_id: Number(optionId), model_id: Number(selectedModelId), is_active: newVal })
    setOptions(os => os.map(o => {
      if (o.id !== optionId) return o
      const mid = Number(selectedModelId)
      const active = newVal === 1
        ? [...o.active_model_ids.filter(m => m !== mid), mid]
        : o.active_model_ids.filter(m => m !== mid)
      return { ...o, active_model_ids: active }
    }))
  }

  const addGroup = async () => {
    if (!newGroupName.trim() || addingGroup) return
    setAddingGroup(true)
    const res = await apiPost<{ ok: boolean; id?: number }>('create_group', { name: newGroupName.trim(), sort_order: groups.length + 1 })
    if (res.ok && res.id) {
      const ng: RawGroup = { id: String(res.id), name: newGroupName.trim(), sort_order: String(groups.length + 1), selection_type: 'multiple' }
      setGroups(gs => [...gs, ng])
      setExpandedGroupId(String(res.id))
      setNewGroupName('')
    }
    setAddingGroup(false)
  }

  const deleteGroup = async (groupId: string, name: string) => {
    if (!confirm(`Удалить блок «${name}»? Все опции блока тоже будут удалены.`)) return
    await apiPost('delete_group', { id: Number(groupId) })
    setGroups(gs => gs.filter(g => g.id !== groupId))
    setOptions(os => os.filter(o => o.group_id !== groupId))
    if (expandedGroupId === groupId) setExpandedGroupId(null)
  }

  const addOption = async () => {
    if (!newOptName.trim() || !addingOptGroupId || newOptAdding) return
    setNewOptAdding(true)
    const res = await apiPost<{ ok: boolean; id?: number }>('create_option_json', {
      group_id: Number(addingOptGroupId),
      model_id: Number(selectedModelId),
      name: newOptName.trim(),
      price: Number(newOptPrice),
    })
    if (res.ok && res.id) {
      const mid = Number(selectedModelId)
      const grpLen = options.filter(o => o.group_id === addingOptGroupId).length
      setOptions(os => [...os, {
        id: String(res.id!),
        group_id: addingOptGroupId,
        name: newOptName.trim(),
        price: newOptPrice,
        image_url: '',
        description: '',
        model_ids: [mid],
        active_model_ids: [mid],
        sort_order: grpLen,
      }])
      setNewOptName('')
      setNewOptPrice('0')
      setAddingOptGroupId(null)
    }
    setNewOptAdding(false)
  }

  const startEditOption = (opt: RawOption) => {
    setEditingOptId(opt.id)
    setEditOptName(opt.name)
    setEditOptPrice(opt.price)
  }

  const saveOption = async () => {
    if (!editingOptId || !editOptName.trim() || editOptSaving) return
    setEditOptSaving(true)
    await apiPost('update_option_json', { id: Number(editingOptId), name: editOptName.trim(), price: Number(editOptPrice) })
    setOptions(os => os.map(o => o.id === editingOptId ? { ...o, name: editOptName.trim(), price: editOptPrice } : o))
    setEditingOptId(null)
    setEditOptSaving(false)
  }

  const deleteOptionItem = async (optionId: string, name: string) => {
    if (!confirm(`Удалить опцию «${name}»?`)) return
    await apiPost('delete_option_json', { id: Number(optionId) })
    setOptions(os => os.filter(o => o.id !== optionId))
  }

  const setOptionPhoto = async (optionId: string, url: string, crop?: CropRect | null) => {
    const cropJson = crop ? JSON.stringify(crop) : null
    await apiPost('update_option_image', { id: Number(optionId), image_url: url, image_crop: cropJson })
    setOptions(os => os.map(o => o.id === optionId ? { ...o, image_url: url, image_crop: cropJson } : o))
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400">Загрузка…</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 font-sans">

      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0d5a52] text-sm">🛁</div>
          <span className="text-base font-bold text-slate-800">Конфигуратор — Управление</span>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-700">
          Открыть конфигуратор ↗
        </a>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — model list */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Модели</span>
            <button
              onClick={addModel}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0d5a52] text-sm font-bold text-white hover:bg-[#0a4840]"
              title="Добавить модель"
            >
              +
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModelDragEnd}>
            <SortableContext items={models.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <div className="flex-1 overflow-y-auto">
                {models.map(m => (
                  <SortableModelRow
                    key={m.id}
                    model={m}
                    isSelected={selectedModelId === m.id}
                    onSelect={() => setSelectedModelId(m.id)}
                    onCopy={async () => {
                      const res = await apiPost<{ ok: boolean; id?: number; error?: string }>('duplicate_model', { id: Number(m.id) })
                      if (res.ok && res.id) await loadBootstrap(String(res.id))
                      else alert(res.error || 'Ошибка')
                    }}
                    onDelete={() => deleteModel(m)}
                    fmt={fmt}
                    absUrl={absUrl}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedModel ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Выберите модель из списка слева</p>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-5">

              {/* Model card */}
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex gap-5 p-5">

                  {/* Photo — click to change */}
                  <button
                    onClick={() => openPicker(url => setModelPhoto(url))}
                    className="group relative h-36 w-52 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-[#0d5a52]"
                  >
                    {selectedModel.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={absUrl(selectedModel.image_url)} alt={selectedModel.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-300">
                        <span className="text-4xl">🖼</span>
                        <span className="text-xs">Нажмите для выбора</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                        Изменить фото
                      </span>
                    </div>
                  </button>

                  {/* Meta */}
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    {editingMeta ? (
                      <>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">Название</label>
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-[#0d5a52] focus:outline-none"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">Базовая стоимость, ₽</label>
                          <input
                            type="number"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-[#0d5a52] focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveModelMeta}
                            disabled={saving}
                            className="rounded-xl bg-[#0d5a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a4840] disabled:opacity-50"
                          >
                            {saving ? 'Сохранение…' : 'Сохранить'}
                          </button>
                          <button
                            onClick={() => { setEditingMeta(false); setEditName(selectedModel.name); setEditPrice(String(selectedModel.base_price)) }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                          >
                            Отмена
                          </button>
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={duplicateModel}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                            >
                              Дублировать
                            </button>
                            <button
                              onClick={() => deleteModel()}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h1 className="text-xl font-bold text-slate-800">{selectedModel.name}</h1>
                        <div className="text-sm text-slate-500">
                          Базовая стоимость: <span className="font-semibold text-slate-700">{fmt(Number(selectedModel.base_price))} ₽</span>
                        </div>
                        <button
                          onClick={() => setEditingMeta(true)}
                          className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          ✎ Редактировать
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Layouts */}
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h2 className="text-sm font-bold text-slate-700">Планировки</h2>
                  <span className="text-xs text-slate-400">{layouts.length}</span>
                </div>
                <div className="space-y-2 p-4">
                  {layouts.length === 0 && (
                    <p className="py-4 text-center text-sm text-slate-400">Нет планировок — добавьте первую</p>
                  )}
                  {layouts.map(l => (
                    <LayoutRow key={l.id} layout={l} onSave={saveLayout} onDelete={deleteLayout} />
                  ))}
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <input
                      value={newLayoutName}
                      onChange={e => setNewLayoutName(e.target.value)}
                      placeholder="Название планировки"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#0d5a52] focus:outline-none"
                      onKeyDown={e => e.key === 'Enter' && addLayout()}
                    />
                    <input
                      type="number"
                      value={newLayoutPrice}
                      onChange={e => setNewLayoutPrice(e.target.value)}
                      placeholder="0"
                      className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#0d5a52] focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">₽</span>
                    <button
                      onClick={addLayout}
                      disabled={addingLayout || !newLayoutName.trim()}
                      className="rounded-xl bg-[#0d5a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a4840] disabled:opacity-50"
                    >
                      {addingLayout ? '…' : '+ Добавить'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Options by group */}
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-700">Блоки опций</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Нажмите на фото — выбрать и кадрировать</p>
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
                  <SortableContext items={modelGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-slate-100">
                  {modelGroups.map(group => {
                    const grpOptions = modelOptions.filter(o => o.group_id === group.id)
                    const open = expandedGroupId === group.id
                    return (
                      <SortableGroupItem key={group.id} id={group.id}>
                        {handle => (
                        <div>
                        <div className="flex items-center hover:bg-slate-50 transition-colors">
                          {handle}
                          <button
                            onClick={() => setExpandedGroupId(open ? null : group.id)}
                            className="flex flex-1 items-center gap-3 py-4 pr-5 text-left"
                          >
                            <span className={`text-xs text-slate-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>▶</span>
                            <span className="flex-1 text-sm font-medium text-slate-700">{group.name}</span>
                          </button>
                          <span
                            onClick={e => { e.stopPropagation(); toggleGroupSelection(group.id, group.selection_type) }}
                            className={`cursor-pointer rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                              group.selection_type === 'multiple'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                            title="Нажмите чтобы переключить тип выбора"
                          >
                            {group.selection_type === 'multiple' ? 'Множественный' : 'Один вариант'}
                          </span>
                          <span className="mx-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                            {grpOptions.length}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); deleteGroup(group.id, group.name) }}
                            className="mr-3 rounded-lg px-1.5 py-0.5 text-xs text-slate-300 hover:bg-red-50 hover:text-red-500"
                            title="Удалить блок"
                          >
                            🗑
                          </button>
                        </div>
                        {open && (
                          <div className="px-5 pb-5">
                            {grpOptions.length === 0 && (
                              <p className="py-3 text-center text-xs text-slate-400">Нет опций — добавьте первую</p>
                            )}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, group.id)}>
                              <SortableContext items={grpOptions.map(o => o.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                              {grpOptions.map(opt => {
                                const isActive = opt.active_model_ids.includes(Number(selectedModelId))
                                const isEditing = editingOptId === opt.id
                                return (
                                  <SortableCard key={opt.id} id={opt.id} disabled={isEditing}>
                                  <div className={`overflow-hidden rounded-xl border bg-slate-50 transition-opacity ${isActive ? 'border-slate-100' : 'border-slate-200 opacity-50'}`}>
                                    <button
                                      onClick={() => openPicker((url, crop) => setOptionPhoto(opt.id, url, crop), true)}
                                      className="group relative block aspect-[4/3] w-full overflow-hidden bg-slate-200"
                                    >
                                      {opt.image_url ? (
                                        <CroppedImage src={opt.image_url} crop={parseCrop(opt.image_crop)} alt={opt.name} />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-2xl text-slate-300">🖼</div>
                                      )}
                                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                        <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">Изменить фото</span>
                                        {opt.image_url && (
                                          <span
                                            role="button"
                                            onClick={e => {
                                              e.stopPropagation()
                                              setCropEditor({
                                                open: true,
                                                imageUrl: opt.image_url,
                                                initialCrop: parseCrop(opt.image_crop),
                                                onConfirm: (crop) => {
                                                  setOptionPhoto(opt.id, opt.image_url, crop)
                                                  setCropEditor({ open: false, imageUrl: '' })
                                                },
                                              })
                                            }}
                                            className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-white/40"
                                          >
                                            ✂ Кадрировать
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                    <div className="p-2">
                                      {isEditing ? (
                                        <>
                                          <input
                                            value={editOptName}
                                            onChange={e => setEditOptName(e.target.value)}
                                            className="mb-1 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && saveOption()}
                                          />
                                          <input
                                            type="number"
                                            value={editOptPrice}
                                            onChange={e => setEditOptPrice(e.target.value)}
                                            className="mb-1.5 w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                                            placeholder="Цена, ₽"
                                          />
                                          <div className="flex gap-1">
                                            <button onClick={saveOption} disabled={editOptSaving} className="flex-1 rounded bg-emerald-600 py-1 text-[11px] font-bold text-white disabled:opacity-50">
                                              {editOptSaving ? '…' : 'Сохр.'}
                                            </button>
                                            <button onClick={() => setEditingOptId(null)} className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-500">
                                              ✕
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex items-start gap-1">
                                            <div className="min-w-0 flex-1 break-words text-xs font-semibold text-slate-700">{opt.name}</div>
                                            <button onClick={() => startEditOption(opt)} className="shrink-0 text-[10px] text-slate-300 hover:text-slate-600">✎</button>
                                            <button onClick={() => deleteOptionItem(opt.id, opt.name)} className="shrink-0 text-[10px] text-slate-300 hover:text-red-500">🗑</button>
                                          </div>
                                          {Number(opt.price) > 0 && (
                                            <div className="text-xs text-amber-600">+{fmt(Number(opt.price))} ₽</div>
                                          )}
                                          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5">
                                            <input
                                              type="checkbox"
                                              checked={isActive}
                                              onChange={() => toggleOptionActive(opt.id, isActive)}
                                              className="h-3.5 w-3.5 rounded accent-emerald-600"
                                            />
                                            <span className={`text-[11px] ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                                              {isActive ? 'Доступна' : 'Скрыта'}
                                            </span>
                                          </label>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  </SortableCard>
                                )
                              })}

                              {/* Add option card */}
                              {addingOptGroupId === group.id ? (
                                <div className="flex flex-col gap-1.5 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-3">
                                  <input
                                    value={newOptName}
                                    onChange={e => setNewOptName(e.target.value)}
                                    placeholder="Название опции"
                                    className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && addOption()}
                                  />
                                  <input
                                    type="number"
                                    value={newOptPrice}
                                    onChange={e => setNewOptPrice(e.target.value)}
                                    placeholder="Цена, ₽"
                                    className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                                  />
                                  <div className="flex gap-1">
                                    <button onClick={addOption} disabled={newOptAdding || !newOptName.trim()} className="flex-1 rounded bg-emerald-600 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                                      {newOptAdding ? '…' : 'Добавить'}
                                    </button>
                                    <button onClick={() => { setAddingOptGroupId(null); setNewOptName(''); setNewOptPrice('0') }} className="rounded border border-slate-200 bg-white px-2 text-xs text-slate-500">
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setAddingOptGroupId(group.id); setNewOptName(''); setNewOptPrice('0') }}
                                  className="flex aspect-auto min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition-colors hover:border-emerald-400 hover:text-emerald-600"
                                >
                                  <span className="text-xl font-light">+</span>
                                  <span className="text-[11px]">Добавить опцию</span>
                                </button>
                              )}
                            </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        )}
                        </div>
                        )}
                      </SortableGroupItem>
                    )
                  })}

                  {/* Add group row */}
                  <div className="flex items-center gap-2 px-5 py-4">
                    <input
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      placeholder="Название нового блока"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#0d5a52] focus:outline-none"
                      onKeyDown={e => e.key === 'Enter' && addGroup()}
                    />
                    <button
                      onClick={addGroup}
                      disabled={addingGroup || !newGroupName.trim()}
                      className="rounded-xl bg-[#0d5a52] px-4 py-2 text-sm font-bold text-white hover:bg-[#0a4840] disabled:opacity-50"
                    >
                      {addingGroup ? '…' : '+ Блок'}
                    </button>
                  </div>
                </div>
                  </SortableContext>
                </DndContext>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Media picker modal */}
      {picker.open && (
        <MediaPicker
          media={media}
          onSelect={handlePickerSelect}
          onClose={closePicker}
          onUpload={handleUpload}
          onDelete={handleMediaDelete}
        />
      )}

      {/* Crop editor modal */}
      {cropEditor.open && (
        <CropEditor
          imageUrl={cropEditor.imageUrl}
          initialCrop={cropEditor.initialCrop}
          onConfirm={crop => cropEditor.onConfirm?.(crop)}
          onCancel={() => setCropEditor({ open: false, imageUrl: '' })}
        />
      )}
    </div>
  )
}
