import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const isValidUrl = (() => {
  try {
    const url = new URL(supabaseUrl)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
})()

export const supabase =
  isValidUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase не настроен. Проверьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local'
    )
  }
  return supabase
}
