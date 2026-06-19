'use client'

import { ChangeEvent, CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Inter, Manrope, Montserrat, Playfair_Display } from 'next/font/google'
import { phpLayoutService, phpModelService, phpOptionGroupService, phpOptionService } from '@/services/php-api'
import type { Layout as DbLayout, Model as DbModel, Option as DbOption, OptionGroup as DbOptionGroup } from '@/types/database'

const inter = Inter({ subsets: ['latin', 'cyrillic'], weight: ['400', '600', '700'] })
const manrope = Manrope({ subsets: ['latin', 'cyrillic'], weight: ['400', '600', '700', '800'] })
const montserrat = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['400', '600', '700', '800'] })
const playfair = Playfair_Display({ subsets: ['latin', 'cyrillic'], weight: ['400', '600', '700'] })

type MenuTab = 'models' | 'options' | 'media' | 'configurator'
type BlockType = 'hero' | 'text' | 'options' | 'steps' | 'form'
type FontPreset = { label: string; className: string; style?: CSSProperties }
type OptionItem = { id: string; name: string; imageUrl: string; price: number; description: string; features: string[] }
type TextLayer = { id: string; text: string; rotation: number; size: number; color: string; fontKey: string }

type BlockBase = { id: string; type: BlockType; title: string; textLayers: TextLayer[]; stickyBlock?: boolean }
type HeroBlock = BlockBase & {
  type: 'hero'
  imageUrl: string
  headline: string
  fontKey: string
  textColor: string
  textContrast: number
  fontSize: number
  textWidth: number
  textX: number
  textY: number
  imageOpacity: number
  imageContrast: number
  imageBrightness: number
  imageSaturation: number
  darkOverlay: number
  imageFit: 'cover' | 'contain'
}
type TextBlock = BlockBase & { type: 'text'; text: string; fontKey: string; color: string }
type OptionsBlock = BlockBase & {
  type: 'options'
  optionIds: string[]
  columns: number
  imageHeight: number
  textSize: number
}
type StepsBlock = BlockBase & { type: 'steps'; stepsCount: number }
type FormBlock = BlockBase & { type: 'form' }

type PageBlock = HeroBlock | TextBlock | OptionsBlock | StepsBlock | FormBlock
type ModelPage = { id: string; menuName: string; blocks: PageBlock[] }
type AdminDraft = { models: ModelPage[]; activeModelId: string | null; selectedBlockId: string | null; options: OptionItem[] }

const fontPresets: Record<string, FontPreset> = {
  inter: { label: 'Inter', className: inter.className },
  manrope: { label: 'Manrope', className: manrope.className },
  montserrat: { label: 'Montserrat', className: montserrat.className },
  playfair: { label: 'Playfair Display', className: playfair.className },
  cedar: { label: 'Cedar Line (авторский)', className: manrope.className, style: { letterSpacing: '0.03em', fontWeight: 800 } },
  steam: { label: 'Steam Form (авторский)', className: montserrat.className, style: { textTransform: 'uppercase', fontWeight: 700 } },
  nord: { label: 'Nord Serif (авторский)', className: playfair.className, style: { fontWeight: 700 } },
}

const blockCatalog: Array<{ type: BlockType; label: string }> = [
  { type: 'hero', label: 'Первый экран (фото + текст)' },
  { type: 'text', label: 'Текстовый блок' },
  { type: 'options', label: 'Опции' },
  { type: 'steps', label: 'Этапы' },
  { type: 'form', label: 'Формы' },
]

const draftKey = 'bathhouse-admin-draft-v2'
const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const longestWord = (text: string) => text.split(/\s+/).filter(Boolean).reduce((a, w) => (w.length > a.length ? w : a), '')
const defaultLayer = (): TextLayer => ({ id: createId('txt'), text: '', rotation: 0, size: 20, color: '#111111', fontKey: 'inter' })

function ensureLayers(block: any): TextLayer[] {
  if (Array.isArray(block?.textLayers) && block.textLayers.length > 0) return block.textLayers
  return [defaultLayer()]
}

function normalizeBlock(block: any): PageBlock {
  if (block?.type === 'hero') {
    return {
      ...createDefaultBlock('hero'),
      ...block,
      textLayers: ensureLayers(block),
    }
  }
  if (block?.type === 'text') {
    return {
      ...createDefaultBlock('text'),
      ...block,
      textLayers: ensureLayers(block),
    }
  }
  if (block?.type === 'options') {
    return {
      ...createDefaultBlock('options'),
      ...block,
      textLayers: ensureLayers(block),
      optionIds: Array.isArray(block?.optionIds) ? block.optionIds : [],
    }
  }
  if (block?.type === 'steps') {
    return {
      ...createDefaultBlock('steps'),
      ...block,
      textLayers: ensureLayers(block),
    }
  }
  return {
    ...createDefaultBlock('form'),
    ...block,
    textLayers: ensureLayers(block),
  }
}

function normalizeModel(model: any): ModelPage {
  return {
    id: typeof model?.id === 'string' ? model.id : createId('m'),
    menuName: typeof model?.menuName === 'string' && model.menuName.trim() ? model.menuName : 'Модель',
    blocks: Array.isArray(model?.blocks) ? model.blocks.map(normalizeBlock) : [],
  }
}

