/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly NEXT_PUBLIC_SUPABASE_URL?: string
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
  /** Injected at build from unprefixed Vercel integration vars (see vite.config.ts). */
  readonly SUPABASE_URL?: string
  readonly SUPABASE_PUBLISHABLE_KEY?: string
  /** Set to `true` on Vercel to show public sign-up on the login screen (off in production by default). */
  readonly VITE_ALLOW_SIGNUP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}