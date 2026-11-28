export type Currency = 'USD' | 'CAD'
export type Frequency = 'monthly' | 'yearly'
export type PersonId = 'jerry' | 'sophia'
export type Scope = PersonId | 'household'
export type ThemeId = 'midnight' | 'aurora' | 'dusk' | 'daylight'
/** Calendar year the plan starts; projections use getTables(planYear + t) for each year t. */
export type PlanYear = number
export type PageId = 'home' | 'months' | 'setup'
export type SetupSection = 'pay' | 'budget' | 'accounts' | 'condo' | 'goal' | 'assumptions'

export interface Insight {
  id: string
  severity: 'positive' | 'info' | 'warn' | 'critical'
  title: string
  detail: string
  personId?: PersonId
  section?: SetupSection
}

/** 'YYYY-MM' */
export type MonthKey = string

/** Actual monthly spending in USD; null = went as planned. */
export interface MonthCheckIn {
  jerry: number | null
  sophia: number | null
  shared: number | null
}

export interface BalanceSnapshot {
  id: string
  /** 'YYYY-MM-DD' */
  date: string
  /** Account id → balance in the account's currency. */
  balances: Record<string, number>
}

export interface Baseline {
  createdAt: string
  startMonth: MonthKey
  /** Projected invested assets per month; index 0 = startMonth. */
  invested: Record<Scope, number[]>
}

/** A SimpleFIN account mapped onto a Tandem account. `accountId` null means "don't sync". */
export interface BankLink {
  accountId: string | null
}

export interface Actuals {
  months: Record<MonthKey, MonthCheckIn>
  snapshots: BalanceSnapshot[]
  baseline: Baseline | null
  /** SimpleFIN account id → link. Missing id means it has never been chosen. */
  bankLinks: Record<string, BankLink>
  /** Bearer token for /api/balances; synced with the household plan (same value as Vercel SYNC_SECRET). */
  bankSyncToken?: string
}

export type CategoryId =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'health'
  | 'fitness'
  | 'phone'
  | 'entertainment'
  | 'travel'
  | 'gifts'
  | 'debt'
  | 'shopping'
  | 'personal'
  | 'insurance'
  | 'other'

export interface Expense {
  id: string
  name: string
  category: CategoryId
  amount: number
  currency: Currency
  frequency: Frequency
}

export interface TravelPlan {
  trips: number
  daysPerTrip: number
  travelers: number
  flightPerPerson: number
  hotelPerNightPerPerson: number
  activitiesPerTripPerPerson: number
  diningPerDayPerPerson: number
}

export type SplitRule =
  | { kind: 'even' }
  | { kind: 'income' }
  | { kind: 'custom'; jerryPct: number }

export interface PersonIncome {
  baseSalary: number
  bonusPct: number
  /** Send the after-tax bonus to savings instead of the monthly budget. */
  bonusToSavings: boolean
  rsuAnnualVest: number
  /** ESPP payroll contribution as % of base salary. */
  esppContribPct: number
  esppDiscountPct: number
  otherTaxableIncome: number
}

export interface PersonPayroll {
  k401TraditionalPct: number
  k401RothPct: number
  k401AfterTaxPct: number
  /** Employer matches matchPct% of employee deferrals, on deferrals up to matchUpToPct% of salary. */
  matchPct: number
  matchUpToPct: number
  hsaAnnual: number
  hsaEmployerAnnual: number
  hsaCoverage: 'none' | 'self' | 'family'
  preTaxPremiumsMonthly: number
}

export interface PersonIra {
  annualContribution: number
  kind: 'roth' | 'traditional'
}

export interface SavingsAllocation {
  accountId: string
  pct: number
}

export interface Person {
  id: PersonId
  name: string
  birthYear: number
  income: PersonIncome
  payroll: PersonPayroll
  ira: PersonIra
  /** % of monthly take-home saved first ("pay yourself first"). */
  savingsRatePct: number
  /** Where take-home savings go after the IRA contribution. */
  savingsAllocation: SavingsAllocation[]
  expenses: Expense[]
}

export interface RentalProperty {
  id: string
  name: string
  ownerId: PersonId
  ownershipPct: number
  currency: 'CAD'
  marketValue: number
  appreciationPct: number
  mortgage: {
    balance: number
    annualRatePct: number
    monthlyPayment: number
    compounding: 'semi-annual' | 'monthly'
  }
  monthlyRent: number
  vacancyPct: number
  condoFeesMonthly: number
  propertyTaxAnnual: number
  insuranceAnnual: number
  managementPct: number
  maintenanceAnnual: number
  canada: { nr6Elected: boolean }
  us: {
    purchasePrice: number
    purchaseYear: number
    landPct: number
    /** CAD per USD at purchase, used for the USD depreciation basis. */
    fxAtPurchase: number
  }
}

export type AccountType =
  | 'k401_traditional'
  | 'k401_roth'
  | 'ira_traditional'
  | 'ira_roth'
  | 'hsa'
  | 'brokerage'
  | 'cash'
  | 'rrsp'
  | 'tfsa'
  | 'fhsa'

export interface Account {
  id: string
  name: string
  type: AccountType
  ownerId: PersonId | 'joint'
  balance: number
  currency: Currency
  expectedReturnPct?: number
  /** Manual yearly contribution (Canadian accounts only). */
  annualContribution?: number
}

export interface Debt {
  id: string
  name: string
  ownerId: PersonId
  /** null = balance unknown; payment treated as ongoing. */
  balance: number | null
  annualRatePct: number
  monthlyPayment: number
  currency: Currency
}

export interface Assumptions {
  stockReturnPct: number
  cashYieldPct: number
  inflationPct: number
  salaryGrowthPct: number
  dividendYieldPct: number
  returnVolatilityPct: number
}

export type GoalTarget =
  | { mode: 'amount'; amount: number; dollars: 'today' | 'future' }
  | { mode: 'spending'; annualSpendingToday: number; withdrawalRatePct: number }

export type GoalBy =
  | { mode: 'date'; year: number; month: number }
  | { mode: 'age'; personId: PersonId; age: number }

export interface RetirementGoal {
  scope: Scope
  target: GoalTarget
  by: GoalBy
  includeRealEstateEquity: boolean
}

export interface Settings {
  planYear: PlanYear
  displayCurrency: Currency
  fxCadPerUsd: number
  theme: ThemeId
}

export interface Plan {
  schemaVersion: 2
  settings: Settings
  people: [Person, Person]
  shared: { expenses: Expense[]; travel: TravelPlan; split: SplitRule }
  properties: RentalProperty[]
  accounts: Account[]
  debts: Debt[]
  assumptions: Assumptions
  goal: RetirementGoal
  /** Field paths still holding placeholder values (e.g. "people.0.birthYear"). */
  placeholders: string[]
  actuals: Actuals
}
