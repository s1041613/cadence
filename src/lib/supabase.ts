import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.QCLI_SUPABASE_URL
const supabaseAnonKey = import.meta.env.QCLI_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
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
