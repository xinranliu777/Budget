export function DeploymentConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="glass w-full max-w-md rounded-3xl border border-line/70 p-8 text-sm">
        <h1 className="text-xl font-semibold tracking-tight">Sign-in is not configured</h1>
        <p className="mt-2 text-muted">
          This deployment must have Supabase credentials at build time (for example{' '}
          <code className="text-ink">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="text-ink">SUPABASE_PUBLISHABLE_KEY</code>). Without them the app cannot require login.
        </p>
      </div>
    </div>
  )
}