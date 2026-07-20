import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { authCallbackUrl, isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useUiStore } from './ui-store'

function appRootUrl(): string {
  const base = import.meta.env.QUASAR_VUE_ROUTER_BASE || '/'
  return new URL(base, window.location.origin).toString()
}

function isLoginPath(): boolean {
  return window.location.pathname.endsWith('/login')
}

export const useAuthStore = defineStore('auth', () => {
  const ui = useUiStore()
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  const isSignedIn = computed(() => user.value !== null)
  const displayName = computed(() => {
    const metadata = user.value?.user_metadata
    return (metadata?.full_name as string | undefined) ?? user.value?.email ?? 'Cadence user'
  })
  const avatarUrl = computed(() => (user.value?.user_metadata?.avatar_url as string | undefined) ?? null)

  function showMonthView(): void {
    ui.activeView = 'month'
  }

  function goToMonthPage(): void {
    showMonthView()
    if (isLoginPath()) {
      window.location.replace(appRootUrl())
    }
  }

  async function init(): Promise<void> {
    if (!supabase) {
      isLoading.value = false
      error.value = 'Supabase is not configured. Set QCLI_SUPABASE_URL and QCLI_SUPABASE_ANON_KEY.'
      return
    }

    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      error.value = sessionError.message
    }

    session.value = data.session
    user.value = data.session?.user ?? null
    if (data.session) {
      goToMonthPage()
    }

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      session.value = nextSession
      user.value = nextSession?.user ?? null
      if (nextSession) {
        goToMonthPage()
      }
    })

    isLoading.value = false
  }

  async function signInWithGoogle(): Promise<void> {
    if (!supabase) {
      error.value = 'Supabase is not configured. Set QCLI_SUPABASE_URL and QCLI_SUPABASE_ANON_KEY.'
      return
    }

    error.value = null
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authCallbackUrl()
      }
    })

    if (signInError) error.value = signInError.message
  }

  async function signOut(): Promise<void> {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      error.value = signOutError.message
      return
    }
    session.value = null
    user.value = null
  }

  return {
    session,
    user,
    isLoading,
    error,
    isConfigured: isSupabaseConfigured,
    isSignedIn,
    displayName,
    avatarUrl,
    init,
    signInWithGoogle,
    signOut
  }
})
