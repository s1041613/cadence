<template>
  <div class="join-calendar">
    <div class="join-calendar__panel">
      <p class="join-calendar__eyebrow">Cadence</p>
      <h1>{{ statusTitle }}</h1>
      <p>{{ statusText }}</p>
      <button v-if="state === 'invalid'" type="button" class="join-calendar__action" @click="backToApp">
        Back to Cadence
      </button>
      <button v-else-if="state === 'error'" type="button" class="join-calendar__action" @click="start">
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useTasksStore } from '@/stores/tasks-store'
import { acceptInvite } from '@/services/invites-service'
import { reorderCalendars } from '@/services/calendars-service'
import { savePostLoginRedirect } from '@/lib/post-login-redirect'
import { runJoinFlow } from './join-calendar-core'

// Thin wiring around join-calendar-core's runJoinFlow — all branch logic lives (and is tested)
// there; this page only supplies deps and renders the joining/invalid/error states.

// Same safety net as AuthCallbackPage: never spin forever if the boot data sync stalls.
const LOAD_TIMEOUT_MS = 8000

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const calendarsStore = useCalendarsStore()
const tasksStore = useTasksStore()

type PageState = 'joining' | 'invalid' | 'error'
const state = ref<PageState>('joining')

const statusTitle = computed(() => {
  if (state.value === 'invalid') return 'Invite not available'
  if (state.value === 'error') return "Couldn't join the calendar"
  return 'Joining calendar'
})
const statusText = computed(() => {
  if (state.value === 'invalid') return 'This invite link is invalid or has expired.'
  if (state.value === 'error') return 'Something went wrong. Check your connection and try again.'
  return 'Please wait.'
})

let stopLoadedWatch: (() => void) | null = null

function waitForCalendarsLoaded(): Promise<boolean> {
  if (calendarsStore.isLoaded) return Promise.resolve(true)
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      stop()
      resolve(false)
    }, LOAD_TIMEOUT_MS)
    const stop = watch(
      () => calendarsStore.isLoaded,
      (loaded) => {
        if (!loaded) return
        clearTimeout(timeoutId)
        stop()
        resolve(true)
      }
    )
    stopLoadedWatch = stop
  })
}

// accept_invite leaves the new membership at position 0 (colliding with the user's first
// calendar), so after reloading we persist the fetched display order once — the reorder RPC
// re-derives unique positions. Awaited directly at the service layer (not through the store's
// fire-and-forget queue) so a failure lands in the join page's error/Retry state before events
// reload and navigation.
async function reloadAfterJoin(userId: string): Promise<void> {
  const defaultId = calendarsStore.defaultCalendarId
  if (defaultId === null) return
  await calendarsStore.loadFromRemote(userId, defaultId)
  const orderedIds = [...calendarsStore.calendars].sort((a, b) => a.order - b.order).map((c) => c.id)
  await reorderCalendars(orderedIds)
  await tasksStore.loadFromRemote(userId, defaultId, orderedIds)
}

async function start(): Promise<void> {
  state.value = 'joining'
  const token = String(route.params.token ?? '')
  const result = await runJoinFlow(token, route.fullPath, {
    getCurrentUserId: () => auth.user?.id ?? null,
    waitForCalendarsLoaded,
    acceptInvite,
    reloadAfterJoin,
    savePostLoginRedirect,
    navigate: (path) => void router.replace(path)
  })
  if (result.status === 'invalid') state.value = 'invalid'
  else if (result.status === 'error') state.value = 'error'
  else if (result.status === 'stale') void router.replace('/')
  // success and login-redirect both navigate away inside the flow
}

function backToApp(): void {
  void router.replace('/')
}

void start()

onBeforeUnmount(() => {
  stopLoadedWatch?.()
})
</script>

<style scoped lang="sass">
// Mirrors AuthCallbackPage's panel styling — both are full-screen interstitials on the same
// parchment background.
.join-calendar
  min-height: 100svh
  display: grid
  place-items: center
  background: #eeebe1
  color: #292820

.join-calendar__panel
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

.join-calendar__eyebrow
  margin-bottom: 12px !important
  font-size: 12px
  font-weight: 700
  letter-spacing: .08em
  text-transform: uppercase
  color: #817d6f !important

.join-calendar__action
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
