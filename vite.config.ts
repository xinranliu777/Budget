/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import { balancesResponse } from './src/server/simplefin.ts'

/** Same /api/balances endpoint locally that Vercel serves from api/balances.ts. */
function balancesApi(): Plugin {
  const handle = (mode: string): Connect.NextHandleFunction => async (req, res) => {
    const env = loadEnv(mode, process.cwd(), '')
    const result = await balancesResponse({
      method: req.method ?? 'GET',
      authorization: req.headers.authorization,
      accessUrl: env.SIMPLEFIN_ACCESS_URL,
      syncSecret: env.SYNC_SECRET,
    })
    res.statusCode = result.status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result.body))
  }
  return {
    name: 'balances-api',
    configureServer(server) {
      server.middlewares.use('/api/balances', handle(server.config.mode))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/balances', handle(server.config.mode))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), balancesApi()],
    /** Vercel Supabase integration often sets NEXT_PUBLIC_* rather than VITE_*. */
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'import.meta.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY ?? ''),
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
