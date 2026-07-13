import type { CalculationView, Layout, Model, Option, OptionGroup } from '@/types/database'

// ── Raw PHP types ──────────────────────────────────────────────────────────────

type PhpModel   = { id: number; name: string; image_url: string; base_price: number }
type PhpLayout  = { id: number; model_id: number; name: string; price_modifier: number; sort_order: number }
type PhpGroup   = { id: number; name: string; sort_order: number; selection_type?: string }
type PhpOption  = { id: number; group_id: number; name: string; price: number; image_url: string; image_crop?: string | null; description: string; model_ids: number[]; active_model_ids: number[] }
type PhpBootstrap = { ok: boolean; models: PhpModel[]; options: PhpOption[]; groups: PhpGroup[] }

// ── Adapters (PHP → TypeScript domain types) ──────────────────────────────────

const PHP_STATIC_BASE = 'http://159.194.225.55:8080'

function normalizeImageUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('https://')) return url
  const full = url.startsWith('http://') ? url : `${PHP_STATIC_BASE}${url.startsWith('/') ? '' : '/'}${url}`
  return `/api/img-proxy?url=${encodeURIComponent(full)}`
}

function adaptModel(m: PhpModel): Model {
  return { id: String(m.id), name: m.name, slogan: '', image_url: normalizeImageUrl(m.image_url || ''), base_price: Number(m.base_price), status: 'active', created_at: '', updated_at: '' }
}

function adaptLayout(l: PhpLayout): Layout {
  return { id: String(l.id), model_id: String(l.model_id), name: l.name, price_modifier: Number(l.price_modifier), image_url: '', description: '', created_at: '', updated_at: '' }
}

function adaptGroup(g: PhpGroup, modelId: string): OptionGroup {
  return { id: String(g.id), model_id: modelId, name: g.name, selection_type: g.selection_type === 'single' ? 'single' : 'multiple', order_index: g.sort_order, created_at: '', updated_at: '' }
}

function adaptOption(o: PhpOption): Option {
  return { id: String(o.id), group_id: String(o.group_id), name: o.name, price_modifier: Number(o.price), image_url: normalizeImageUrl(o.image_url || ''), image_crop: o.image_crop || null, description: o.description || '', is_default: false, created_at: '', updated_at: '' }
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────

async function phpGet(action: string, params: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const sp = new URLSearchParams({ action, ...params })
  const res = await fetch(`/api/php-proxy?${sp}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`PHP API error ${res.status}`)
  return res.json()
}

async function phpPost(action: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/php-proxy?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PHP API error ${res.status}`)
  return res.json()
}

// ── Bootstrap cache ────────────────────────────────────────────────────────────

let _bootstrap: PhpBootstrap | null = null

async function getBootstrap(): Promise<PhpBootstrap> {
  if (_bootstrap) return _bootstrap
  const data = await phpGet('bootstrap') as PhpBootstrap
  _bootstrap = data
  return data
}

export function clearBootstrapCache() {
  _bootstrap = null
}

// ── Public services ────────────────────────────────────────────────────────────

export const phpModelService = {
  async getAllModels(): Promise<Model[]> {
    const data = await getBootstrap()
    return (data.models || []).map(adaptModel)
  },
}

export const phpLayoutService = {
  async getLayoutsByModel(modelId: string): Promise<Layout[]> {
    const data = await phpGet('get_layouts', { model_id: modelId }) as { layouts?: PhpLayout[] }
    return (data.layouts || []).map(adaptLayout)
  },

  async createLayout(modelId: string, name: string, priceModifier: number): Promise<void> {
    await phpPost('create_layout', { model_id: Number(modelId), name, price_modifier: priceModifier })
  },

  async updateLayout(id: string, name: string, priceModifier: number): Promise<void> {
    await phpPost('update_layout', { id: Number(id), name, price_modifier: priceModifier })
  },

  async deleteLayout(id: string): Promise<void> {
    await phpPost('delete_layout', { id: Number(id) })
  },
}

export const phpOptionGroupService = {
  async getGroupsByModel(modelId: string): Promise<OptionGroup[]> {
    const data = await getBootstrap()
    const options = (data.options || []).filter(o => (o.active_model_ids || o.model_ids).map(String).includes(modelId))
    const groupIds = [...new Set(options.map(o => o.group_id))]
    const groups = (data.groups || []).filter(g => groupIds.includes(g.id))
    return groups.sort((a, b) => a.sort_order - b.sort_order).map(g => adaptGroup(g, modelId))
  },

  async updateSelectionType(id: string, selectionType: 'single' | 'multiple'): Promise<void> {
    await phpPost('update_group_selection', { id: Number(id), selection_type: selectionType })
    _bootstrap = null
  },
}

export const phpOptionService = {
  async getOptionsByGroup(groupId: string, modelId: string): Promise<Option[]> {
    const data = await getBootstrap()
    return (data.options || [])
      .filter(o => String(o.group_id) === groupId && (o.active_model_ids || o.model_ids).map(String).includes(modelId))
      .map(adaptOption)
  },
}

export const phpCalculationService = {
  async createCalculation(payload: {
    model_id: string
    layout_id: string
    selected_option_ids: string[]
    total_price: number
  }): Promise<{ public_slug: string }> {
    const data = await phpPost('create_calculation', {
      model_id: Number(payload.model_id),
      layout_id: Number(payload.layout_id),
      selected_option_ids: payload.selected_option_ids.map(Number),
      total_price: payload.total_price,
    }) as { ok: boolean; public_slug?: string; error?: string }
    if (!data.ok || !data.public_slug) throw new Error(data.error || 'Failed to create calculation')
    return { public_slug: data.public_slug }
  },

  async getBySlug(slug: string): Promise<CalculationView | null> {
    const data = await phpGet('get_calculation', { slug }) as {
      ok: boolean
      id?: number
      public_slug?: string
      total_price?: number
      fixed_at?: string
      model_name?: string
      layout_name?: string
      selected_options?: Array<{ id: number; name: string; price: number; group_name: string }>
    }
    if (!data.ok) return null
    return {
      id: String(data.id || ''),
      public_slug: data.public_slug || slug,
      total_price: Number(data.total_price || 0),
      fixed_at: data.fixed_at || new Date().toISOString(),
      model_name: data.model_name || 'Модель',
      model_slogan: null,
      layout_name: data.layout_name || 'Планировка',
      selected_options: (data.selected_options || []).map(o => ({
        id: String(o.id),
        name: o.name,
        price_modifier: Number(o.price),
        group_name: o.group_name,
      })),
    }
  },
}
