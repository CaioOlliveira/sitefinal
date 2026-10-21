import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemo = import.meta.env.VITE_DEMO_MODE === '1' || !url || !key
export const supabase = isDemo ? null : createClient(url, key)
