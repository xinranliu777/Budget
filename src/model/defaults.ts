import type { Account, Expense, Person, PersonId, Plan } from './types'
import { currentPlanStartYear } from './planStartYear'

function expense(
  id: string,
  name: string,
  category: Expense['category'],
  amount: number,
  frequency: Expense['frequency'] = 'monthly',
  currency: Expense['currency'] = 'USD',
): Expense {
  return { id, name, category, amount, currency, frequency }
}

function person(id: PersonId, name: string, expenses: Expense[]): Person {
  return {
    id,
    name,
    birthYear: 1996,
    income: {
      baseSalary: 100000,
      bonusPct: 15,
      bonusToSavings: false,
      rsuAnnualVest: 0,
      esppContribPct: 0,
      esppDiscountPct: 15,
      otherTaxableIncome: 0,
    },
    payroll: {
      k401TraditionalPct: 0,
      k401RothPct: 0,
      k401AfterTaxPct: 0,
      matchPct: 0,
      matchUpToPct: 0,
      hsaAnnual: 0,
      hsaEmployerAnnual: 0,
      hsaCoverage: 'none',
      preTaxPremiumsMonthly: 0,
    },
    ira: { annualContribution: 0, kind: 'roth' },
    savingsRatePct: 63,
    savingsAllocation: [{ accountId: `${id}-brokerage`, pct: 100 }],
    expenses,
  }
}

function accountsFor(id: PersonId, name: string): Account[] {
  return [
    { id: `${id}-401k`, name: `${name} · 401(k)`, type: 'k401_traditional', ownerId: id, balance: 0, currency: 'USD' },
    { id: `${id}-roth-ira`, name: `${name} · Roth IRA`, type: 'ira_roth', ownerId: id, balance: 0, currency: 'USD' },
    { id: `${id}-brokerage`, name: `${name} · Brokerage`, type: 'brokerage', ownerId: id, balance: 0, currency: 'USD' },
  ]
}

/** Values mirror the "2027 Couples Budget USD" sheet in Finances.numbers. */
export function createDefaultPlan(): Plan {
  const jerry = person('jerry', 'Jerry', [
    expense('j-rent', 'Rent', 'housing', 3250),
    expense('j-internet', 'Internet', 'phone', 50),
    expense('j-gym', 'Gym', 'fitness', 90),
    expense('j-phone', 'Phone', 'phone', 35),
    expense('j-transit', 'Public transit', 'transport', 120),
    expense('j-utilities', 'Utilities', 'utilities', 80),
    expense('j-dining', 'Dining', 'dining', 200),
    expense('j-entertainment', 'Entertainment', 'entertainment', 0),
    expense('j-gifts', "Gifts (birthday, Valentine's, Christmas, anniversary)", 'gifts', 2500, 'yearly'),
  ])
  const sophia = person('sophia', 'Sophia', [
    expense('s-rent', 'Rent', 'housing', 0),
    expense('s-gym', 'Gym', 'fitness', 0),
    expense('s-phone', 'Phone', 'phone', 35),
    expense('s-transit', 'Public transit', 'transport', 120),
    expense('s-utilities', 'Utilities', 'utilities', 80),
    expense('s-misc', 'Misc needs', 'personal', 0),
    expense('s-entertainment', 'Entertainment', 'entertainment', 0),
    expense('s-gifts', "Gifts (birthday, Valentine's, Christmas, anniversary)", 'gifts', 0, 'yearly'),
  ])

  return {
    schemaVersion: 2,
    settings: { planYear: currentPlanStartYear(), displayCurrency: 'USD', fxCadPerUsd: 1.4, theme: 'midnight' },
    people: [jerry, sophia],
    shared: {
      expenses: [
        expense('sh-internet', 'Internet', 'phone', 0),
        expense('sh-dining', 'Dining out', 'dining', 0),
        expense('sh-groceries', 'Groceries', 'groceries', 200),
        expense('sh-utilities', 'Utilities', 'utilities', 100),
      ],
      travel: {
        trips: 2,
        daysPerTrip: 9,
        travelers: 2,
        flightPerPerson: 600,
        hotelPerNightPerPerson: 125,
        activitiesPerTripPerPerson: 500,
        diningPerDayPerPerson: 125,
      },
      split: { kind: 'even' },
    },
    properties: [
      {
        id: 'condo',
        name: 'Condo (Canada)',
        ownerId: 'jerry',
        ownershipPct: 100,
        currency: 'CAD',
        marketValue: 500000,
        appreciationPct: 0,
        // 5.42% compounded semi-annually makes month-1 interest ≈ 50% of the payment, as in the sheet.
        mortgage: { balance: 280000, annualRatePct: 5.42, monthlyPayment: 2500, compounding: 'semi-annual' },
        monthlyRent: 2350,
        vacancyPct: 0,
        condoFeesMonthly: 580,
        propertyTaxAnnual: 2804,
        insuranceAnnual: 0,
        managementPct: 0,
        maintenanceAnnual: 0,
        canada: { nr6Elected: true },
        us: { purchasePrice: 500000, purchaseYear: 2022, landPct: 20, fxAtPurchase: 1.4 },
      },
    ],
    accounts: [
      ...accountsFor('jerry', 'Jerry'),
      ...accountsFor('sophia', 'Sophia'),
      { id: 'joint-cash', name: 'Joint · High-yield savings', type: 'cash', ownerId: 'joint', balance: 0, currency: 'USD' },
    ],
    debts: [
      { id: 'student-loan', name: 'Student loan', ownerId: 'jerry', balance: null, annualRatePct: 0, monthlyPayment: 300, currency: 'CAD' },
    ],
    assumptions: {
      stockReturnPct: 8,
      cashYieldPct: 3.5,
      inflationPct: 2.5,
      salaryGrowthPct: 3,
      dividendYieldPct: 1.5,
      returnVolatilityPct: 15,
    },
    goal: {
      scope: 'household',
      target: { mode: 'amount', amount: 2500000, dollars: 'today' },
      by: { mode: 'date', year: 2055, month: 1 },
      includeRealEstateEquity: false,
    },
    placeholders: [
      'people.0.birthYear',
      'people.1.birthYear',
      'properties.0.us',
      'properties.0.mortgage.annualRatePct',
      'goal',
      'accounts.balances',
    ],
    actuals: { months: {}, snapshots: [], baseline: null, bankLinks: {} },
  }
}
