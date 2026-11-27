/** First published tax year in the engine. */
export const MIN_PLAN_YEAR = 2026

/** Calendar year the plan timeline starts on (Jan 1). Tax rules for later years are picked automatically in projections. */
export function currentPlanStartYear(): number {
  return Math.max(MIN_PLAN_YEAR, new Date().getFullYear())
}

/** Nudge stored plans forward when a new calendar year starts (does not rewrite past actuals). */
export function alignPlanStartYear(plan: { settings: { planYear: number } }): void {
  const now = currentPlanStartYear()
  if (plan.settings.planYear < now) plan.settings.planYear = now
}