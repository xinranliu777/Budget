import { createDefaultPlan } from './defaults'
import { alignPlanStartYear } from './planStartYear'
import type { Plan } from './types'

export const SCHEMA_VERSION = 2 as const

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** Fill keys missing from `value` using `fallback`, recursing into plain objects. Arrays are kept as-is. */
function fillMissing<T>(value: unknown, fallback: T): T {
  if (Array.isArray(fallback)) return (Array.isArray(value) ? value : fallback) as T
  if (isRecord(fallback)) {
    if (!isRecord(value)) return fallback
    const out: Record<string, unknown> = { ...value }
    for (const [key, fb] of Object.entries(fallback)) {
      out[key] = key in value ? fillMissing(value[key], fb) : fb
    }
    return out as T
  }
  if (fallback === null) return (value === undefined ? fallback : value) as T
  return (typeof value === typeof fallback ? value : fallback) as T
}

/** Validate and upgrade an unknown blob (localStorage, imported JSON) into a Plan. */
export function migratePlan(raw: unknown): Plan {
  const defaults = createDefaultPlan()
  if (!isRecord(raw) || !isRecord(raw.settings) || !Array.isArray(raw.people)) return defaults

  const plan = fillMissing(raw, defaults)
  const rawPeople = raw.people as unknown[]
  plan.people = [
    fillMissing(rawPeople[0], defaults.people[0]),
    fillMissing(rawPeople[1], defaults.people[1]),
  ]
  plan.properties = plan.properties.map((p, i) => fillMissing(p, defaults.properties[Math.min(i, 0)]))
  plan.debts = plan.debts.map((d) => ({ ...d, balance: typeof d.balance === 'number' ? d.balance : null }))
  const months: Plan['actuals']['months'] = {}
  for (const [k, m] of Object.entries(isRecord(plan.actuals.months) ? plan.actuals.months : {})) {
    if (!/^\d{4}-\d{2}$/.test(k) || !isRecord(m)) continue
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    months[k] = { jerry: num(m.jerry), sophia: num(m.sophia), shared: num(m.shared) }
  }
  const bankLinks: Plan['actuals']['bankLinks'] = {}
  for (const [id, link] of Object.entries(isRecord(plan.actuals.bankLinks) ? plan.actuals.bankLinks : {})) {
    if (!isRecord(link)) continue
    bankLinks[id] = { accountId: typeof link.accountId === 'string' && link.accountId ? link.accountId : null }
  }
  const bankSyncToken =
    typeof (plan.actuals as { bankSyncToken?: unknown }).bankSyncToken === 'string'
      ? ((plan.actuals as { bankSyncToken: string }).bankSyncToken.trim() || undefined)
      : undefined
  plan.actuals = {
    months,
    snapshots: plan.actuals.snapshots.filter((s) => isRecord(s) && typeof s.date === 'string' && isRecord(s.balances)),
    baseline: isRecord(plan.actuals.baseline) && isRecord(plan.actuals.baseline.invested) ? plan.actuals.baseline : null,
    bankLinks,
    bankSyncToken,
  }
  plan.schemaVersion = SCHEMA_VERSION
  alignPlanStartYear(plan)
  return plan
}
