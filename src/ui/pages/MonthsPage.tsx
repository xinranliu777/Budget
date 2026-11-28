import { produce } from 'immer'
import { History, Plus, RefreshCw, RotateCcw, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, createBaseline, hasCheckIn, monthActual } from '../../engine/actuals'
import { matchedBalances, type RemoteBalance } from '../../engine/bankSync'
import { projectPlan } from '../../engine/projection'
import type { Plan } from '../../model/types'
import { usePlanStore } from '../../store/planStore'
import { currentMonth, useMonthPlan, usePlan, useProjection } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../cn'
import { Card } from '../components/Card'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from '../components/charts'
import { CheckInInput, monthLabel, snapshotTotal } from '../components/checkin'
import { EmptyState } from '../components/feedback'
import { Button, CURRENCY_PREFIX, CurrencyPill, EditableNumber, SelectMenu } from '../components/inputs'
import { ConfirmDialog, Drawer } from '../components/overlays'
import { formatCurrency, useMoney } from '../format'

const newId = () => Math.random().toString(36).slice(2, 9)
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function useMonthRows(): [string[], () => void] {
  const plan = usePlan()
  const today = currentMonth()
  const earliestCheckIn = Object.keys(plan.actuals.months).filter((k) => k <= today).sort()[0] ?? today
  const [added, setAdded] = useState(0)
  const first = addMonths(earliestCheckIn < today ? earliestCheckIn : today, -added)
  const rows: string[] = []
  for (let k = today; k >= first; k = addMonths(k, -1)) rows.push(k)
  return [rows, () => setAdded((n) => n + 1)]
}

