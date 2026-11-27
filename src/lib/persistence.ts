import { isSupabaseConfigured } from './supabase'

export function persistenceSidebarNote(): string {
  if (isSupabaseConfigured()) {
    return 'Saved to your account. Sign in on another device to continue.'
  }
  return 'Saved in this browser. Export a backup from Setup.'
}

export function persistenceDataCardSubtitle(): string {
  if (isSupabaseConfigured()) {
    return 'Saved automatically to your account — use the same login on any device'
  }
  return 'Saved automatically in this browser only — export a backup to move it or keep it safe'
}