import { TriangleAlert, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import type { PageId } from './model/types'
import { isSupabaseConfigured, getSupabase } from './lib/supabase'
import { flushSave, redo, resetHistory, undo, usePlanStore } from './store/planStore'
import { LocalStorageRepository } from './store/repository'
import { SupabasePlanRepository } from './store/supabaseRepository'
import { routeFromHash, useUiStore } from './store/uiStore'
import { AuthScreen } from './ui/auth/AuthScreen'
import { HomePage } from './ui/pages/HomePage'
import { MonthsPage } from './ui/pages/MonthsPage'
import { SetupPage } from './ui/pages/SetupPage'
import { Sidebar } from './ui/shell/Sidebar'
import { TopBar } from './ui/shell/TopBar'

const PAGES: Record<PageId, () => ReactNode> = {
  home: HomePage,
  months: MonthsPage,
  setup: SetupPage,
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

async function seedCloudFromLocal(repo: SupabasePlanRepository): Promise<void> {
  const existing = await repo.load()
  if (existing) return
  const local = new LocalStorageRepository()
  const localPlan = await local.load()
  if (localPlan) await repo.save(localPlan)
}

function AppShell({ onSignOut }: { onSignOut?: () => void }) {
  const hydrated = usePlanStore((s) => s.hydrated)
  const theme = usePlanStore((s) => s.plan.settings.theme)
  const page = useUiStore((s) => s.page)
  const notice = usePlanStore((s) => s.notice)
  const dismissNotice = usePlanStore((s) => s.dismissNotice)

  useEffect(() => {
    const onHash = () => useUiStore.setState(routeFromHash(location.hash))
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || isTyping(e.target)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    const onUnload = () => void flushSave()
    addEventListener('hashchange', onHash)
    addEventListener('keydown', onKey)
    addEventListener('beforeunload', onUnload)
    return () => {
      removeEventListener('hashchange', onHash)
      removeEventListener('keydown', onKey)
      removeEventListener('beforeunload', onUnload)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!useUiStore.getState().section) window.scrollTo({ top: 0 })
  }, [page])

  if (!hydrated) return null
  const Page = PAGES[page]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSignOut={onSignOut} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 pt-6 pb-20">
          {notice && (
            <div role="alert" className="glass mb-5 flex items-start gap-3 rounded-2xl border-warning/40 p-4 text-sm">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" />
              <p className="flex-1 text-muted">{notice}</p>
              <button type="button" onClick={dismissNotice} className="rounded-lg p-1 text-faint hover:bg-surface-2 hover:text-ink" aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function LocalApp() {
  useEffect(() => {
    void usePlanStore.getState().hydrate(new LocalStorageRepository())
  }, [])

  return <AppShell />
}

function SupabaseApp() {
  const [sessionReady, setSessionReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session)
      setSessionReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const boot = async () => {
    const repo = new SupabasePlanRepository(getSupabase())
    await seedCloudFromLocal(repo)
    await usePlanStore.getState().hydrate(repo)
  }

  useEffect(() => {
    if (signedIn) void boot()
    else usePlanStore.setState({ hydrated: false })
  }, [signedIn])

  if (!sessionReady) return null
  if (!signedIn) {
    return (
      <AuthScreen
        onSignedIn={() => {
          setSignedIn(true)
        }}
      />
    )
  }

  const signOut = async () => {
    await flushSave()
    await getSupabase().auth.signOut()
    usePlanStore.getState().reset()
    resetHistory()
    usePlanStore.setState({ hydrated: false, notice: null })
    setSignedIn(false)
  }

  return <AppShell onSignOut={() => void signOut()} />
}

export default function App() {
  return isSupabaseConfigured() ? <SupabaseApp /> : <LocalApp />
}