function MonthsTable({ rows, onAddEarlier }: { rows: string[]; onAddEarlier: () => void }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const { money } = useMoney()
  const th = 'px-3 py-2 text-right text-[11px] font-medium tracking-wide text-faint uppercase'
  return (
    <Card title="Spending by month" subtitle="Blank means it went as planned. Amounts in USD, savings excluded.">
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className={cn(th, 'text-left')}>Month</th>
              <th className={th}>{plan.people[0].name}</th>
              <th className={th}>{plan.people[1].name}</th>
              <th className={th}>Shared</th>
              <th className={th}>Total</th>
              <th className={th}>Plan</th>
              <th className={th}>Difference</th>
              <th className={th}>Saved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const c = plan.actuals.months[k]
              const a = monthActual(mp, c)
              const checked = hasCheckIn(c)
              const diff = a.spend.household - mp.total
              return (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-3 py-1.5 font-medium text-ink">{monthLabel(k)}</td>
                  {(['jerry', 'sophia', 'shared'] as const).map((f) => (
                    <td key={f} className="px-3 py-1.5">
                      <CheckInInput month={k} field={f} size="sm" className="flex justify-end" />
                    </td>
                  ))}
                  <td className={cn('num px-3 py-1.5 text-right', checked ? 'text-ink' : 'text-faint')}>{money(a.spend.household)}</td>
                  <td className="num px-3 py-1.5 text-right text-muted">{money(mp.total)}</td>
                  <td className={cn('num px-3 py-1.5 text-right', !checked || Math.abs(diff) < 0.5 ? 'text-faint' : diff > 0 ? 'text-negative' : 'text-positive')}>
                    {checked ? money(diff, { sign: true }) : '—'}
                  </td>
                  <td className={cn('num px-3 py-1.5 text-right', checked ? 'text-ink' : 'text-faint')}>{money(a.saved.household)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button size="sm" className="mt-2" onClick={onAddEarlier}>
        <Plus size={14} /> Add earlier month
      </Button>
    </Card>
  )
}

function MonthsChart({ rows }: { rows: string[] }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const { money, compact } = useMoney()
  let running = 0
  const data = [...rows].reverse().map((k) => {
    const c = plan.actuals.months[k]
    const a = monthActual(mp, c)
    if (hasCheckIn(c)) running += a.difference.household
    return { k, label: monthLabel(k), spend: a.spend.household, plan: mp.total, running }
  })
  return (
    <Card title="Spending vs plan" subtitle="Bars are total spending; the line is how far savings are ahead (+) or behind (−) plan">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => compact(v)} />
          <Tooltip cursor={{ fill: 'var(--surface)' }} content={(p) => <ChartTooltip {...p} hideZero={false} format={(v) => money(v)} />} />
          <Bar dataKey="spend" name="Spent" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line dataKey="plan" name="Plan" stroke="var(--faint)" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="running" name="Savings vs plan" stroke="var(--positive)" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

function saveBalances(plan: Plan, date: string, balances: Record<string, number>) {
  const next = produce(plan, (d) => {
    for (const a of d.accounts) if (typeof balances[a.id] === 'number') a.balance = balances[a.id]
  })
  const baseline = plan.actuals.baseline ?? createBaseline(projectPlan(next), date.slice(0, 7))
  usePlanStore.getState().update((d) => {
    for (const a of d.accounts) if (typeof balances[a.id] === 'number') a.balance = balances[a.id]
    d.actuals.snapshots.push({ id: `snap-${newId()}`, date, balances })
    d.actuals.baseline = baseline
  })
}

const SYNC_SECRET_KEY = 'tandem.syncSecret'

function readSyncToken(plan: Plan): string {
  return plan.actuals.bankSyncToken?.trim() || localStorage.getItem(SYNC_SECRET_KEY) || ''
}

function persistSyncToken(value: string, update: (fn: (d: Plan) => void) => void): void {
  const trimmed = value.trim()
  if (trimmed) localStorage.setItem(SYNC_SECRET_KEY, trimmed)
  else localStorage.removeItem(SYNC_SECRET_KEY)
  update((d) => {
    if (trimmed) d.actuals.bankSyncToken = trimmed
    else delete d.actuals.bankSyncToken
  })
}

/** Bank fills win. Hand edits to accounts the bank is not updating are kept. */
function overlayDraft(base: Record<string, number>, draft: Record<string, number>, balances: Record<string, number>): Record<string, number> {
  const next = { ...base }
  for (const id of Object.keys(draft)) if (!(id in balances) && draft[id] !== base[id]) next[id] = draft[id]
  return { ...next, ...balances }
}

function BalancesDrawer() {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const open = useUiStore((s) => s.balancesOpen)
  const setOpen = useUiStore((s) => s.setBalancesOpen)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [base, setBase] = useState<Record<string, number>>({})
  const [date, setDate] = useState(todayIso)
  const [wasOpen, setWasOpen] = useState(false)
  const [secret, setSecret] = useState(() => readSyncToken(plan))
  const [editToken, setEditToken] = useState(false)
  const [remote, setRemote] = useState<RemoteBalance[] | null>(null)
  const [notices, setNotices] = useState<string[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const starting = Object.fromEntries(plan.accounts.map((a) => [a.id, a.balance]))
      setBase(starting)
      setDraft(starting)
      setDate(todayIso())
      setRemote(null)
      setNotices([])
      setSyncError(null)
      let token = readSyncToken(plan)
      const legacy = localStorage.getItem(SYNC_SECRET_KEY)?.trim()
      if (!plan.actuals.bankSyncToken && legacy) {
        persistSyncToken(legacy, update)
        token = legacy
      }
      setSecret(token)
      setEditToken(!token)
    }
  }

  const applyRemote = (list: RemoteBalance[], warnings: string[]) => {
    const { balances, notices: problems } = matchedBalances(plan.accounts, plan.actuals.bankLinks, list)
    setDraft((d) => overlayDraft(base, d, balances))
    setNotices([...warnings, ...problems])
    const latest = Math.max(0, ...list.map((a) => a.balanceDate ?? 0))
    if (latest > 0) {
      const iso = new Date(latest * 1000).toISOString().slice(0, 10)
      if (iso <= todayIso()) setDate(iso)
    }
  }

  const fetchBalances = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const res = await fetch('/api/balances', { headers: { Authorization: `Bearer ${secret.trim()}` } })
      const body = (await res.json().catch(() => null)) as { accounts?: RemoteBalance[]; warnings?: string[]; error?: string } | null
      if (!res.ok || !body?.accounts) throw new Error(body?.error ?? 'Could not fetch balances.')
      setRemote(body.accounts)
      applyRemote(body.accounts, body.warnings ?? [])
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Could not fetch balances.')
    } finally {
      setSyncing(false)
    }
  }

  const setLink = (simplefinId: string, accountId: string | null) => {
    const links = { ...plan.actuals.bankLinks, [simplefinId]: { accountId } }
    update((d) => void (d.actuals.bankLinks[simplefinId] = { accountId }))
    if (remote) {
      const { balances, notices: problems } = matchedBalances(plan.accounts, links, remote)
      setDraft((d) => overlayDraft(base, d, balances))
      setNotices(problems)
    }
  }
  return (
    <Drawer open={open} onOpenChange={setOpen} title="Update balances" description="Enter each account’s balance today, in its own currency.">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <span className="text-sm text-ink">As of</span>
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-lg bg-surface-2 px-2 py-1 text-sm text-ink outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>
      <div className="mb-5 rounded-xl border border-line bg-surface/40 p-3">
        <div className="text-xs font-semibold tracking-wide text-muted uppercase">From your bank</div>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          Fetches balances only (not transactions). Pair each bank account with a plan account below; mappings are saved in your plan.
        </p>
        {secret.trim() && !editToken ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Sync token saved</span>
            <Button size="sm" variant="outline" onClick={() => setEditToken(true)}>
              Change
            </Button>
            <Button size="sm" variant="outline" disabled={syncing} onClick={() => void fetchBalances()}>
              <RefreshCw size={13} className={syncing ? 'animate-spin' : undefined} /> {syncing ? 'Fetching' : 'Fetch balances'}
            </Button>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="password"
              value={secret}
              autoComplete="off"
              placeholder="Sync token"
              aria-label="Sync token"
              onChange={(e) => {
                setSecret(e.target.value)
                persistSyncToken(e.target.value, update)
              }}
              className="min-w-0 flex-1 rounded-lg bg-surface-2 px-2 py-1.5 text-sm text-ink outline-none focus:ring-1 focus:ring-accent/50"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!secret.trim() || syncing}
              onClick={() => {
                persistSyncToken(secret, update)
                setEditToken(false)
                void fetchBalances()
              }}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : undefined} /> {syncing ? 'Fetching' : 'Save & fetch'}
            </Button>
          </div>
        )}
        {syncError && <p className="mt-2 text-xs text-negative">{syncError}</p>}
        {notices.map((n) => (
          <p key={n} className="mt-2 text-xs text-warning">
            {n}
          </p>
        ))}
        {remote && remote.length > 0 && (
          <div className="mt-3 space-y-2">
            {remote.map((r) => {
              const link = plan.actuals.bankLinks[r.id]
              const value = link === undefined ? 'choose' : (link.accountId ?? 'skip')
              return (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{r.name}</div>
                    <div className="num text-[11px] text-faint">
                      {r.org ? `${r.org} · ` : ''}
                      {r.currency === 'USD' || r.currency === 'CAD' ? formatCurrency(r.balance, r.currency) : `${r.balance.toLocaleString('en-US')} ${r.currency}`}
                    </div>
                  </div>
                  <SelectMenu
                    value={value}
                    onChange={(v) => v !== 'choose' && setLink(r.id, v === 'skip' ? null : v)}
                    ariaLabel={`Where ${r.name} goes`}
                    options={[
                      { value: 'choose', label: 'Choose' },
                      { value: 'skip', label: "Don't sync" },
                      ...plan.accounts.map((a) => ({ value: a.id, label: a.name })),
                    ]}
                  />
                </div>
              )
            })}
          </div>
        )}
        {remote && remote.length === 0 && <p className="mt-2 text-xs text-faint">SimpleFIN returned no accounts.</p>}
      </div>
      <div className="space-y-0.5">
        {plan.accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
            <div className="min-w-0">
              <div className="truncate text-sm text-ink">{a.name}</div>
              <div className="text-[11px] text-faint">{a.ownerId === 'joint' ? 'Joint' : plan.people.find((p) => p.id === a.ownerId)?.name}</div>
            </div>
            <div className="flex items-center gap-1">
              <EditableNumber value={draft[a.id] ?? a.balance} onChange={(v) => setDraft((d) => ({ ...d, [a.id]: v }))} prefix={CURRENCY_PREFIX[a.currency]} min={0} step={1000} ariaLabel={`${a.name} balance`} />
              <CurrencyPill value={a.currency} />
            </div>
          </div>
        ))}
      </div>
      {plan.accounts.length === 0 && <p className="text-sm text-faint">Add accounts in Setup first.</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          variant="primary"
          disabled={plan.accounts.length === 0}
          onClick={() => {
            saveBalances(plan, date, Object.fromEntries(plan.accounts.map((a) => [a.id, draft[a.id] ?? a.balance])))
            setOpen(false)
          }}
        >
          Save balances
        </Button>
      </div>
    </Drawer>
  )
}

