// Database Types
export interface Model {
  id: string
  name: string
  slogan: string
  image_url: string
  base_price: number
  status: 'active' | 'draft'
  created_at: string
  updated_at: string
}

export interface Layout {
  id: string
  model_id: string
  name: string
  price_modifier: number
  image_url: string
  description: string
  created_at: string
  updated_at: string
}

export interface OptionGroup {
  id: string
  model_id: string
  name: string
  selection_type: 'single' | 'multiple'
  order_index: number
  created_at: string
  updated_at: string
}

export interface Option {
  id: string
  group_id: string
  name: string
  price_modifier: number
  image_url: string
  image_crop?: string | null
  description: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Calculation {
  id: string
  user_id: string | null
  config_snapshot: ConfigSnapshot
  total_price: number
  fixed_at: string
  public_slug: string
  created_at: string
  updated_at: string
}

export interface CalculationView {
  id: string
  public_slug: string
  total_price: number
  fixed_at: string
  model_name: string
  model_slogan: string | null
  layout_name: string
  selected_options: Array<{
    id: string
    group_name: string
    name: string
    price_modifier: number
  }>
}

export interface Profile {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

// Configuration Types
export interface ConfigSnapshot {
  model_id: string
  layout_id: string
  selected_options: string[] // array of option IDs
}

export interface ConfiguratorState {
  model_id: string | null
  layout_id: string | null
  selected_options: Record<string, string[]> // group_id -> option_ids
  total_price: number
}
