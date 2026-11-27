import type { SupabaseClient } from '@supabase/supabase-js'
import { migratePlan } from '../model/schema'
import type { Plan } from '../model/types'
import type { PlanRepository } from './repository'

export class SupabasePlanRepository implements PlanRepository {
  lastLoadError: string | null = null
  private readonly supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async load(): Promise<Plan | null> {
    this.lastLoadError = null
    const { data: userData, error: userError } = await this.supabase.auth.getUser()
    if (userError || !userData.user) {
      this.lastLoadError = userError?.message ?? 'Not signed in.'
      return null
    }

    const { data, error } = await this.supabase.from('plans').select('data').eq('user_id', userData.user.id).maybeSingle()
    if (error) {
      this.lastLoadError = error.message
      return null
    }
    if (!data?.data) return null

    try {
      return migratePlan(data.data)
    } catch {
      this.lastLoadError = 'Your saved plan in the cloud couldn’t be read, so Tandem started from the sheet defaults.'
      return null
    }
  }

  async save(plan: Plan): Promise<void> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser()
    if (userError || !userData.user) throw new Error(userError?.message ?? 'Not signed in.')

    const { error } = await this.supabase.from('plans').upsert(
      { user_id: userData.user.id, data: plan, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    if (error) throw new Error(error.message)
  }
}