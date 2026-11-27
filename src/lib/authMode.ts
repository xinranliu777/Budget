import { isSupabaseConfigured } from './supabase'

/** Local dev without Supabase can use browser storage; production always requires account sign-in. */
export function useCloudAuth(): boolean {
  return import.meta.env.PROD || isSupabaseConfigured()
}

export function allowSelfServeSignUp(): boolean {
  if (!import.meta.env.PROD) return true
  return import.meta.env.VITE_ALLOW_SIGNUP === 'true'
}