import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { authCallbackUrl, isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useUiStore } from './ui-store'

export const useAuthStore = defineStore('auth', () => {
  const ui = useUiStore()
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const isLoading = ref(true)
  // isReady answers "has auth finished resolving?" (process), while isSignedIn
  // answers "is the user signed in?" (result). Two flags are needed because auth
  // has three states, and isSignedIn (a boolean) collapses the last two:
  //   resolving        -> isReady false, isSignedIn false
  //   resolved, in     -> isReady true,  isSignedIn true
  //   resolved, out    -> isReady true,  isSignedIn false
  // Without isReady, a consumer cannot tell "still loading" apart from "confirmed
  // not signed in" — both look like isSignedIn === false. AuthCallbackPage relies
  // on this to avoid showing a failure screen while the auto sign-in is still in flight.
  const isReady = ref(false)
  const error = ref<string | null>(null)

  const isSignedIn = computed(() => user.value !== null)
  const displayName = computed(() => {
    const metadata = user.value?.user_metadata
    return (metadata?.full_name as string | undefined) ?? user.value?.email ?? 'Cadence user'
  })
  const avatarUrl = computed(() => (user.value?.user_metadata?.avatar_url as string | undefined) ?? null)

  // Idempotent: only mutates view state. Redirect on sign-in is owned by the
  // page-level SPA guards (LoginPage / AuthCallbackPage), not the store.
  function showMonthView(): void {
    ui.activeView = 'month'
  }

  async function init(): Promise<void> {
    if (!supabase) {
      isLoading.value = false
      isReady.value = true
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
      showMonthView()
    }

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      session.value = nextSession
      user.value = nextSession?.user ?? null
      if (nextSession) {
        showMonthView()
      }
    })

    isLoading.value = false
    isReady.value = true
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
    isReady,
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
