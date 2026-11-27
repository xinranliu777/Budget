import { Check, Download, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { persistenceDataCardSubtitle } from '../../../lib/persistence'
import { PLACEHOLDERS } from '../../../model/placeholders'
import type { Assumptions, PlanYear } from '../../../model/types'
import { usePlanStore } from '../../../store/planStore'
import { usePlan } from '../../../store/selectors'
import { useUiStore } from '../../../store/uiStore'
import { Card } from '../../components/Card'
import { Badge } from '../../components/feedback'
import { Button, EditableNumber, EditableText, Field, NumberField, Segmented } from '../../components/inputs'
import { ConfirmDialog } from '../../components/overlays'
import { cn } from '../../cn'
import { THEMES } from '../../theme/themes'

const ASSUMPTIONS: { key: keyof Assumptions; label: string; hint: string; max: number; step: number }[] = [
  { key: 'stockReturnPct', label: 'Investment return', hint: 'yearly, before inflation', max: 20, step: 0.25 },
  { key: 'returnVolatilityPct', label: 'Volatility', hint: 'yearly swing, for the odds', max: 40, step: 1 },
  { key: 'dividendYieldPct', label: 'Dividend yield', hint: 'taxed yearly in taxable accounts', max: 10, step: 0.1 },
  { key: 'cashYieldPct', label: 'Cash yield', hint: 'high-yield savings', max: 10, step: 0.1 },
  { key: 'inflationPct', label: 'Inflation', hint: 'also indexes tax brackets', max: 10, step: 0.1 },
  { key: 'salaryGrowthPct', label: 'Salary growth', hint: 'yearly raises', max: 15, step: 0.25 },
]

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AssumptionsSection() {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const replace = usePlanStore((s) => s.replace)
  const reset = usePlanStore((s) => s.reset)
  const setPage = useUiStore((s) => s.setPage)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const s = plan.settings

  const onImport = async (file: File) => {
    try {
      const raw: unknown = JSON.parse(await file.text())
      if (typeof raw !== 'object' || raw === null || !('people' in raw) || !('schemaVersion' in raw)) throw new Error('not a plan')
      replace(raw)
      setImportMsg({ ok: true, text: `Loaded ${file.name}. Undo (⌘Z) restores your previous plan.` })
    } catch {
      setImportMsg({ ok: false, text: `${file.name} isn’t a Tandem plan export.` })
    }
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 xl:col-span-6">
        <Card title="Assumptions" subtitle="Drive every projection, the goal solver and the odds">
          {ASSUMPTIONS.map((a) => (
            <NumberField key={a.key} label={a.label} hint={a.hint} value={plan.assumptions[a.key]} onChange={(v) => update((d) => void (d.assumptions[a.key] = v))} suffix="%" decimals={2} min={a.key === 'stockReturnPct' ? -5 : 0} max={a.max} step={a.step} />
          ))}
        </Card>
        <Card title="Your data" subtitle={persistenceDataCardSubtitle()}>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => download(`tandem-plan-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(plan, null, 2))}>
              <Download size={14} /> Export plan
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Import plan
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onImport(f)
                e.target.value = ''
              }}
            />
            <div className="ml-auto">
              <ConfirmDialog
                trigger={
                  <Button variant="danger">
                    <RotateCcw size={14} /> Reset to sheet defaults
                  </Button>
                }
                title="Reset the whole plan?"
                description="Every setup input goes back to the values from your original spreadsheet. Monthly check-ins and balance updates are kept. You can undo this right after."
                confirmLabel="Reset"
                destructive
                onConfirm={() => {
                  reset()
                  setImportMsg(null)
                }}
              />
            </div>
          </div>
          {importMsg && (
            <div className="mt-3">
              <Badge tone={importMsg.ok ? 'positive' : 'negative'}>{importMsg.text}</Badge>
            </div>
          )}
        </Card>
      </div>

      <div className="col-span-12 space-y-5 xl:col-span-6">
        <Card title="Plan">
          <Field label="Tax year" hint="Brackets and limits for this year; projections start here">
            <Segmented<PlanYear>
              size="sm"
              value={s.planYear}
              onChange={(v) => update((d) => void (d.settings.planYear = v))}
              options={[
                { value: 2026, label: '2026' },
                { value: 2027, label: '2027' },
              ]}
            />
          </Field>
          <Field label="Show amounts in">
            <Segmented
              size="sm"
              value={s.displayCurrency}
              onChange={(v) => update((d) => void (d.settings.displayCurrency = v))}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'CAD', label: 'CAD' },
              ]}
            />
          </Field>
          <Field label="Exchange rate" hint={`US$1 = C$${s.fxCadPerUsd.toFixed(3)} · C$1 = US$${(1 / s.fxCadPerUsd).toFixed(3)}`}>
            <EditableNumber value={s.fxCadPerUsd} onChange={(v) => update((d) => void (d.settings.fxCadPerUsd = v))} prefix="C$" decimals={3} min={0.5} max={3} step={0.01} ariaLabel="CAD per USD" />
          </Field>
          {plan.people.map((p, i) => (
            <Field key={p.id} label={<EditableText value={p.name} onChange={(v) => update((d) => void (d.people[i].name = v))} className="-ml-2 font-medium" />} hint="Name and birth year">
              <EditableNumber value={p.birthYear} onChange={(v) => update((d) => void (d.people[i].birthYear = Math.round(v)))} min={1930} max={2010} grouping={false} ariaLabel={`${p.name} birth year`} />
            </Field>
          ))}
        </Card>

        <Card title="Still using placeholders" subtitle={plan.placeholders.length ? 'Values carried over from the sheet or guessed — worth confirming' : undefined}>
          {plan.placeholders.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-positive">
              <Check size={15} /> Every input has been set.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {plan.placeholders.map((key) => {
                const meta = PLACEHOLDERS[key]
                return (
                  <li key={key} className="flex items-center gap-2 border-b border-line py-2 text-sm last:border-0">
                    <span className="min-w-0 flex-1 first-letter:uppercase">{meta?.label ?? key}</span>
                    {meta && (
                      <Button size="sm" variant="outline" onClick={() => setPage('setup', meta.section)}>
                        Review
                      </Button>
                    )}
                    <Button size="sm" onClick={() => update((d) => void (d.placeholders = d.placeholders.filter((k) => k !== key)))}>
                      It’s right
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="col-span-12" title="Theme">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {THEMES.map((t) => {
            const active = s.theme === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => update((d) => void (d.settings.theme = t.id))}
                className={cn('group rounded-2xl border p-2 text-left transition-all', active ? 'border-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]' : 'border-line hover:border-faint')}
              >
                <div className="relative h-20 overflow-hidden rounded-xl" style={{ background: t.swatch[0] }}>
                  <div className="absolute -top-6 -left-4 size-20 rounded-full opacity-70 blur-2xl" style={{ background: t.swatch[1] }} />
                  <div className="absolute -right-4 -bottom-8 size-20 rounded-full opacity-60 blur-2xl" style={{ background: t.swatch[2] }} />
                  <div className="absolute bottom-2.5 left-2.5 flex gap-1">
                    <span className="h-1.5 w-8 rounded-full" style={{ background: t.swatch[1] }} />
                    <span className="h-1.5 w-4 rounded-full" style={{ background: t.swatch[2] }} />
                  </div>
                  {active && (
                    <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-white/90 text-black">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="px-1 pt-2 pb-1">
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-[11px] text-faint">{t.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

    </div>
  )
}
