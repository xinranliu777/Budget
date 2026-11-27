import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from './defaults'
import { currentPlanStartYear } from './planStartYear'
import { migratePlan, SCHEMA_VERSION } from './schema'
import { CATEGORIES } from './categories'

describe('default plan (seeded from Finances.numbers)', () => {
  const plan = createDefaultPlan()
  const [jerry, sophia] = plan.people

  it('carries the sheet values', () => {
    expect(plan.settings.fxCadPerUsd).toBe(1.4)
    expect(plan.settings.planYear).toBe(currentPlanStartYear())
    expect(jerry.income.baseSalary).toBe(100000)
    expect(jerry.income.bonusPct).toBe(15)
    expect(jerry.savingsRatePct).toBe(63)
    expect(sophia.savingsRatePct).toBe(63)
    const rent = jerry.expenses.find((e) => e.name === 'Rent')!
    expect(rent).toMatchObject({ amount: 3250, currency: 'USD', frequency: 'monthly' })
    const gifts = jerry.expenses.find((e) => e.frequency === 'yearly')!
    expect(gifts.amount).toBe(2500)
  })

  it('models the student loan as a CAD debt and the condo in CAD', () => {
    expect(plan.debts[0]).toMatchObject({ ownerId: 'jerry', monthlyPayment: 300, currency: 'CAD', balance: null })
    const condo = plan.properties[0]
    expect(condo).toMatchObject({ monthlyRent: 2350, condoFeesMonthly: 580, propertyTaxAnnual: 2804, marketValue: 500000 })
    expect(condo.mortgage).toMatchObject({ balance: 280000, monthlyPayment: 2500, compounding: 'semi-annual' })
  })

  it('keeps the travel planner inputs', () => {
    expect(plan.shared.travel).toEqual({
      trips: 2,
      daysPerTrip: 9,
      travelers: 2,
      flightPerPerson: 600,
      hotelPerNightPerPerson: 125,
      activitiesPerTripPerPerson: 500,
      diningPerDayPerPerson: 125,
    })
  })

  it('uses only known categories', () => {
    const ids = new Set(CATEGORIES.map((c) => c.id))
    const all = [...jerry.expenses, ...sophia.expenses, ...plan.shared.expenses]
    for (const e of all) expect(ids.has(e.category)).toBe(true)
  })
})

describe('migratePlan', () => {
  it('round-trips a valid plan unchanged', () => {
    const plan = createDefaultPlan()
    expect(migratePlan(structuredClone(plan))).toEqual(plan)
  })

  it('returns defaults for garbage', () => {
    expect(migratePlan({})).toEqual(createDefaultPlan())
    expect(migratePlan(null)).toEqual(createDefaultPlan())
    expect(migratePlan('nope')).toEqual(createDefaultPlan())
  })

  it('fills missing nested fields from defaults', () => {
    const plan = structuredClone(createDefaultPlan()) as unknown as Record<string, any>
    delete plan.assumptions.returnVolatilityPct
    delete plan.people[1].payroll
    const migrated = migratePlan(plan)
    expect(migrated.assumptions.returnVolatilityPct).toBe(15)
    expect(migrated.people[1].payroll.k401TraditionalPct).toBe(0)
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
  })
})
