<template>
  <div class="auth-callback">
    <div class="auth-callback__panel">
      <p class="auth-callback__eyebrow">Cadence</p>
      <h1>{{ statusTitle }}</h1>
      <p>{{ statusText }}</p>
      <button v-if="hasError" type="button" class="auth-callback__retry" @click="backToLogin">
        Back to sign in
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import { consumePostLoginRedirect } from '@/lib/post-login-redirect'

// The Supabase client is configured with detectSessionInUrl:true, so it exchanges
// the OAuth code for a session automatically on load. This page must NOT exchange
// again (the one-time code / PKCE verifier is already consumed) — it only waits for
// the resulting auth state and routes accordingly.
const REDIRECT_TIMEOUT_MS = 8000

// Human-readable copy for the OAuth error codes a provider may hand back.
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled the authorization. You can try again.',
  server_error: 'The sign-in service had a temporary problem. Please try again later.'
}

const router = useRouter()
const auth = useAuthStore()
const error = ref<string | null>(null)

const hasError = computed(() => error.value !== null)
const statusTitle = computed(() => {
  if (hasError.value) return "Sign-in didn't complete"
  if (auth.isSignedIn) return 'Signed in'
  return 'Finishing sign-in'
})
const statusText = computed(() => {
  if (error.value) return error.value
  if (auth.isSignedIn) return 'Taking you back to Cadence.'
  return 'Please wait.'
})

let timeoutId: ReturnType<typeof setTimeout> | undefined

function backToLogin(): void {
  void router.replace('/login')
}

// Watch both flags because isSignedIn === false is ambiguous on its own (see the
// three-state note in auth-store): it means either "still resolving" or "resolved,
// not signed in". Only act on failure once isReady confirms resolution is done.
// Signed in → leave for the app. Ready but still not signed in → the auto exchange
// failed with no explicit provider error; surface a generic failure.
const stop = watch(
  [() => auth.isSignedIn, () => auth.isReady],
  ([isSignedIn, isReady]) => {
    if (error.value) return
    if (isSignedIn) {
      // A pending /join destination (saved before the login round-trip) wins over the root view;
      // consume validates the /join/ prefix so nothing else can hijack this navigation.
      void router.replace(consumePostLoginRedirect() ?? '/')
    } else if (isReady) {
      error.value = "Sign-in didn't complete. Please try again."
    }
  },
  { immediate: true }
)

onMounted(() => {
  // A provider-supplied error in the callback URL takes precedence over waiting.
  const params = new URLSearchParams(window.location.search)
  const errorCode = params.get('error')
  if (errorCode) {
    error.value = ERROR_MESSAGES[errorCode] ?? "Sign-in didn't complete. Please try again."
    return
  }

  // Safety net: never spin forever if the auto-exchange silently stalls.
  timeoutId = setTimeout(() => {
    if (!auth.isSignedIn && !error.value) {
      error.value = 'Sign-in timed out. Please try again.'
    }
  }, REDIRECT_TIMEOUT_MS)
})

onBeforeUnmount(() => {
  stop()
  if (timeoutId) clearTimeout(timeoutId)
})
</script>

<style scoped lang="sass">
.auth-callback
  min-height: 100svh
  display: grid
  place-items: center
  background: #eeebe1
  color: #292820

.auth-callback__panel
  width: min(420px, calc(100vw - 40px))
  border: 1px solid rgba(41, 40, 32, .16)
  border-radius: 8px
  background: rgba(255, 255, 255, .56)
  padding: 28px

  h1
    margin: 0 0 8px
    font-size: 24px
    line-height: 1.15

  p
    margin: 0
    color: #68685f

.auth-callback__eyebrow
  margin-bottom: 12px !important
  font-size: 12px
  font-weight: 700
  letter-spacing: .08em
  text-transform: uppercase
  color: #817d6f !important

.auth-callback__retry
  margin-top: 20px
  padding: 10px 18px
  border: 1px solid rgba(41, 40, 32, .2)
  border-radius: 8px
  background: rgba(255, 255, 255, .72)
  color: #292820
  font-size: 14px
  font-weight: 600
  cursor: pointer
  transition: background .15s ease

  &:hover
    background: #ffffff
</style>

