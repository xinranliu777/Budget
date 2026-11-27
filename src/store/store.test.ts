import { beforeEach, describe, expect, it } from 'vitest'
import { assetsAtMonth, goalTarget } from '../engine/goal'
import { projectPlan } from '../engine/projection'
import { createDefaultPlan } from '../model/defaults'
import { flushSave, redo, resetHistory, undo, usePlanStore } from './planStore'
import { LocalStorageRepository, MemoryStorage, STORAGE_KEY } from './repository'
import { selectGoal, selectPlanResult } from './selectors'
import { routeFromHash } from './uiStore'

describe('LocalStorageRepository', () => {
  it('round-trips a plan', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageRepository(storage)
    const plan = createDefaultPlan()
    plan.people[0].income.baseSalary = 123456
    await repo.save(plan)
    expect(storage.getItem(STORAGE_KEY)).toContain('123456')
    expect((await repo.load())?.people[0].income.baseSalary).toBe(123456)
  })

  it('returns null for missing or corrupt data', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageRepository(storage)
    expect(await repo.load()).toBeNull()
    expect(repo.lastLoadError).toBeNull()
    storage.setItem(STORAGE_KEY, '{not json')
    expect(await repo.load()).toBeNull()
    expect(repo.lastLoadError).toContain('couldn’t be read')
    expect(storage.getItem(`${STORAGE_KEY}.unreadable`)).toBe('{not json')
  })

  it('surfaces an unreadable plan on hydrate without losing it', async () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '42')
    await usePlanStore.getState().hydrate(new LocalStorageRepository(storage))
    expect(usePlanStore.getState().notice).toContain('unreadable')
    expect(storage.getItem(`${STORAGE_KEY}.unreadable`)).toBe('42')
    usePlanStore.getState().dismissNotice()
    expect(usePlanStore.getState().notice).toBeNull()
  })
})

describe('usePlanStore', () => {
  beforeEach(() => {
    usePlanStore.getState().reset()
    resetHistory()
  })

  it('updates immutably and undoes', () => {
    const before = usePlanStore.getState().plan
    usePlanStore.getState().update((d) => {
      d.people[0].income.baseSalary = 150000
    })
    const after = usePlanStore.getState().plan
    expect(after).not.toBe(before)
    expect(before.people[0].income.baseSalary).toBe(100000)
    expect(after.people[0].income.baseSalary).toBe(150000)
    expect(after.people[1]).toBe(before.people[1])

    undo()
    expect(usePlanStore.getState().plan.people[0].income.baseSalary).toBe(100000)
    redo()
    expect(usePlanStore.getState().plan.people[0].income.baseSalary).toBe(150000)
  })

  it('collapses rapid edits into one undo step', () => {
    for (const salary of [101000, 102000, 103000]) {
      usePlanStore.getState().update((d) => {
        d.people[0].income.baseSalary = salary
      })
    }
    undo()
    expect(usePlanStore.getState().plan.people[0].income.baseSalary).toBe(100000)
  })

  it('hydrates from the repository and saves changes', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageRepository(storage)
    const stored = createDefaultPlan()
    stored.people[1].income.baseSalary = 222000
    await repo.save(stored)

    await usePlanStore.getState().hydrate(repo)
    expect(usePlanStore.getState().hydrated).toBe(true)
    expect(usePlanStore.getState().plan.people[1].income.baseSalary).toBe(222000)
    expect(usePlanStore.temporal.getState().pastStates.length).toBe(0)

    usePlanStore.getState().update((d) => {
      d.people[1].income.baseSalary = 230000
    })
    await flushSave()
    expect((await repo.load())?.people[1].income.baseSalary).toBe(230000)
  })

  it('clears a placeholder once the user edits that value', () => {
    const has = (k: string) => usePlanStore.getState().plan.placeholders.includes(k)
    expect(has('goal') && has('people.0.birthYear') && has('accounts.balances')).toBe(true)
    usePlanStore.getState().update((d) => {
      d.people[0].income.baseSalary = 120000
    })
    expect(has('goal') && has('people.0.birthYear')).toBe(true)
    usePlanStore.getState().update((d) => {
      d.goal.by = { mode: 'date', year: 2050, month: 1 }
      d.people[0].birthYear = 1994
    })
    expect(has('goal')).toBe(false)
    expect(has('people.0.birthYear')).toBe(false)
    expect(has('people.1.birthYear')).toBe(true)
    usePlanStore.getState().update((d) => {
      d.accounts[0].balance = 5000
    })
    expect(has('accounts.balances')).toBe(false)
  })

  it('replace() migrates imported plans', () => {
    usePlanStore.getState().replace({ nonsense: true })
    expect(usePlanStore.getState().plan.people).toHaveLength(2)
  })
})

describe('selectors', () => {
  it('memoizes on plan identity', () => {
    const plan = createDefaultPlan()
    expect(selectPlanResult(plan)).toBe(selectPlanResult(plan))
    expect(selectGoal(plan)).toBe(selectGoal(plan))
  })

  it('what-if return shift lowers projected assets at the goal date', () => {
    const plan = createDefaultPlan()
    const proj = projectPlan(plan)
    const pessimistic = projectPlan(plan, { returnShiftPct: -3 })
    const month = goalTarget(plan).monthsAway
    expect(assetsAtMonth(plan, pessimistic, month)).toBeLessThan(assetsAtMonth(plan, proj, month))
  })
})

describe('routeFromHash', () => {
  it('parses known pages and falls back to home', () => {
    expect(routeFromHash('#/setup/budget')).toEqual({ page: 'setup', section: 'budget' })
    expect(routeFromHash('#/months')).toEqual({ page: 'months', section: null })
    expect(routeFromHash('#/nope')).toEqual({ page: 'home', section: null })
    expect(routeFromHash('')).toEqual({ page: 'home', section: null })
  })
})
