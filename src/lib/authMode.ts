import { isSupabaseConfigured } from './supabase'

/** Local dev without Supabase can use browser storage; production always requires account sign-in. */
export function useCloudAuth(): boolean {
  return import.meta.env.PROD || isSupabaseConfigured()
}

/** Sign-up is on in production unless VITE_ALLOW_SIGNUP=false. Each account only sees its own plan (RLS). */
export function allowSelfServeSignUp(): boolean {
  return import.meta.env.VITE_ALLOW_SIGNUP !== 'false'
}