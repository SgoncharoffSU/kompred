import { getSupabaseClient } from '@/lib/supabase'
import {
  Calculation,
  CalculationView,
  Layout,
  Model,
  Option,
  OptionGroup,
} from '@/types/database'

const db = () => getSupabaseClient()

export const modelService = {
  async getAllModels(): Promise<Model[]> {
    const { data, error } = await db().from('models').select('*').eq('status', 'active')
    if (error) throw error
    return data || []
  },

  async getModelById(id: string): Promise<Model | null> {
    const { data, error } = await db().from('models').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await db().from('models').insert([model]).select()
    if (error) throw error
    return data[0]
  },

  async updateModel(id: string, updates: Partial<Model>) {
    const { data, error } = await db().from('models').update(updates).eq('id', id).select()
    if (error) throw error
    return data[0]
  },

  async deleteModel(id: string) {
    const { error } = await db().from('models').delete().eq('id', id)
    if (error) throw error
  },
}

export const layoutService = {
  async getLayoutsByModel(modelId: string): Promise<Layout[]> {
    const { data, error } = await db().from('layouts').select('*').eq('model_id', modelId)
    if (error) throw error
    return data || []
  },

  async getLayoutById(id: string): Promise<Layout | null> {
    const { data, error } = await db().from('layouts').select('*').eq('id', id).single()
    if (error) return null
    return data
  },

  async createLayout(layout: Omit<Layout, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await db().from('layouts').insert([layout]).select()
    if (error) throw error
    return data[0]
  },

  async updateLayout(id: string, updates: Partial<Layout>) {
    const { data, error } = await db().from('layouts').update(updates).eq('id', id).select()
    if (error) throw error
    return data[0]
  },

  async deleteLayout(id: string) {
    const { error } = await db().from('layouts').delete().eq('id', id)
    if (error) throw error
  },
}

export const optionGroupService = {
  async getOptionGroupsByModel(modelId: string): Promise<OptionGroup[]> {
    const { data, error } = await db()
      .from('option_groups')
      .select('*')
      .eq('model_id', modelId)
      .order('order_index')
    if (error) throw error
    return data || []
  },

  async createOptionGroup(group: Omit<OptionGroup, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await db().from('option_groups').insert([group]).select()
    if (error) throw error
    return data[0]
  },

  async updateOptionGroup(id: string, updates: Partial<OptionGroup>) {
    const { data, error } = await db().from('option_groups').update(updates).eq('id', id).select()
    if (error) throw error
    return data[0]
  },

  async deleteOptionGroup(id: string) {
    const { error } = await db().from('option_groups').delete().eq('id', id)
    if (error) throw error
  },
}

export const optionService = {
  async getOptionsByGroup(groupId: string): Promise<Option[]> {
    const { data, error } = await db().from('options').select('*').eq('group_id', groupId)
    if (error) throw error
    return data || []
  },

  async createOption(option: Omit<Option, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await db().from('options').insert([option]).select()
    if (error) throw error
    return data[0]
  },

  async updateOption(id: string, updates: Partial<Option>) {
    const { data, error } = await db().from('options').update(updates).eq('id', id).select()
    if (error) throw error
    return data[0]
  },

  async deleteOption(id: string) {
    const { error } = await db().from('options').delete().eq('id', id)
    if (error) throw error
  },
}

export const calculationService = {
  async createCalculation(payload: {
    model_id: string
    layout_id: string
    selected_option_ids: string[]
    total_price: number
  }): Promise<Calculation> {
    const { data, error } = await db()
      .from('calculations')
      .insert([
        {
          user_id: null,
          total_price: payload.total_price,
          config_snapshot: {
            model_id: payload.model_id,
            layout_id: payload.layout_id,
            selected_options: payload.selected_option_ids,
          },
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getBySlug(slug: string): Promise<CalculationView | null> {
    const { data: calc, error: calcError } = await db()
      .from('calculations')
      .select('*')
      .eq('public_slug', slug)
      .single()

    if (calcError || !calc) return null

    const snapshot = calc.config_snapshot as {
      model_id: string
      layout_id: string
      selected_options?: string[]
    }

    const optionIds = snapshot.selected_options || []

    const [{ data: model }, { data: layout }] = await Promise.all([
      db().from('models').select('name,slogan').eq('id', snapshot.model_id).single(),
      db().from('layouts').select('name').eq('id', snapshot.layout_id).single(),
    ])

    let selectedOptions: CalculationView['selected_options'] = []
    if (optionIds.length > 0) {
      const { data: optionsData } = await db()
        .from('options')
        .select('id,name,price_modifier,group_id')
        .in('id', optionIds)

      if (optionsData && optionsData.length > 0) {
        const groupIds = [...new Set(optionsData.map((item) => item.group_id))]
        const { data: groupsData } = await db()
          .from('option_groups')
          .select('id,name')
          .in('id', groupIds)

        const groupMap = new Map((groupsData || []).map((group) => [group.id, group.name]))
        selectedOptions = optionsData.map((option) => ({
          id: option.id,
          name: option.name,
          price_modifier: option.price_modifier,
          group_name: groupMap.get(option.group_id) || 'Опция',
        }))
      }
    }

    return {
      id: calc.id,
      public_slug: calc.public_slug,
      total_price: calc.total_price,
      fixed_at: calc.fixed_at,
      model_name: model?.name || 'Модель',
      model_slogan: model?.slogan || null,
      layout_name: layout?.name || 'Планировка',
      selected_options: selectedOptions,
    }
  },
}
