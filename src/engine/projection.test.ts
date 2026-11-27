import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../model/defaults'
import type { Plan } from '../model/types'
import { goalTarget, monteCarlo, solveGoal } from './goal'
import { projectPlan } from './projection'

function isolatedPlan(balance = 100000): Plan {
  const p = createDefaultPlan()
  p.settings.planYear = 2027
  p.properties = []
  p.debts = []
  p.people.forEach((person) => (person.savingsRatePct = 0))
  p.accounts = [{ id: 'b', name: 'Brokerage', type: 'brokerage', ownerId: 'jerry', balance, currency: 'USD' }]
  p.people[0].savingsAllocation = [{ accountId: 'b', pct: 100 }]
  p.people[1].savingsAllocation = [{ accountId: 'b', pct: 100 }]
  p.assumptions.dividendYieldPct = 0
  p.goal = { scope: 'household', target: { mode: 'amount', amount: 1_000_000, dollars: 'future' }, by: { mode: 'date', year: 2037, month: 1 }, includeRealEstateEquity: false }
  return p
}

describe('projectPlan', () => {
  it('compounds a lone balance at the expected return', () => {
    const proj = projectPlan(isolatedPlan(), { years: 10 })
    expect(proj.years[0].year).toBe(2027)
    expect(proj.years[10].year).toBe(2037)
    expect(proj.years[10].investable.household).toBeCloseTo(100000 * 1.08 ** 10, 0)
  })

  it('starts net worth at balances + condo equity without double counting', () => {
    const proj = projectPlan(createDefaultPlan(), { years: 3 })
    expect(proj.years[0].netWorth.household).toBeCloseTo((500000 - 280000) / 1.4, 2)
    expect(proj.years[1].mortgageUsd).toBeLessThan(280000 / 1.4)
  })

  it('pays debts down to zero and keeps them there', () => {
    const p = isolatedPlan()
    p.debts = [{ id: 'd', name: 'Loan', ownerId: 'jerry', balance: 1000, annualRatePct: 0, monthlyPayment: 300, currency: 'CAD' }]
    const proj = projectPlan(p, { years: 3 })
    expect(proj.years[0].debtsUsd.household).toBeCloseTo(1000 / 1.4, 6)
    expect(proj.years[1].debtsUsd.household).toBe(0)
    expect(proj.years[3].debtsUsd.household).toBe(0)
  })

  it('keeps a monthly series long enough for the goal date', () => {
    const proj = projectPlan(isolatedPlan(), { years: 10 })
    expect(proj.monthly.length).toBe(121)
    expect(proj.monthly[120].investable.household).toBeCloseTo(proj.years[10].investable.household, 6)
  })
})

describe('goal solver', () => {
  it('computes the target in nominal and today dollars', () => {
    const p = createDefaultPlan()
    const g = goalTarget(p)
    expect(g.monthsAway).toBe((2055 - p.settings.planYear) * 12)
    expect(g.nominal).toBeCloseTo(2_500_000 * 1.025 ** g.yearsAway, 0)
    expect(g.today).toBe(2_500_000)
  })

  it('finds zero gap when the target equals the projection', () => {
    const p = isolatedPlan()
    p.people[0].savingsRatePct = 20
    const proj = projectPlan(p)
    const projected = proj.monthly[goalTarget(p).monthsAway].investable.household
    p.goal.target = { mode: 'amount', amount: projected, dollars: 'future' }
    const g = solveGoal(p, projectPlan(p))
    expect(g.onTrackPct).toBeCloseTo(1, 6)
    expect(Math.abs(g.gapMonthly)).toBeLessThan(5)
    expect(g.impliedSavingsRatePct).not.toBeNull()
  })

  it('requires more savings when the target rises', () => {
    const p = isolatedPlan()
    p.goal.target = { mode: 'amount', amount: 300_000, dollars: 'future' }
    const g = solveGoal(p, projectPlan(p))
    expect(g.requiredMonthlyContribution).toBeGreaterThan(g.currentMonthlyContribution)
    expect(g.gapMonthly).toBeGreaterThan(0)
    expect(g.coastAmountToday).toBeCloseTo(300_000 / 1.08 ** 10, 0)
    // 100k → 300k in 10 years with no contributions needs (3)^(1/10) − 1 ≈ 11.6%.
    expect(g.requiredReturnPct!).toBeCloseTo((3 ** 0.1 - 1) * 100, 1)
    expect(g.glidePath[g.glidePath.length - 1].required).toBeCloseTo(300_000, 0)
    expect(g.glidePath[0].required).toBeCloseTo(300_000 / 1.08 ** 10, 0)
  })

  it('reports when the current plan reaches the goal', () => {
    const p = isolatedPlan(500000)
    p.goal.target = { mode: 'amount', amount: 600000, dollars: 'future' }
    const g = solveGoal(p, projectPlan(p))
    expect(g.hitYear).toBe(2030)
  })
})

describe('Monte Carlo', () => {
  it('collapses to one path with zero volatility', () => {
    const p = isolatedPlan()
    p.assumptions.returnVolatilityPct = 0
    const mc = monteCarlo(p, projectPlan(p), { paths: 50, seed: 1 })
    const last = mc.fan[mc.fan.length - 1]
    expect(last.p10).toBeCloseTo(last.p90, 6)
    expect([0, 1]).toContain(mc.probability)
  })

  it('is deterministic for a seed', () => {
    const p = isolatedPlan()
    const proj = projectPlan(p)
    expect(monteCarlo(p, proj, { paths: 200, seed: 7 })).toEqual(monteCarlo(p, proj, { paths: 200, seed: 7 }))
  })
})
