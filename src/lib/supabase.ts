import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Vercel's Supabase integration may set Next-style or publishable-key names; Vite prefers VITE_. */
function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

const url = firstNonEmpty(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_URL,
)

const anonKey = firstNonEmpty(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env.SUPABASE_PUBLISHABLE_KEY,
)

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error('Supabase env vars are not configured.')
  client ??= createClient(url!, anonKey!)
  return client
}