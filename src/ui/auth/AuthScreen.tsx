import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { allowSelfServeSignUp } from '../../lib/authMode'
import { getSupabase } from '../../lib/supabase'

export function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signupAllowed = allowSelfServeSignUp()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const supabase = getSupabase()
    try {
      const creds = { email: email.trim(), password }
      const { error } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword(creds)
          : await supabase.auth.signUp(creds)
      if (error) setMessage(error.message)
      else onSignedIn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <form onSubmit={submit} className="glass w-full max-w-md space-y-4 rounded-3xl border border-line/70 p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Budget</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to open your household plan. Nothing is shown until you authenticate.
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Password</span>
          <input
            required
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2"
          />
        </label>
        {message && <p className="text-sm text-warning">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        {signupAllowed ? (
          <button
            type="button"
            className="w-full text-center text-sm text-muted hover:text-ink"
            onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        ) : (
          <p className="text-center text-xs text-faint">New accounts are created in Supabase; ask your admin for access.</p>
        )}
      </form>
    </div>
  )
}