function SnapshotsCard() {
  const plan = usePlan()
  const proj = useProjection()
  const update = usePlanStore((s) => s.update)
  const setOpen = useUiStore((s) => s.setBalancesOpen)
  const { money } = useMoney()
  const snaps = [...plan.actuals.snapshots].sort((a, b) => b.date.localeCompare(a.date))
  const baseline = plan.actuals.baseline
  return (
    <Card
      title="Balance updates"
      subtitle={baseline ? `Baseline from ${monthLabel(baseline.startMonth)}` : 'Your first update sets the baseline to compare against'}
      action={
        <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
          <Wallet size={14} /> Update balances
        </Button>
      }
    >
      {snaps.length === 0 ? (
        <EmptyState icon={<History size={20} />} title="No updates yet">
          Every few months, enter your account balances to see how you’re tracking against the plan.
        </EmptyState>
      ) : (
        <ul className="-mx-2">
          {snaps.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface">
              <span className="flex-1 text-sm text-ink">{new Date(`${s.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="num text-sm text-muted">{money(snapshotTotal(plan, s, 'household'))}</span>
              <button
                type="button"
                aria-label="Delete update"
                onClick={() => update((d) => void (d.actuals.snapshots = d.actuals.snapshots.filter((x) => x.id !== s.id)))}
                className="rounded-lg p-1.5 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-negative/10 hover:text-negative focus-visible:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {baseline && (
        <ConfirmDialog
          trigger={
            <Button size="sm" className="mt-2">
              <RotateCcw size={14} /> Reset baseline
            </Button>
          }
          title="Reset the baseline?"
          description="The dashed line on the chart will restart from today’s projection. You can undo this."
          confirmLabel="Reset"
          onConfirm={() => update((d) => void (d.actuals.baseline = createBaseline(proj, currentMonth())))}
        />
      )}
    </Card>
  )
}

export function MonthsPage() {
  const [rows, addEarlier] = useMonthRows()
  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 xl:col-span-8">
        <MonthsTable rows={rows} onAddEarlier={addEarlier} />
        <MonthsChart rows={rows} />
      </div>
      <div className="col-span-12 xl:col-span-4">
        <SnapshotsCard />
      </div>
      <BalancesDrawer />
    </div>
  )
}
