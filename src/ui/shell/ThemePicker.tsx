import type { ThemeId } from '../../model/types'
import { usePlanStore } from '../../store/planStore'
import { cn } from '../cn'
import { THEMES } from '../theme/themes'

export function ThemePicker() {
  const theme = usePlanStore((s) => s.plan.settings.theme)
  const update = usePlanStore((s) => s.update)
  return (
    <div className="px-1">
      <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-faint uppercase">Theme</div>
      <div className="grid grid-cols-4 gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.name}
            aria-label={t.name}
            aria-pressed={theme === t.id}
            onClick={() => update((d) => void (d.settings.theme = t.id as ThemeId))}
            className={cn(
              'h-8 rounded-lg border transition-all',
              theme === t.id ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-faint',
            )}
            style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]} 55%, ${t.swatch[2]})` }}
          />
        ))}
      </div>
    </div>
  )
}