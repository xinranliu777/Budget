import { motion } from 'motion/react'
import { useGoal } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../cn'
import { ProgressBar } from '../components/feedback'
import { formatPct } from '../format'
import { LogoMark } from './Logo'
import { persistenceSidebarNote } from '../../lib/persistence'
import { NAV } from './nav'

function GoalPill() {
  const goal = useGoal()
  const setPage = useUiStore((s) => s.setPage)
  const pct = goal.onTrackPct * 100
  return (
    <button type="button" onClick={() => setPage('setup', 'goal')} className="glass w-full rounded-2xl p-3.5 text-left transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Retirement goal</span>
        <span className={cn('num font-semibold', pct >= 100 ? 'text-positive' : 'text-ink')}>{formatPct(Math.min(pct, 999), 0)}</span>
      </div>
      <ProgressBar value={Math.min(pct, 100)} max={100} tone={pct >= 100 ? 'positive' : 'accent'} className="mt-2" />
      <div className="mt-2 text-[11px] text-faint">
        {pct >= 100 ? 'On track' : 'Projected'} for {goal.target.year}
      </div>
    </button>
  )
}

export function Sidebar() {
  const page = useUiStore((s) => s.page)
  const setPage = useUiStore((s) => s.setPage)
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-3 py-5 md:flex">
      <div className="mb-7 flex items-center gap-2.5 px-2.5">
        <LogoMark />
        <div>
          <div className="text-[15px] leading-tight font-semibold tracking-tight">Tandem</div>
          <div className="text-[11px] text-faint">Jerry & Sophia</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = item.id === page
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn('relative flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors', active ? 'text-ink' : 'text-muted hover:text-ink')}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl border border-line bg-surface-2"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                />
              )}
              <Icon size={17} className={cn('relative', active && 'text-accent')} />
              <span className="relative">{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <GoalPill />
        <p className="px-2 text-[11px] leading-relaxed text-faint">
          {persistenceSidebarNote()}
          <br />
          Planning estimates, not tax advice.
        </p>
      </div>
    </aside>
  )
}
