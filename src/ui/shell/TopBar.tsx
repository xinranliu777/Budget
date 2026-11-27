import { Redo2, Undo2 } from 'lucide-react'
import { useStore } from 'zustand'
import type { Currency, PlanYear, Scope } from '../../model/types'
import { redo, undo, usePlanStore } from '../../store/planStore'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../cn'
import { Segmented } from '../components/inputs'
import { NAV, navItem } from './nav'

export function TopBar({ onSignOut }: { onSignOut?: () => void }) {
  const page = useUiStore((s) => s.page)
  const setPage = useUiStore((s) => s.setPage)
  const scope = useUiStore((s) => s.scope)
  const setScope = useUiStore((s) => s.setScope)
  const settings = usePlanStore((s) => s.plan.settings)
  const names = usePlanStore((s) => s.plan.people.map((p) => p.name).join('|'))
  const update = usePlanStore((s) => s.update)
  const canUndo = useStore(usePlanStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(usePlanStore.temporal, (s) => s.futureStates.length > 0)
  const item = navItem(page)
  const [jerry, sophia] = names.split('|')

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 px-8 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{item.title}</h1>
          <p className="text-[13px] text-muted">{item.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {page === 'home' && (
            <Segmented<Scope>
              value={scope}
              onChange={setScope}
              options={[
                { value: 'jerry', label: jerry },
                { value: 'sophia', label: sophia },
                { value: 'household', label: 'Together' },
              ]}
            />
          )}
          <Segmented<PlanYear>
            value={settings.planYear}
            onChange={(y) => update((d) => void (d.settings.planYear = y))}
            options={[
              { value: 2026, label: '2026', title: 'Plan with 2026 tax rules' },
              { value: 2027, label: '2027', title: 'Plan with 2027 tax rules' },
            ]}
          />
          <Segmented<Currency>
            value={settings.displayCurrency}
            onChange={(c) => update((d) => void (d.settings.displayCurrency = c))}
            options={[
              { value: 'USD', label: 'USD' },
              { value: 'CAD', label: 'CAD' },
            ]}
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
              <button type="button" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" aria-label="Undo" className="rounded-[10px] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                <Undo2 size={16} />
              </button>
              <button type="button" onClick={redo} disabled={!canRedo} title="Redo (⇧⌘Z)" aria-label="Redo" className="rounded-[10px] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                <Redo2 size={16} />
              </button>
            </div>
            {onSignOut && (
              <button type="button" onClick={onSignOut} className="rounded-xl border border-line px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink">
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-6 pb-3 md:hidden">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => setPage(n.id)} className={cn('shrink-0 rounded-lg px-2.5 py-1 text-xs', n.id === page ? 'bg-surface-2 text-ink' : 'text-muted')}>
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
