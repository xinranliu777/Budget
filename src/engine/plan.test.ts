import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../model/defaults'
import type { Plan } from '../model/types'
import { splitWeights, travelAnnual } from './budget'
import { computePlan } from './plan'

function planWith(patch: (p: Plan) => void): Plan {
  const p = createDefaultPlan()
  patch(p)
  return p
}

describe('travel planner', () => {
  it('reproduces the sheet total', () => {
    expect(travelAnnual(createDefaultPlan().shared.travel)).toBe(13400)
  })
})

describe('computePlan budgets (2027 tax year pinned)', () => {
  const r = computePlan(planWith((p) => void (p.settings.planYear = 2027)))
  const jb = r.budgets.jerry

  it('takes savings off the top of take-home', () => {
    expect(jb.takeHome).toBeCloseTo((115000 - 34913.48) / 12, 1)
    expect(jb.savings).toBeCloseTo(0.63 * jb.takeHome, 6)
    expect(jb.allowance).toBeCloseTo(jb.takeHome - jb.savings, 6)
  })

  it('includes personal costs, debt payments and the shared split', () => {
    expect(jb.fixed).toBeCloseTo(3825 + 300 / 1.4 + 150, 6)
    expect(jb.yearlyMonthly).toBeCloseTo((2500 + 6700) / 12, 6)
    expect(jb.discretionary).toBeCloseTo(jb.allowance - jb.fixed - jb.yearlyMonthly, 6)
    expect(jb.discretionary).toBeLessThan(0)
  })

  it('counts shared costs once in the household view', () => {
    const hb = r.budgets.household
    expect(hb.fixed).toBeCloseTo(3825 + 300 / 1.4 + 235 + 300, 6)
    expect(hb.takeHome).toBeCloseTo(jb.takeHome + r.budgets.sophia.takeHome, 6)
    expect(hb.yearlyMonthly).toBeCloseTo((2500 + 13400) / 12, 6)
  })

  it('flags a negative discretionary budget', () => {
    const insight = r.insights.find((i) => i.id === 'negative-discretionary-jerry')
    expect(insight?.severity).toBe('critical')
  })
})

describe('split rules', () => {
  it('weights sum to 1', () => {
    const r = computePlan(planWith((p) => (p.shared.split = { kind: 'income' })))
    const w = splitWeights({ kind: 'income' }, r.people.jerry.takeHomeMonthly, r.people.sophia.takeHomeMonthly)
    expect(w.jerry + w.sophia).toBeCloseTo(1, 10)
    expect(splitWeights({ kind: 'custom', jerryPct: 70 }, 1, 1)).toEqual({ jerry: 0.7, sophia: 0.3 })
  })
})

describe('savings flows', () => {
  it('allocates every saved dollar to an account', () => {
    const r = computePlan(planWith((p) => {
      p.people[0].payroll.k401TraditionalPct = 10
      p.people[0].payroll.matchPct = 50
      p.people[0].payroll.matchUpToPct = 6
    }))
    const s = r.savings.jerry
    const accountTotal = Object.values(s.byAccount).reduce((a, b) => a + b, 0)
    expect(accountTotal).toBeCloseTo(s.totalAnnual, 6)
    // 10% deferral + 50% match on the first 6% of salary.
    expect(s.byAccount['jerry-401k']).toBeCloseTo(10000 + 3000, 6)
    const bucketTotal = Object.values(s.byBucket).reduce((a, b) => a + b, 0)
    expect(bucketTotal).toBeCloseTo(s.totalAnnual, 6)
  })

  it('folds the rental cash flow into the owner savings and reports equity separately', () => {
    const r = computePlan(createDefaultPlan())
    const condo = r.rentals.condo
    expect(condo.cashFlowAnnualUsd).toBeCloseTo(condo.cashFlowBeforeUsTaxUsd - condo.rentalTaxUsd, 6)
    expect(r.savings.jerry.rentalCashFlowAnnual).toBeCloseTo(condo.cashFlowAnnualUsd, 6)
    expect(r.savings.jerry.equityBuildAnnual).toBeCloseTo(condo.principalUsd, 6)
  })

  it('flags a backdoor Roth when income exceeds the Roth limit', () => {
    const r = computePlan(planWith((p) => {
      p.people[0].income.baseSalary = 150000
      p.people[0].ira.annualContribution = 7500
    }))
    expect(r.savings.jerry.iraBackdoor).toBe(true)
    expect(r.savings.jerry.byAccount['jerry-roth-ira']).toBe(7500)
    expect(r.insights.some((i) => i.id === 'backdoor-roth-jerry')).toBe(true)
  })

  it('creates auto accounts for flows without a matching account', () => {
    const r = computePlan(planWith((p) => {
      p.people[1].payroll.hsaCoverage = 'self'
      p.people[1].payroll.hsaAnnual = 3000
    }))
    expect(r.savings.sophia.byAccount['auto:sophia:hsa']).toBe(3000)
    expect(r.autoAccounts.some((a) => a.id === 'auto:sophia:hsa' && a.type === 'hsa')).toBe(true)
  })

  it('warns when NR6 is not elected', () => {
    const r = computePlan(planWith((p) => (p.properties[0].canada.nr6Elected = false)))
    expect(r.insights.some((i) => i.id === 'nr6-condo' && i.severity === 'critical')).toBe(true)
  })
})
