<template>
  <div class="oauth-consent">
    <div class="oauth-consent__panel">
      <p class="oauth-consent__eyebrow">Cadence</p>

      <template v-if="state.status === 'ask'">
        <h1>Connect {{ state.clientName }}?</h1>
        <p>
          <strong>{{ state.clientName }}</strong> is asking to use Cadence as you
          <span v-if="email">({{ email }})</span>. It will be able to:
        </p>
        <ul class="oauth-consent__list">
          <li v-for="line in CONSENT_CAN" :key="line">{{ line }}</li>
        </ul>
        <p>It cannot:</p>
        <ul class="oauth-consent__list oauth-consent__list--no">
          <li v-for="line in CONSENT_CANNOT" :key="line">{{ line }}</li>
        </ul>
        <p class="oauth-consent__fine">
          What it reads is sent to {{ state.clientName }}'s service. Only continue if you started this connection
          yourself. It will return to <code>{{ redirectHost }}</code>.
        </p>
        <div class="oauth-consent__actions">
          <button type="button" class="oauth-consent__action" :disabled="deciding" @click="decide(false)">Deny</button>
          <button
            type="button"
            class="oauth-consent__action oauth-consent__action--primary"
            :disabled="deciding"
            @click="decide(true)"
          >
            Allow
          </button>
        </div>
      </template>

      <template v-else>
        <h1>{{ statusTitle }}</h1>
        <p>{{ statusText }}</p>
        <div v-if="state.status === 'not-enabled'" class="oauth-consent__actions">
          <button type="button" class="oauth-consent__action" :disabled="deciding" @click="decide(false)">
            Go back
          </button>
        </div>
        <button v-else-if="state.status === 'error'" type="button" class="oauth-consent__action" @click="start">
          Retry
        </button>
        <button v-else-if="state.status === 'invalid'" type="button" class="oauth-consent__action" @click="backToApp">
          Back to Cadence
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import { savePostLoginRedirect } from '@/lib/post-login-redirect'
import { decideConsent, getConsentDetails, hasMcpAccess } from '@/services/oauth-consent-service'
import { CONSENT_CAN, CONSENT_CANNOT, startConsent, type ConsentStart } from './oauth-consent-core'

// Supabase Auth's "authorization path" points here (see supabase/functions/mcp/README.md). Thin
// wiring around oauth-consent-core's startConsent, which owns and tests every branch.

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

type PageState = ConsentStart | { status: 'loading' } | { status: 'leaving' }
const state = ref<PageState>({ status: 'loading' })
const deciding = ref(false)

const email = computed(() => auth.user?.email ?? '')
const authorizationId = computed(() => route.query.authorization_id)

const redirectHost = computed(() => {
  if (state.value.status !== 'ask') return ''
  try {
    return new URL(state.value.redirectUri).host
  } catch {
    return state.value.redirectUri
  }
})

const statusTitle = computed(() => {
  switch (state.value.status) {
    case 'invalid':
      return 'Link not valid'
    case 'not-enabled':
      return 'Not available yet'
    case 'error':
      return "Couldn't load this request"
    case 'leaving':
    case 'redirected':
      return 'Returning to the app'
    default:
      return 'Connecting'
  }
})

const statusText = computed(() => {
  switch (state.value.status) {
    case 'invalid':
      return 'This connection link is missing information or has been changed. Start the connection again from the app.'
    case 'not-enabled':
      return 'Connecting AI apps to Cadence is in a limited beta and is not enabled for your account yet.'
    case 'error':
      return 'The request may have expired. Check your connection and try again, or start over from the app.'
    default:
      return 'Please wait.'
  }
})

function leaveTo(url: string): void {
  state.value = { status: 'leaving' }
  window.location.assign(url)
}

async function start(): Promise<void> {
  state.value = { status: 'loading' }
  state.value = await startConsent(authorizationId.value, route.fullPath, {
    getCurrentUserId: () => auth.user?.id ?? null,
    hasMcpAccess,
    getDetails: getConsentDetails,
    savePostLoginRedirect,
    navigate: (path) => void router.replace(path),
    leaveTo
  })
}

async function decide(approve: boolean): Promise<void> {
  const id = authorizationId.value
  if (typeof id !== 'string' || deciding.value) return
  deciding.value = true
  try {
    leaveTo(await decideConsent(id, approve))
  } catch {
    state.value = { status: 'error' }
  } finally {
    deciding.value = false
  }
}

function backToApp(): void {
  void router.replace('/')
}

void start()
</script>

<style scoped lang="sass">
// Same full-screen interstitial as JoinCalendarPage — a screen the user passes through, not a
// place in the app.
.oauth-consent
  min-height: 100%
  display: grid
  place-items: center
  background: var(--cd-surface-page)
  color: #292820
  padding: 20px 0

.oauth-consent__panel
  width: min(440px, calc(100vw - 32px))
  border: 1px solid rgba(41, 40, 32, .16)
  border-radius: 8px
  background: rgba(255, 255, 255, .56)
  padding: 28px

  h1
    margin: 0 0 12px
    font-size: 24px
    line-height: 1.15

  p
    margin: 0 0 8px
    color: #68685f

  code
    font-size: 13px
    overflow-wrap: anywhere

.oauth-consent__eyebrow
  margin-bottom: 12px !important
  font-size: 12px
  font-weight: 700
  letter-spacing: .08em
  text-transform: uppercase
  color: #817d6f !important

.oauth-consent__list
  margin: 0 0 14px
  padding-left: 20px
  color: #292820
  line-height: 1.45

  li + li
    margin-top: 4px

.oauth-consent__list--no
  color: #68685f

.oauth-consent__fine
  font-size: 13px

.oauth-consent__actions
  display: flex
  gap: 10px
  justify-content: flex-end
  margin-top: 20px

.oauth-consent__action
  margin-top: 20px
  padding: 10px 18px
  border: 1px solid rgba(41, 40, 32, .2)
  border-radius: 8px
  background: rgba(255, 255, 255, .72)
  color: #292820
  font-size: 14px
  font-weight: 700
  cursor: pointer
  transition: background .15s ease

  .oauth-consent__actions &
    margin-top: 0

  &:hover:not(:disabled)
    background: #ffffff

  &:disabled
    opacity: .5
    cursor: default

.oauth-consent__action--primary
  background: #292820
  border-color: #292820
  color: #ffffff

  &:hover:not(:disabled)
    background: #000000
</style>