function createDefaultBlock(type: BlockType): PageBlock {
  const baseLayer: TextLayer[] = [{ id: createId('txt'), text: '', rotation: 0, size: 20, color: '#111111', fontKey: 'inter' }]
  if (type === 'hero') {
    return {
      id: createId('b'),
      type,
      title: 'Первый экран',
      textLayers: [{ id: createId('txt'), text: 'Собери сам свою лучшую баню', rotation: 0, size: 46, color: '#ffffff', fontKey: 'manrope' }],
      imageUrl: '',
      headline: 'Собери сам свою лучшую баню',
      fontKey: 'manrope',
      textColor: '#ffffff',
      textContrast: 60,
      fontSize: 48,
      textWidth: 52,
      textX: 50,
      textY: 42,
      imageOpacity: 100,
      imageContrast: 100,
      imageBrightness: 100,
      imageSaturation: 100,
      darkOverlay: 25,
      imageFit: 'cover',
    }
  }
  if (type === 'text') return { id: createId('b'), type, title: 'Текстовый блок', textLayers: [{ id: createId('txt'), text: 'Новый текстовый блок', rotation: 0, size: 26, color: '#111111', fontKey: 'inter' }], text: 'Новый текстовый блок', fontKey: 'inter', color: '#111111' }
  if (type === 'options') return { id: createId('b'), type, title: 'Опции', textLayers: baseLayer, optionIds: [], columns: 3, imageHeight: 180, textSize: 14 }
  if (type === 'steps') return { id: createId('b'), type, title: 'Этапы производства', textLayers: baseLayer, stepsCount: 4 }
  return { id: createId('b'), type, title: 'Форма заявки', textLayers: baseLayer }
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<MenuTab>('models')
  const [modelsOpen, setModelsOpen] = useState(false)
  const [newModelOpen, setNewModelOpen] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [insertMenuAt, setInsertMenuAt] = useState<number | null>(null)
  const [models, setModels] = useState<ModelPage[]>([{ id: createId('m'), menuName: 'S1', blocks: [] }])
  const [activeModelId, setActiveModelId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [options, setOptions] = useState<OptionItem[]>([])
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  const [optionModalOpen, setOptionModalOpen] = useState(false)
  const [optionUploading, setOptionUploading] = useState(false)
  const [optionDraft, setOptionDraft] = useState({ name: '', imageUrl: '', price: 0, description: '', featuresText: '' })

  // ── Configurator (Supabase) state ──────────────────────────────────
  const [cfgModels, setCfgModels] = useState<DbModel[]>([])
  const [cfgSelectedModelId, setCfgSelectedModelId] = useState<string | null>(null)
  const [cfgLayouts, setCfgLayouts] = useState<DbLayout[]>([])
  const [cfgGroups, setCfgGroups] = useState<DbOptionGroup[]>([])
  const [cfgOptions, setCfgOptions] = useState<Record<string, DbOption[]>>({})
  const [cfgLoading, setCfgLoading] = useState(false)
  const [cfgError, setCfgError] = useState('')
  const [cfgExpandedGroups, setCfgExpandedGroups] = useState<Set<string>>(new Set())

  type CfgModelForm = { open: boolean; id?: string; name: string; slogan: string; base_price: number; status: 'active' | 'draft' }
  type CfgLayoutForm = { open: boolean; id?: string; name: string; description: string; price_modifier: number }
  type CfgGroupForm  = { open: boolean; id?: string; name: string; selection_type: 'single' | 'multiple' }
  type CfgOptionForm = { open: boolean; id?: string; groupId: string; name: string; description: string; price_modifier: number; is_default: boolean }

  const [cfgModelForm,  setCfgModelForm]  = useState<CfgModelForm>({ open: false, name: '', slogan: '', base_price: 0, status: 'active' })
  const [cfgLayoutForm, setCfgLayoutForm] = useState<CfgLayoutForm>({ open: false, name: '', description: '', price_modifier: 0 })
  const [cfgGroupForm,  setCfgGroupForm]  = useState<CfgGroupForm>({ open: false, name: '', selection_type: 'single' })
  const [cfgOptionForm, setCfgOptionForm] = useState<CfgOptionForm>({ open: false, groupId: '', name: '', description: '', price_modifier: 0, is_default: false })

  const cfgSelectedModel = useMemo(() => cfgModels.find((m) => m.id === cfgSelectedModelId) || null, [cfgModels, cfgSelectedModelId])
  const activeModel = useMemo(() => models.find((m) => m.id === activeModelId) || null, [models, activeModelId])
  const selectedBlock = useMemo(() => activeModel?.blocks.find((b) => b.id === selectedBlockId) || null, [activeModel, selectedBlockId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as AdminDraft
      if (parsed.models?.length) setModels(parsed.models.map(normalizeModel))
      if (parsed.options?.length) setOptions(parsed.options)
      setActiveModelId(parsed.activeModelId ?? null)
      setSelectedBlockId(parsed.selectedBlockId ?? null)
    } catch {}
  }, [])

  const saveDraft = () => {
    const payload: AdminDraft = { models, activeModelId, selectedBlockId, options }
    localStorage.setItem(draftKey, JSON.stringify(payload))
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 1200)
  }

  // ── Configurator useEffect ─────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'configurator') loadCfgModels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // ── Configurator CRUD ──────────────────────────────────────────────
  const loadCfgModels = async () => {
    setCfgLoading(true); setCfgError('')
    try {
      const data = await phpModelService.getAllModels()
      setCfgModels(data)
    } catch { setCfgError('Не удалось загрузить модели') }
    finally { setCfgLoading(false) }
  }

  const loadCfgModelData = async (modelId: string) => {
    setCfgLoading(true)
    try {
      const [layoutData, groupData] = await Promise.all([
        phpLayoutService.getLayoutsByModel(modelId),
        phpOptionGroupService.getGroupsByModel(modelId),
      ])
      setCfgLayouts(layoutData)
      setCfgGroups(groupData)
      const map: Record<string, DbOption[]> = {}
      await Promise.all(groupData.map(async (g) => { map[g.id] = await phpOptionService.getOptionsByGroup(g.id, modelId) }))
      setCfgOptions(map)
    } catch { setCfgError('Не удалось загрузить данные модели') }
    finally { setCfgLoading(false) }
  }

  const selectCfgModel = (id: string) => { setCfgSelectedModelId(id); loadCfgModelData(id) }

  const saveCfgModel = async () => { setCfgError('Модели управляются в PHP-админке') }
  const deleteCfgModel = async (_id: string) => { setCfgError('Модели управляются в PHP-админке') }

  const saveCfgLayout = async () => {
    if (!cfgSelectedModelId || !cfgLayoutForm.name.trim()) return
    const { id, name, price_modifier } = cfgLayoutForm
    try {
      if (id) {
        await phpLayoutService.updateLayout(id, name, price_modifier)
      } else {
        await phpLayoutService.createLayout(cfgSelectedModelId, name, price_modifier)
      }
      await loadCfgModelData(cfgSelectedModelId)
      setCfgLayoutForm({ open: false, name: '', description: '', price_modifier: 0 })
    } catch { setCfgError('Не удалось сохранить планировку') }
  }

  const deleteCfgLayout = async (id: string) => {
    if (!cfgSelectedModelId || !confirm('Удалить планировку?')) return
    try {
      await phpLayoutService.deleteLayout(id)
      await loadCfgModelData(cfgSelectedModelId)
    } catch { setCfgError('Не удалось удалить планировку') }
  }

  const saveCfgGroup = async () => {
    setCfgGroupForm({ open: false, name: '', selection_type: 'single' })
    setCfgError('Группы опций управляются в PHP-админке')
  }
  const deleteCfgGroup = async (_id: string) => { setCfgError('Группы опций управляются в PHP-админке') }
  const saveCfgOption = async () => {
    setCfgOptionForm({ open: false, groupId: '', name: '', description: '', price_modifier: 0, is_default: false })
    setCfgError('Опции управляются в PHP-админке')
  }
  const deleteCfgOption = async (_id: string) => { setCfgError('Опции управляются в PHP-админке') }

  const toggleCfgGroup = (id: string) => {
    setCfgExpandedGroups((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const openModelsList = () => {
    setActiveTab('models')
    setActiveModelId(null)
    setSelectedBlockId(null)
    setModelsOpen(true)
  }

  const duplicateModel = (modelId: string) => {
    const source = models.find((m) => m.id === modelId)
    if (!source) return
    const cloned: ModelPage = {
      id: createId('m'),
      menuName: `${source.menuName} копия`,
      blocks: source.blocks.map((block) => ({
        ...block,
        id: createId('b'),
        textLayers: block.textLayers.map((layer) => ({ ...layer, id: createId('txt') })),
      })),
    }
    setModels((prev) => [...prev, cloned])
  }

  const addBlock = (type: BlockType, index: number) => {
    if (!activeModelId) return
    const block = createDefaultBlock(type)
    const prepared =
      block.type === 'options'
        ? { ...block, optionIds: options.map((item) => item.id) }
        : block
    setModels((prev) =>
      prev.map((m) => (m.id !== activeModelId ? m : { ...m, blocks: [...m.blocks.slice(0, index), prepared, ...m.blocks.slice(index)] }))
    )
    setInsertMenuAt(null)
    setSelectedBlockId(prepared.id)
  }

  const updateBlock = (id: string, patch: Partial<PageBlock>) => {
    if (!activeModelId) return
    setModels((prev) =>
      prev.map((m) => (m.id !== activeModelId ? m : { ...m, blocks: m.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as PageBlock) : b)) }))
    )
  }

  const uploadOptionImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setOptionUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('upload')
      const json = (await response.json()) as { url: string }
      setOptionDraft((p) => ({ ...p, imageUrl: json.url }))
    } finally {
      setOptionUploading(false)
      event.target.value = ''
    }
  }

  const createOption = () => {
    const name = optionDraft.name.trim()
    if (!name) return
    const item: OptionItem = {
      id: createId('opt'),
      name,
      imageUrl: optionDraft.imageUrl.trim(),
      price: Number(optionDraft.price) || 0,
      description: optionDraft.description.trim(),
      features: optionDraft.featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
    }
    setOptions((prev) => [item, ...prev])
    setOptionDraft({ name: '', imageUrl: '', price: 0, description: '', featuresText: '' })
    setOptionModalOpen(false)
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <TopMenuButton label="Модели" active={activeTab === 'models'} onClick={openModelsList} />
            <TopMenuButton label="Опции" active={activeTab === 'options'} onClick={() => setActiveTab('options')} />
            <TopMenuButton label="Медиа" active={activeTab === 'media'} onClick={() => setActiveTab('media')} />
            <TopMenuButton label="Конфигуратор" active={activeTab === 'configurator'} onClick={() => setActiveTab('configurator')} />
          </div>
          <button type="button" onClick={saveDraft} className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white">
            {saveState === 'saved' ? 'Сохранено' : 'Сохранить'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[340px_1fr]">
        <aside className="rounded border border-neutral-200 bg-white p-4">
          {activeTab === 'models' && (
            <>
              <button type="button" className="mb-3 w-full rounded border border-neutral-300 px-3 py-2 text-left text-sm font-semibold" onClick={() => setModelsOpen((v) => !v)}>
                {activeModel ? `Модель: ${activeModel.menuName}` : 'Выбрать модель'}
              </button>
              {activeModel && (
                <button
                  type="button"
                  onClick={() => duplicateModel(activeModel.id)}
                  className="mb-3 w-full rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Копировать модель
                </button>
              )}
              {modelsOpen && (
                <div className="mb-3 rounded border border-neutral-200">
                  {models.map((m) => (
                    <button key={m.id} type="button" onClick={() => { setActiveModelId(m.id); setModelsOpen(false); setSelectedBlockId(null) }} className="block w-full border-b border-neutral-200 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50">{m.menuName}</button>
                  ))}
                  <button type="button" onClick={() => setNewModelOpen(true)} className="block w-full border-t border-neutral-200 px-3 py-2 text-left text-base font-bold">+</button>
                </div>
              )}
              {selectedBlock ? <BlockSettings block={normalizeBlock(selectedBlock)} options={options} onChange={(p) => updateBlock(selectedBlock.id, p)} /> : <p className="text-sm text-neutral-600">Выберите блок на странице модели, чтобы открыть настройки.</p>}
            </>
          )}

          {activeTab === 'options' && (
            <div className="space-y-3">
              <button type="button" onClick={() => setOptionModalOpen(true)} className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Добавить опцию</button>
              <p className="text-sm text-neutral-600">Опции отсюда можно подключать в блок «Опции» на страницах моделей.</p>
            </div>
          )}

          {activeTab === 'media' && <p className="text-sm text-neutral-600">Раздел «Медиа» подключим следующим шагом.</p>}

          {activeTab === 'configurator' && (
            <div className="space-y-3">
              <p className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-700">
                Модели и опции управляются в <a href="/" target="_blank" className="underline font-semibold">PHP-админке</a>. Здесь только планировки.
              </p>
              <p className="text-xs text-neutral-500">Модели из PHP-админки:</p>
              {cfgLoading && !cfgModels.length && <p className="text-xs text-neutral-400">Загрузка…</p>}
              <div className="space-y-1">
                {cfgModels.map((m) => (
                  <div
                    key={m.id}
                    className={`group flex items-center justify-between rounded border px-2 py-1.5 text-sm cursor-pointer ${cfgSelectedModelId === m.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    onClick={() => selectCfgModel(m.id)}
                  >
                    <span className="min-w-0 truncate font-medium">{m.name}</span>
                    <div className="ml-1 flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCfgModelForm({ open: true, id: m.id, name: m.name, slogan: m.slogan || '', base_price: m.base_price, status: m.status }) }}
                        className="rounded border border-current px-1 py-0.5 text-xs"
                      >ред</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteCfgModel(m.id) }}
                        className="rounded border border-current px-1 py-0.5 text-xs text-red-400"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
              {cfgError && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">{cfgError}</p>}
            </div>
          )}
        </aside>

        <section className="rounded border border-neutral-200 bg-white p-4">
          {activeTab === 'models' && !activeModel && <p className="text-sm text-neutral-600">Выберите модель в левом меню.</p>}
          {activeTab === 'models' && activeModel && (
            <div className="space-y-2">
              {activeModel.blocks.length === 0 && <AddStrip onClick={() => setInsertMenuAt(0)} />}
              {insertMenuAt === 0 && activeModel.blocks.length === 0 && <BlockPicker onPick={(t) => addBlock(t, 0)} onClose={() => setInsertMenuAt(null)} />}
              {activeModel.blocks.map((block, i) => (
                <div key={block.id} className="space-y-2">
                  <AddStrip onClick={() => setInsertMenuAt(i)} />
                  {insertMenuAt === i && <BlockPicker onPick={(t) => addBlock(t, i)} onClose={() => setInsertMenuAt(null)} />}
                  <BlockPreview block={normalizeBlock(block)} options={options} selected={selectedBlockId === block.id} onSelect={() => setSelectedBlockId(block.id)} onChange={(p) => updateBlock(block.id, p)} />
                  {i === activeModel.blocks.length - 1 && (
                    <>
                      <AddStrip onClick={() => setInsertMenuAt(i + 1)} />
                      {insertMenuAt === i + 1 && <BlockPicker onPick={(t) => addBlock(t, i + 1)} onClose={() => setInsertMenuAt(null)} />}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'options' && (
            <div className="space-y-4">
              {options.length === 0 && <div className="rounded border border-dashed border-neutral-300 p-6 text-sm text-neutral-600">Пока нет опций. Нажмите «Добавить опцию».</div>}
              {options.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {options.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded border border-neutral-200 bg-white">
                      <div className="aspect-[4/3] bg-neutral-100">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-neutral-500">Без фото</div>}
                      </div>
                      <div className="space-y-2 p-3">
                        <h3 className="text-sm font-semibold text-neutral-900">{item.name}</h3>
                        <div className="text-sm font-bold text-neutral-900">{new Intl.NumberFormat('ru-RU').format(item.price)} ₽</div>
                        {item.description && <p className="text-xs text-neutral-600">{item.description}</p>}
                        {item.features.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs text-neutral-600">{item.features.map((f, idx) => <li key={`${item.id}-${idx}`}>{f}</li>)}</ul>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'configurator' && (
            <div>
              {!cfgSelectedModelId && (
                <p className="text-sm text-neutral-500">Выберите модель в левой панели.</p>
              )}
              {cfgSelectedModelId && cfgSelectedModel && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-neutral-900">{cfgSelectedModel.name}</h2>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cfgSelectedModel.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                      {cfgSelectedModel.status === 'active' ? 'Активна' : 'Черновик'}
                    </span>
                  </div>

                  {/* Layouts */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-800">Планировки</h3>
                      <button
                        type="button"
                        onClick={() => setCfgLayoutForm({ open: true, name: '', description: '', price_modifier: 0 })}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold hover:bg-neutral-50"
                      >+ Добавить</button>
                    </div>
                    {cfgLoading && <p className="text-xs text-neutral-400">Загрузка…</p>}
                    {!cfgLoading && cfgLayouts.length === 0 && (
                      <p className="text-xs text-neutral-400">Нет планировок. Добавьте первую.</p>
                    )}
                    <div className="space-y-1">
                      {cfgLayouts.map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded border border-neutral-200 px-3 py-2">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">{l.name}</div>
                            {l.description && <div className="text-xs text-neutral-500">{l.description}</div>}
                          </div>
                          <div className="ml-4 flex shrink-0 items-center gap-2">
                            <span className="text-sm font-semibold text-amber-600">+{new Intl.NumberFormat('ru-RU').format(l.price_modifier)} ₽</span>
                            <button type="button" onClick={() => setCfgLayoutForm({ open: true, id: l.id, name: l.name, description: l.description || '', price_modifier: l.price_modifier })} className="rounded border border-neutral-300 px-2 py-0.5 text-xs">ред</button>
                            <button type="button" onClick={() => deleteCfgLayout(l.id)} className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-500">×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Option Groups */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-800">Группы опций</h3>
                      <button
                        type="button"
                        onClick={() => setCfgGroupForm({ open: true, name: '', selection_type: 'single' })}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold hover:bg-neutral-50"
                      >+ Добавить</button>
                    </div>
                    {!cfgLoading && cfgGroups.length === 0 && (
                      <p className="text-xs text-neutral-400">Нет групп опций.</p>
                    )}
                    <div className="space-y-2">
                      {cfgGroups.map((g) => {
                        const expanded = cfgExpandedGroups.has(g.id)
                        const groupOptions = cfgOptions[g.id] || []
                        return (
                          <div key={g.id} className="rounded border border-neutral-200">
                            <div
                              className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-neutral-50"
                              onClick={() => toggleCfgGroup(g.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400">{expanded ? '▾' : '▸'}</span>
                                <span className="text-sm font-medium text-neutral-900">{g.name}</span>
                                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                                  {g.selection_type === 'single' ? 'один' : 'несколько'}
                                </span>
                                <span className="text-xs text-neutral-400">{groupOptions.length} опц.</span>
                              </div>
                              <div className="flex gap-1">
                                <button type="button" onClick={(e) => { e.stopPropagation(); setCfgGroupForm({ open: true, id: g.id, name: g.name, selection_type: g.selection_type }) }} className="rounded border border-neutral-300 px-2 py-0.5 text-xs">ред</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); deleteCfgGroup(g.id) }} className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-500">×</button>
                              </div>
                            </div>

                            {expanded && (
                              <div className="border-t border-neutral-200 px-3 py-2">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-neutral-600">Опции</span>
                                  <button
                                    type="button"
                                    onClick={() => setCfgOptionForm({ open: true, groupId: g.id, name: '', description: '', price_modifier: 0, is_default: false })}
                                    className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50"
                                  >+ Опция</button>
                                </div>
                                {groupOptions.length === 0 && <p className="text-xs text-neutral-400">Нет опций в этой группе.</p>}
                                <div className="space-y-1">
                                  {groupOptions.map((o) => (
                                    <div key={o.id} className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1.5">
                                      <div className="min-w-0">
                                        <span className="text-sm text-neutral-900">{o.name}</span>
                                        {o.is_default && <span className="ml-1 text-xs text-emerald-600">по умолч.</span>}
                                        {o.description && <p className="max-w-xs truncate text-xs text-neutral-500">{o.description}</p>}
                                      </div>
                                      <div className="ml-2 flex shrink-0 items-center gap-2">
                                        <span className="text-xs font-semibold text-amber-600">{o.price_modifier > 0 ? '+' : ''}{new Intl.NumberFormat('ru-RU').format(o.price_modifier)} ₽</span>
                                        <button type="button" onClick={() => setCfgOptionForm({ open: true, id: o.id, groupId: o.group_id, name: o.name, description: o.description || '', price_modifier: o.price_modifier, is_default: o.is_default })} className="rounded border border-neutral-300 px-2 py-0.5 text-xs">ред</button>
                                        <button type="button" onClick={() => deleteCfgOption(o.id)} className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-500">×</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {newModelOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">Создать модель</h2>
            <p className="mt-1 text-sm text-neutral-600">Введите краткое название модели для меню.</p>
            <input type="text" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="Например: S3" className="mt-4 w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setNewModelOpen(false)} className="rounded border border-neutral-300 px-3 py-2 text-sm">Отмена</button>
              <button type="button" onClick={() => {
                const name = newModelName.trim()
                if (!name) return
                const item: ModelPage = { id: createId('m'), menuName: name, blocks: [] }
                setModels((p) => [...p, item]); setNewModelName(''); setNewModelOpen(false); setModelsOpen(false); setActiveModelId(item.id); setSelectedBlockId(null)
              }} className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Создать</button>
            </div>
          </div>
        </div>
      )}

      {optionModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">Добавить опцию</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Название опции"><input type="text" value={optionDraft.name} onChange={(e) => setOptionDraft((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Цена, ₽"><input type="number" min={0} value={optionDraft.price} onChange={(e) => setOptionDraft((p) => ({ ...p, price: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="URL фото"><input type="text" value={optionDraft.imageUrl} onChange={(e) => setOptionDraft((p) => ({ ...p, imageUrl: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Загрузка фото с компьютера"><input type="file" accept="image/*" onChange={uploadOptionImage} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /><div className="mt-1 text-xs text-neutral-500">{optionUploading ? 'Загрузка...' : 'Фото будет доступно в карточке опции.'}</div></Field>
              <Field label="Описание"><textarea rows={3} value={optionDraft.description} onChange={(e) => setOptionDraft((p) => ({ ...p, description: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Характеристики (каждая с новой строки)"><textarea rows={4} value={optionDraft.featuresText} onChange={(e) => setOptionDraft((p) => ({ ...p, featuresText: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOptionModalOpen(false)} className="rounded border border-neutral-300 px-3 py-2 text-sm">Отмена</button>
              <button type="button" onClick={createOption} className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Configurator modals ────────────────────────────────────── */}

      {cfgModelForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">{cfgModelForm.id ? 'Редактировать модель' : 'Создать модель'}</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Название"><input type="text" value={cfgModelForm.name} onChange={(e) => setCfgModelForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Слоган"><input type="text" value={cfgModelForm.slogan} onChange={(e) => setCfgModelForm((p) => ({ ...p, slogan: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Базовая цена, ₽"><input type="number" min={0} value={cfgModelForm.base_price} onChange={(e) => setCfgModelForm((p) => ({ ...p, base_price: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Статус">
                <select value={cfgModelForm.status} onChange={(e) => setCfgModelForm((p) => ({ ...p, status: e.target.value as 'active' | 'draft' }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm">
                  <option value="active">Активна</option>
                  <option value="draft">Черновик</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCfgModelForm({ open: false, name: '', slogan: '', base_price: 0, status: 'active' })} className="rounded border border-neutral-300 px-3 py-2 text-sm">Отмена</button>
              <button type="button" onClick={saveCfgModel} className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {cfgLayoutForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">{cfgLayoutForm.id ? 'Редактировать планировку' : 'Добавить планировку'}</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Название"><input type="text" value={cfgLayoutForm.name} onChange={(e) => setCfgLayoutForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Описание"><input type="text" value={cfgLayoutForm.description} onChange={(e) => setCfgLayoutForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Надбавка к цене, ₽"><input type="number" value={cfgLayoutForm.price_modifier} onChange={(e) => setCfgLayoutForm((p) => ({ ...p, price_modifier: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCfgLayoutForm({ open: false, name: '', description: '', price_modifier: 0 })} className="rounded border border-neutral-300 px-3 py-2 text-sm">Отмена</button>
              <button type="button" onClick={saveCfgLayout} className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {cfgGroupForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">{cfgGroupForm.id ? 'Редактировать группу' : 'Добавить группу опций'}</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Название группы"><input type="text" value={cfgGroupForm.name} onChange={(e) => setCfgGroupForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Тип выбора">
                <select value={cfgGroupForm.selection_type} onChange={(e) => setCfgGroupForm((p) => ({ ...p, selection_type: e.target.value as 'single' | 'multiple' }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm">
                  <option value="single">Один вариант</option>
                  <option value="multiple">Несколько вариантов</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCfgGroupForm({ open: false, name: '', selection_type: 'single' })} className="rounded border border-neutral-300 px-3 py-2 text-sm">Отмена</button>
              <button type="button" onClick={saveCfgGroup} className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {cfgOptionForm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-neutral-900">{cfgOptionForm.id ? 'Редактировать опцию' : 'Добавить опцию'}</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Название опции"><input type="text" value={cfgOptionForm.name} onChange={(e) => setCfgOptionForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Описание"><input type="text" value={cfgOptionForm.description} onChange={(e) => setCfgOptionForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="Надбавка к цене, ₽"><input type="number" value={cfgOptionForm.price_modifier} onChange={(e) => setCfgOptionForm((p) => ({ ...p, price_modifier: Number(e.target.value) || 0 }))} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
              <Field label="По умолчанию">
                <label className="flex items-center gap-2 rounded border border-neutral-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={cfgOptionForm.is_default} onChange={(e) => setCfgOptionForm((p) => ({ ...p, is_default: e.target.checked }))} />
                  <span>Включена по умолчанию</span>
                </label>
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCfgOptionForm({ open: false, groupId: '', name: '', description: '', price_modifier: 0, is_default: false })} className="rounded border border-neutral-300 px-3 py-2 text-sm">Отмена</button>
              <button type="button" onClick={saveCfgOption} className="rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function TopMenuButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded px-3 py-1.5 text-sm font-semibold ${active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-800'}`}>{label}</button>
}

function AddStrip({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex h-10 w-full items-center justify-center rounded border border-dashed border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Добавить блок</button>
}

function BlockPicker({ onPick, onClose }: { onPick: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {blockCatalog.map((item) => (
          <button key={item.type} type="button" onClick={() => onPick(item.type)} className="rounded border border-neutral-300 bg-white px-3 py-2 text-left text-sm hover:bg-neutral-100">{item.label}</button>
        ))}
      </div>
      <button type="button" onClick={onClose} className="mt-2 text-xs text-neutral-500 underline">Закрыть</button>
    </div>
  )
}

function BlockPreview({
  block,
  options,
  selected,
  onSelect,
  onChange,
}: {
  block: PageBlock
  options: OptionItem[]
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<PageBlock>) => void
}) {
  const outline = selected ? 'border-neutral-900' : 'border-neutral-200'

  if (block.type === 'hero') return <HeroPreview block={block} outline={outline} selected={selected} onSelect={onSelect} onChange={onChange} />

  if (block.type === 'text') {
    const font = fontPresets[block.fontKey] || fontPresets.inter
    return <button type="button" onClick={onSelect} className={`block w-full rounded border ${outline} p-4 text-left`}><div className="mb-2 text-xs font-semibold text-neutral-500">{block.title}</div><div className={`${font.className} text-xl`} style={{ color: block.color, ...font.style }}>{block.text}</div><TextLayersView layers={block.textLayers} /></button>
  }

  if (block.type === 'options') {
    const selectedOptions = options.filter((item) => block.optionIds.includes(item.id))
    const cols = clamp(block.columns, 1, 4)
    const gridClass = cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4'
    return (
      <button type="button" onClick={onSelect} className={`block w-full rounded border ${outline} p-4 text-left`}>
        <div className="mb-2 text-xs font-semibold text-neutral-500">{block.title}</div>
        {selectedOptions.length === 0 && <div className="rounded border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">Подключите опции в настройках блока.</div>}
        {selectedOptions.length > 0 && (
          <div className={`grid gap-2 ${gridClass}`}>
            {selectedOptions.map((item) => (
              <div key={item.id} className="overflow-hidden rounded border border-neutral-200 bg-white">
                <div className="bg-neutral-100" style={{ height: `${block.imageHeight}px` }}>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-neutral-500">Без фото</div>}
                </div>
                <div className="p-2">
                  <div style={{ fontSize: `${block.textSize}px` }} className="font-semibold text-neutral-900">{item.name}</div>
                  <div style={{ fontSize: `${Math.max(11, block.textSize - 1)}px` }} className="text-neutral-600">{new Intl.NumberFormat('ru-RU').format(item.price)} ₽</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <TextLayersView layers={block.textLayers} />
      </button>
    )
  }

  if (block.type === 'steps') return <button type="button" onClick={onSelect} className={`block w-full rounded border ${outline} p-4 text-left`}><div className="mb-2 text-xs font-semibold text-neutral-500">{block.title}</div><div className="space-y-2">{Array.from({ length: block.stepsCount }).map((_, i) => <div key={i} className="rounded border border-neutral-200 px-3 py-2 text-xs text-neutral-600">Этап {i + 1}</div>)}</div><TextLayersView layers={block.textLayers} /></button>
  return <button type="button" onClick={onSelect} className={`block w-full rounded border ${outline} p-4 text-left`}><div className="mb-2 text-xs font-semibold text-neutral-500">{block.title}</div><div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">Форма: имя, телефон, комментарий</div><TextLayersView layers={block.textLayers} /></button>
}

function HeroPreview({
  block,
  outline,
  selected,
  onSelect,
  onChange,
}: {
  block: HeroBlock
  outline: string
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<PageBlock>) => void
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const font = fontPresets[block.fontKey] || fontPresets.inter
  const shadowPower = clamp(block.textContrast / 100, 0, 1)
  const textShadow = `0 2px 6px rgba(0,0,0,${shadowPower}), 0 16px 32px rgba(0,0,0,${shadowPower})`
  const minWidthPercent = useMemo(() => {
    if (!frameRef.current) return 20
    const word = longestWord(block.headline)
    if (!word) return 20
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return 20
    ctx.font = `${block.fontSize}px ${window.getComputedStyle(frameRef.current).fontFamily}`
    return clamp((ctx.measureText(word).width + 12) / frameRef.current.clientWidth * 100, 8, 95)
  }, [block.headline, block.fontSize])
  const safeWidth = clamp(block.textWidth, minWidthPercent, 95)

  return (
    <div className={`w-full rounded border ${outline} p-4`} onClick={onSelect}>
      <div className="mb-2 text-xs font-semibold text-neutral-500">{block.title}</div>
      <div
        ref={frameRef}
        className="relative overflow-hidden rounded bg-neutral-200"
        style={{ aspectRatio: '16 / 8' }}
        onPointerMove={(e) => {
          if (!frameRef.current) return
          const rect = frameRef.current.getBoundingClientRect()
          if (dragging) {
            const textWidth = (rect.width * safeWidth) / 100
            const nextX = clamp(e.clientX - rect.left - offsetX, textWidth / 2, rect.width - textWidth / 2)
            const nextY = clamp(e.clientY - rect.top - offsetY, block.fontSize / 2, rect.height - block.fontSize / 2)
            onChange({ textX: Number(((nextX / rect.width) * 100).toFixed(2)), textY: Number(((nextY / rect.height) * 100).toFixed(2)) })
          }
          if (resizing) {
            const nextWidth = clamp(((e.clientX - rect.left) / rect.width) * 100 - block.textX + safeWidth / 2, minWidthPercent, 95)
            onChange({ textWidth: Number(nextWidth.toFixed(2)) })
          }
        }}
        onPointerUp={() => { setDragging(false); setResizing(false) }}
        onPointerLeave={() => { setDragging(false); setResizing(false) }}
      >
        {block.imageUrl ? <img src={block.imageUrl} alt="Фото бани" className="h-full w-full" style={{ objectFit: block.imageFit, opacity: block.imageOpacity / 100, filter: `brightness(${block.imageBrightness}%) contrast(${block.imageContrast}%) saturate(${block.imageSaturation}%)` }} /> : <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">Добавьте URL фото</div>}
        <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${block.darkOverlay / 100})` }} />
        <div className={`absolute cursor-move select-none ${font.className}`} style={{ left: `${block.textX}%`, top: `${block.textY}%`, width: `${safeWidth}%`, transform: 'translate(-50%, -50%)', color: block.textColor, fontSize: `${block.fontSize}px`, textShadow, lineHeight: 1.08, whiteSpace: 'pre-wrap', overflowWrap: 'normal', ...font.style }} onPointerDown={(e) => { e.stopPropagation(); onSelect(); if (!frameRef.current) return; const r = frameRef.current.getBoundingClientRect(); setOffsetX(e.clientX - r.left - (r.width * block.textX) / 100); setOffsetY(e.clientY - r.top - (r.height * block.textY) / 100); setDragging(true) }}>
          {block.headline}
          <button type="button" className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-neutral-200 bg-white text-xs font-bold text-neutral-700" title="Потяните для изменения ширины" onPointerDown={(e) => { e.stopPropagation(); onSelect(); setResizing(true) }}>↔</button>
        </div>
      </div>
      {selected && <div className="mt-2 text-xs text-neutral-500">Текст можно двигать и менять его ширину мышкой.</div>}
      <TextLayersView layers={block.textLayers} />
    </div>
  )
}

function BlockSettings({
  block,
  options,
  onChange,
}: {
  block: PageBlock
  options: OptionItem[]
  onChange: (patch: Partial<PageBlock>) => void
}) {
  const [uploading, setUploading] = useState(false)
  const addTextLayer = () => {
    if (block.textLayers.length >= 3) return
    onChange({
      textLayers: [
        ...block.textLayers,
        { id: createId('txt'), text: 'Новый текст', rotation: 0, size: 18, color: '#111111', fontKey: 'inter' },
      ],
    })
  }
  const updateTextLayer = (id: string, patch: Partial<TextLayer>) => {
    onChange({ textLayers: block.textLayers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)) })
  }
  const removeTextLayer = (id: string) => {
    if (block.textLayers.length <= 1) return
    onChange({ textLayers: block.textLayers.filter((layer) => layer.id !== id) })
  }
  const textLayersEditor = (
    <div className="space-y-2 rounded border border-neutral-200 p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-neutral-700">Дополнительные тексты (до 3)</div>
        <button type="button" onClick={addTextLayer} className="rounded border border-neutral-300 px-2 py-1 text-xs">+ Текст</button>
      </div>
      {block.textLayers.map((layer, idx) => (
        <div key={layer.id} className="space-y-2 rounded border border-neutral-200 p-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-600">
            <span>Текст {idx + 1}</span>
            <button type="button" onClick={() => removeTextLayer(layer.id)} className="rounded border border-neutral-300 px-2 py-0.5 text-[11px]">Удалить</button>
          </div>
          <textarea rows={2} value={layer.text} onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" />
          <Field label="Шрифт"><select value={layer.fontKey} onChange={(e) => updateTextLayer(layer.id, { fontKey: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm">{Object.entries(fontPresets).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></Field>
          <Field label="Цвет"><input type="color" value={layer.color} onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })} /></Field>
          <SliderField label="Размер" value={layer.size} min={12} max={64} onChange={(v) => updateTextLayer(layer.id, { size: v })} />
          <SliderField label="Поворот (°)" value={layer.rotation} min={-180} max={180} onChange={(v) => updateTextLayer(layer.id, { rotation: v })} />
        </div>
      ))}
    </div>
  )

  const uploadHeroImage = async (event: ChangeEvent<HTMLInputElement>) => {
    if (block.type !== 'hero') return
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('upload')
      const json = (await response.json()) as { url: string }
      onChange({ imageUrl: json.url })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  if (block.type === 'hero') {
  return (
    <div className="space-y-3">
      <Field label="Фиксация блока">
        <label className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm">
          <input type="checkbox" checked={!!block.stickyBlock} onChange={(e) => onChange({ stickyBlock: e.target.checked })} />
          <span>Фиксировать при прокрутке</span>
        </label>
      </Field>
      <h3 className="text-sm font-semibold text-neutral-900">Настройки «Первого экрана»</h3>
      <Field label="Название блока"><input type="text" value={block.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
      <Field label="Текст поверх фото"><textarea value={block.headline} onChange={(e) => onChange({ headline: e.target.value })} rows={3} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="URL фото"><input type="text" value={block.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Загрузка фото с компьютера"><input type="file" accept="image/*" onChange={uploadHeroImage} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /><div className="mt-1 text-xs text-neutral-500">{uploading ? 'Загрузка...' : 'Файл сохранится на сервере.'}</div></Field>
        <Field label="Шрифт текста"><select value={block.fontKey} onChange={(e) => onChange({ fontKey: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm">{Object.entries(fontPresets).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></Field>
        <Field label="Цвет текста"><input type="color" value={block.textColor} onChange={(e) => onChange({ textColor: e.target.value })} /></Field>
        <SliderField label="Размер текста" value={block.fontSize} min={22} max={96} onChange={(v) => onChange({ fontSize: v })} />
        <SliderField label="Ширина текста" value={block.textWidth} min={8} max={95} onChange={(v) => onChange({ textWidth: v })} />
        <SliderField label="Контраст текста" value={block.textContrast} min={0} max={100} onChange={(v) => onChange({ textContrast: v })} />
        <SliderField label="Прозрачность фото" value={block.imageOpacity} min={0} max={100} onChange={(v) => onChange({ imageOpacity: v })} />
        <SliderField label="Контраст фото" value={block.imageContrast} min={50} max={170} onChange={(v) => onChange({ imageContrast: v })} />
        <SliderField label="Яркость фото" value={block.imageBrightness} min={40} max={150} onChange={(v) => onChange({ imageBrightness: v })} />
        <SliderField label="Насыщенность фото" value={block.imageSaturation} min={0} max={180} onChange={(v) => onChange({ imageSaturation: v })} />
        <SliderField label="Затемнение слоя" value={block.darkOverlay} min={0} max={90} onChange={(v) => onChange({ darkOverlay: v })} />
        {textLayersEditor}
      </div>
    )
  }

  if (block.type === 'options') {
    const toggleOption = (id: string) => {
      const exists = block.optionIds.includes(id)
      onChange({ optionIds: exists ? block.optionIds.filter((x) => x !== id) : [...block.optionIds, id] })
    }
    return (
      <div className="space-y-3">
        <Field label="Фиксация блока">
          <label className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={!!block.stickyBlock} onChange={(e) => onChange({ stickyBlock: e.target.checked })} />
            <span>Фиксировать при прокрутке</span>
          </label>
        </Field>
        <h3 className="text-sm font-semibold text-neutral-900">Настройки блока «Опции»</h3>
        <Field label="Название блока"><input type="text" value={block.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
        <SliderField label="Опций в ряд" value={block.columns} min={1} max={4} onChange={(v) => onChange({ columns: v })} />
        <SliderField label="Высота изображения" value={block.imageHeight} min={100} max={300} onChange={(v) => onChange({ imageHeight: v })} />
        <SliderField label="Размер текста" value={block.textSize} min={12} max={24} onChange={(v) => onChange({ textSize: v })} />
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neutral-600">Подключенные опции</div>
          {options.length === 0 && <div className="text-xs text-neutral-500">На странице «Опции» пока нет данных.</div>}
          {options.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-auto rounded border border-neutral-200 p-2">
              {options.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={block.optionIds.includes(item.id)} onChange={() => toggleOption(item.id)} />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {textLayersEditor}
      </div>
    )
  }

  if (block.type === 'text') {
    return (
      <div className="space-y-3">
        <Field label="Фиксация блока">
          <label className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm">
            <input type="checkbox" checked={!!block.stickyBlock} onChange={(e) => onChange({ stickyBlock: e.target.checked })} />
            <span>Фиксировать при прокрутке</span>
          </label>
        </Field>
        <h3 className="text-sm font-semibold text-neutral-900">Настройки текстового блока</h3>
        <Field label="Заголовок блока"><input type="text" value={block.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
        <Field label="Текст"><textarea value={block.text} onChange={(e) => onChange({ text: e.target.value })} rows={4} className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" /></Field>
        {textLayersEditor}
      </div>
    )
  }

  return <div className="space-y-3"><Field label="Фиксация блока"><label className="flex items-center gap-2 rounded border border-neutral-300 px-3 py-2 text-sm"><input type="checkbox" checked={!!block.stickyBlock} onChange={(e) => onChange({ stickyBlock: e.target.checked })} /><span>Фиксировать при прокрутке</span></label></Field><div className="text-sm text-neutral-600">Настройки этого блока.</div>{textLayersEditor}</div>
}

function TextLayersView({ layers }: { layers: TextLayer[] }) {
  const visible = layers.filter((layer) => layer.text.trim().length > 0)
  if (visible.length === 0) return null
  return (
    <div className="mt-3 space-y-2">
      {visible.map((layer) => {
        const font = fontPresets[layer.fontKey] || fontPresets.inter
        return (
          <div
            key={layer.id}
            className={font.className}
            style={{
              color: layer.color,
              fontSize: `${layer.size}px`,
              transform: `rotate(${layer.rotation}deg)`,
              transformOrigin: 'left center',
              ...font.style,
            }}
          >
            {layer.text}
          </div>
        )
      })}
    </div>
  )
}

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-600"><span>{label}</span><span>{value}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </label>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-semibold text-neutral-600">{label}</span>{children}</label>
}
