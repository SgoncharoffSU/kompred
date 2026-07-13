'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { phpCalculationService, phpLayoutService, phpModelService, phpOptionGroupService, phpOptionService } from '@/services/php-api'
import { Layout, Model, Option, OptionGroup } from '@/types/database'

type UserInfo = { email: string; workspace_name: string; use_php: boolean }

type OptionsByGroup = Record<string, Option[]>
type SelectionMap = Record<string, string[]>
type CropRect = { x: number; y: number; w: number; h: number }

function CroppedImage({ src, crop, className }: { src: string; crop?: CropRect | null; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef  = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const img = imgRef.current, wrap = wrapRef.current
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
    return <img src={src} alt="" className={className ?? 'h-full w-full object-cover'} />
  }
  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt="" style={{ position: 'absolute', maxWidth: 'none', maxHeight: 'none' }} />
    </div>
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
  return <div className={`animate-pulse rounded-xl bg-[#e8ddd3] ${className}`} />
}

export default function HomePage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState('')
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [selectedLayoutId, setSelectedLayoutId] = useState('')
  const [groups, setGroups] = useState<OptionGroup[]>([])
  const [optionsByGroup, setOptionsByGroup] = useState<OptionsByGroup>({})
  const [selectedOptions, setSelectedOptions] = useState<SelectionMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offerLink, setOfferLink] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setUser(d.user) })
  }, [])

  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await phpModelService.getAllModels()
        setModels(data)
        if (data.length > 0) setSelectedModelId(data[0].id)
      } catch {
        setError('Не удалось загрузить модели')
      } finally {
        setLoading(false)
      }
    }
    loadModels()
  }, [])

  useEffect(() => {
    const loadModelData = async () => {
      if (!selectedModelId) return
      setLoading(true)
      setError('')
      setOfferLink('')
      setSelectedLayoutId('')
      setSelectedOptions({})

      try {
        const [layoutData, groupData] = await Promise.all([
          phpLayoutService.getLayoutsByModel(selectedModelId),
          phpOptionGroupService.getGroupsByModel(selectedModelId),
        ])

        setLayouts(layoutData)
        setGroups(groupData)
        if (layoutData.length > 0) setSelectedLayoutId(layoutData[0].id)

        const groupOptions = await Promise.all(
          groupData.map(async (group) => ({
            groupId: group.id,
            options: await phpOptionService.getOptionsByGroup(group.id, selectedModelId),
          }))
        )

        const optionMap: OptionsByGroup = {}
        const defaultSelection: SelectionMap = {}

        groupOptions.forEach((item) => {
          optionMap[item.groupId] = item.options
          const defaults = item.options.filter((opt) => opt.is_default).map((opt) => opt.id)
          if (defaults.length > 0) defaultSelection[item.groupId] = defaults
        })

        setOptionsByGroup(optionMap)
        setSelectedOptions(defaultSelection)
      } catch {
        setError('Не удалось загрузить конфигуратор для выбранной модели')
      } finally {
        setLoading(false)
      }
    }

    loadModelData()
  }, [selectedModelId])

  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) || null,
    [models, selectedModelId]
  )

  const selectedLayout = useMemo(
    () => layouts.find((l) => l.id === selectedLayoutId) || null,
    [layouts, selectedLayoutId]
  )

  const selectedOptionIds = useMemo(
    () => Object.values(selectedOptions).flat(),
    [selectedOptions]
  )

  const selectedOptionEntities = useMemo(() => {
    const all = Object.values(optionsByGroup).flat()
    return all.filter((opt) => selectedOptionIds.includes(opt.id))
  }, [optionsByGroup, selectedOptionIds])

  const previewImageUrl = useMemo(() => {
    return selectedModel?.image_url || ''
  }, [selectedModel])

  const totalPrice = useMemo(() => {
    const base = selectedModel?.base_price || 0
    const layout = selectedLayout?.price_modifier || 0
    const opts = selectedOptionEntities.reduce((s, o) => s + o.price_modifier, 0)
    return base + layout + opts
  }, [selectedLayout, selectedModel, selectedOptionEntities])

  const fmt = (value: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)

  const toggleOption = (group: OptionGroup, optionId: string) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] || []
      if (group.selection_type === 'single') return { ...prev, [group.id]: [optionId] }
      const exists = current.includes(optionId)
      return { ...prev, [group.id]: exists ? current.filter((id) => id !== optionId) : [...current, optionId] }
    })
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
      const calc = await phpCalculationService.createCalculation({
        model_id: selectedModelId,
        layout_id: selectedLayoutId || '0',
        selected_option_ids: selectedOptionIds,
        total_price: totalPrice,
      })
      setOfferLink(`${window.location.origin}/calc/${calc.public_slug}`)
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

  return (
    <main className="min-h-screen bg-[#f2ece4]">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-[#e0d5c9] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-2 md:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Сиберия" className="h-12 w-auto" style={{ mixBlendMode: 'multiply' }} />
          <div className="h-6 w-px bg-[#e0d5c9]" />
          <div className="text-xs text-[#7a6f66] leading-snug">
            Конфигуратор бани<br />
            <span className="text-[#1a1612] font-semibold">Персональное предложение</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-xs text-[#7a6f66]">{user.email}</span>
            )}
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
              className="rounded-lg border border-[#e0d5c9] px-3 py-1.5 text-xs font-medium text-[#7a6f66] hover:border-[#0d5a52] hover:text-[#0d5a52] transition-all"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-10">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1612] md:text-3xl">
            Калькулятор бани
          </h1>
          <p className="mt-1 text-sm text-[#7a6f66]">
            Выберите модель, планировку и опции — получите ссылку с персональным расчётом
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left column: configurator ── */}
          <div className="space-y-5">

            {/* Model selector */}
            <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
              <div className="border-b border-[#e0d5c9] px-5 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Модель</span>
              </div>
              <div className="p-4">
                {!models.length && loading ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-28" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {models.map((model) => {
                      const active = selectedModelId === model.id
                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => setSelectedModelId(model.id)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all duration-200 ${
                            active
                              ? 'border-[#0d5a52] bg-[#0d5a52] text-white shadow-sm'
                              : 'border-[#e0d5c9] text-[#1a1612] hover:border-[#0d5a52]/50 hover:bg-[#f0f7f5]'
                          }`}
                        >
                          {model.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                {selectedModel?.slogan && (
                  <p className="mt-3 text-xs italic text-[#7a6f66]">{selectedModel.slogan}</p>
                )}
              </div>
            </div>

            {/* Layout selector — hidden when no layouts exist */}
            {(loading || layouts.length > 0) && (
              <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
                <div className="border-b border-[#e0d5c9] px-5 py-3.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">Планировка</span>
                </div>
                <div className="p-4">
                  {loading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {layouts.map((layout) => {
                        const active = selectedLayoutId === layout.id
                        return (
                          <button
                            key={layout.id}
                            type="button"
                            onClick={() => setSelectedLayoutId(layout.id)}
                            className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                              active
                                ? 'border-[#0d5a52] bg-[#f0f7f5] ring-2 ring-[#0d5a52]/25'
                                : 'border-[#e0d5c9] hover:border-[#0d5a52]/40 hover:bg-[#f8f4f0]'
                            }`}
                          >
                            {active && (
                              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d5a52] text-white">
                                <CheckIcon />
                              </span>
                            )}
                            <div className="pr-6 text-sm font-semibold text-[#1a1612]">{layout.name}</div>
                            {layout.description && (
                              <div className="mt-0.5 line-clamp-2 text-xs text-[#7a6f66]">{layout.description}</div>
                            )}
                            <div className={`mt-2 text-xs font-semibold ${active ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>
                              +{fmt(layout.price_modifier)}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Options */}
            {(groups.length > 0 || loading) && (
              <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
                <div className="border-b border-[#e0d5c9] px-5 py-3.5">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">
                    Опции и комплектация
                  </span>
                </div>
                <div className="divide-y divide-[#e0d5c9]">
                  {loading ? (
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-4 w-40" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                      </div>
                    </div>
                  ) : (
                    groups.map((group) => {
                      const options = optionsByGroup[group.id] || []
                      const hasImages = options.some(o => o.image_url)
                      return (
                        <div key={group.id} className="p-5">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#1a1612]">{group.name}</span>
                            <span className="rounded-full bg-[#f2ece4] px-2.5 py-0.5 text-xs text-[#7a6f66]">
                              {group.selection_type === 'single' ? 'один вариант' : 'несколько'}
                            </span>
                          </div>
                          <div className={`grid gap-2 ${hasImages ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                            {options.map((option) => {
                              const active = (selectedOptions[group.id] || []).includes(option.id)
                              if (option.image_url) {
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => toggleOption(group, option.id)}
                                    className={`relative overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                                      active
                                        ? 'border-[#0d5a52] ring-2 ring-[#0d5a52]/25'
                                        : 'border-[#e0d5c9] hover:border-[#0d5a52]/40'
                                    }`}
                                  >
                                    <div className="aspect-[4/3] overflow-hidden bg-[#e8ddd3]">
                                      <CroppedImage
                                        src={option.image_url}
                                        crop={option.image_crop ? (() => { try { return JSON.parse(option.image_crop!) } catch { return null } })() : null}
                                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                      />
                                    </div>
                                    {active && (
                                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d5a52] text-white shadow-sm">
                                        <CheckIcon />
                                      </span>
                                    )}
                                    <div className="px-2.5 pb-2.5 pt-2">
                                      <div className="text-xs font-semibold text-[#1a1612]">{option.name}</div>
                                      <div className={`mt-0.5 text-xs font-semibold ${active ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>
                                        {option.price_modifier > 0 ? '+' : ''}{fmt(option.price_modifier)}
                                      </div>
                                    </div>
                                  </button>
                                )
                              }
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => toggleOption(group, option.id)}
                                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                                    active
                                      ? 'border-[#0d5a52] bg-[#f0f7f5]'
                                      : 'border-[#e0d5c9] hover:border-[#0d5a52]/40 hover:bg-[#f8f4f0]'
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                      active
                                        ? 'border-[#0d5a52] bg-[#0d5a52] text-white'
                                        : 'border-[#c4b8a8]'
                                    }`}
                                  >
                                    {active && <CheckIcon />}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-[#1a1612]">{option.name}</div>
                                    {option.description && (
                                      <div className="mt-0.5 line-clamp-1 text-xs text-[#7a6f66]">
                                        {option.description}
                                      </div>
                                    )}
                                    <div className={`mt-1 text-xs font-semibold ${active ? 'text-[#0d5a52]' : 'text-[#b87524]'}`}>
                                      {option.price_modifier > 0 ? '+' : ''}{fmt(option.price_modifier)}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: summary sidebar ── */}
          <aside className="h-fit space-y-3 lg:sticky lg:top-[72px]">

            {/* Bathhouse visualization — hero photo */}
            <div className="relative overflow-hidden rounded-2xl shadow-card">
              {previewImageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={previewImageUrl}
                    src={previewImageUrl}
                    alt="Ваша баня"
                    className="aspect-square w-full object-cover transition-opacity duration-500"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-16">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Ваша баня</div>
                    {selectedModel && <div className="mt-0.5 text-lg font-bold leading-tight text-white">{selectedModel.name}</div>}
                    {selectedLayout && <div className="mt-0.5 text-sm text-white/65">{selectedLayout.name}</div>}
                  </div>
                </>
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center bg-[#e8ddd3]">
                  <div className="text-7xl opacity-15">🛁</div>
                  <div className="mt-4 text-sm font-semibold text-[#7a6f66]">
                    {selectedModel?.name || 'Выберите модель'}
                  </div>
                  <div className="mt-1 text-xs text-[#b0a499]">Добавьте фото модели в админке</div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e0d5c9] bg-white shadow-card">
              <div className="border-b border-[#e0d5c9] px-5 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#7a6f66]">
                  Ваша конфигурация
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* Total price — pinned at top */}
                <div>
                  <div className="text-xs font-medium uppercase tracking-widest text-[#7a6f66]">
                    Итоговая стоимость
                  </div>
                  <div
                    key={totalPrice}
                    className="mt-1 text-3xl font-extrabold tracking-tight text-[#1a1612] animate-fade-in"
                  >
                    {fmt(totalPrice)}
                  </div>
                </div>

                <div className="border-t border-[#e0d5c9]" />

                {/* Config details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#7a6f66]">Модель</span>
                    <span className="text-right font-semibold text-[#1a1612]">
                      {selectedModel?.name || '—'}
                    </span>
                  </div>
                  {(loading || layouts.length > 0) && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[#7a6f66]">Планировка</span>
                      <span className="text-right font-semibold text-[#1a1612]">
                        {selectedLayout?.name || '—'}
                      </span>
                    </div>
                  )}

                  {selectedOptionEntities.length > 0 && (
                    <div className="border-t border-[#e0d5c9] pt-3">
                      <div className="mb-2 text-xs font-medium text-[#7a6f66]">Выбранные опции</div>
                      <div className="space-y-1.5">
                        {selectedOptionEntities.map((opt) => (
                          <div key={opt.id} className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-[#1a1612]">{opt.name}</span>
                            <span className="shrink-0 text-xs font-semibold text-[#b87524]">
                              {opt.price_modifier > 0 ? '+' : ''}{fmt(opt.price_modifier)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA */}
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
                    'Сформировать предложение'
                  )}
                </button>

                {/* Offer link */}
                {offerLink && (
                  <div className="animate-slide-up space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      Предложение готово
                    </div>
                    <a
                      href={offerLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all text-xs text-[#0d5a52] underline underline-offset-2"
                    >
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

            <p className="px-1 text-center text-xs text-[#7a6f66]">
              Предложение фиксируется по ссылке и не меняется
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
