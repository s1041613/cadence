import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.QCLI_SUPABASE_URL
const supabaseAnonKey = import.meta.env.QCLI_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Proof Key for Code Exchange: the browser gets a short-lived code, then
      // exchanges it for the real session token using a locally stored code_verifier.
      flowType: 'pkce',
      // On init, automatically detect the OAuth callback in the URL and run the PKCE exchange.
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  })
}

export const supabase = createSupabaseClient()

export function authCallbackUrl(): string {
  const base = import.meta.env.QUASAR_VUE_ROUTER_BASE || '/'
  const baseUrl = new URL(base, window.location.origin)

  return new URL('auth/callback', baseUrl).toString()
}
