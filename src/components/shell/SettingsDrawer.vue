<template>
  <CdDrawerOrSheet
    v-if="ui.settingsOpen"
    :presentation="isDesktop ? 'drawer' : 'sheet'"
    side="left"
    width="min(440px, 46%)"
    scrim-color="var(--cd-scrim-light)"
    sheet-fullscreen
    @scrim-click="close"
    @dismiss="close"
  >
    <CdSettingsDrawer
      :active-pane="ui.settingsPane"
      :email="auth.user?.email ?? ''"
      :avatar-src="auth.avatarUrl"
      :gcal-connected="gcalConnected"
      :first-day="settings.firstDay"
      timezone="Asia/Taipei (+08:00)"
      theme="Auto"
      :month-event-label="settings.monthEventLabel"
      :show-photo="settings.showPhoto"
      :monthly-photos="settings.monthlyPhotos"
      :notif-events="notifEvents"
      :notif-agenda="notifAgenda"
      :notif-assistant="notifAssistant"
      :analytics="analytics"
      :crash-reports="crashReports"
      :lock-screen-titles="lockScreenTitles"
      :calendars="sortedCalendars"
      :default-calendar-id="calendars.defaultCalendarId"
      :visible-calendar-ids="visibleCalendarIds"
      :members="members"
      :sheet-mode="!isDesktop"
      @close="close"
      @back="goBack"
      @navigate="onNavigate"
      @open-calendar-detail="onOpenCalendarDetail"
      @logout="onLogout"
      @update:gcal-connected="(v) => (gcalConnected = v)"
      @update:first-day="(v) => (settings.firstDay = v as FirstDay)"
      @update:month-event-label="(v) => (settings.monthEventLabel = v)"
      @update:show-photo="(v) => (settings.showPhoto = v)"
      @set-month-photo="(monthIndex, photo) => (settings.monthlyPhotos[monthIndex] = photo)"
      @create-calendar="onCreateCalendar"
      @rename-calendar="(id, name) => calendars.renameCalendar(id, name)"
      @recolor-calendar="(id, color) => calendars.recolorCalendar(id, color)"
      @set-calendar-icon="(id, icon) => calendars.setCalendarIcon(id, icon)"
      @set-calendar-cover="(id, cover) => calendars.setCalendarCover(id, cover)"
      @remove-calendar="(id) => calendars.removeCalendar(id)"
      @reorder-calendars="(ids) => calendars.reorderCalendars(ids)"
      @toggle-calendar-visibility="(id) => calendars.toggleVisibility(id)"
      @update:notif-events="(v) => (notifEvents = v)"
      @update:notif-agenda="(v) => (notifAgenda = v)"
      @update:notif-assistant="(v) => (notifAssistant = v)"
      @update:analytics="(v) => (analytics = v)"
      @update:crash-reports="(v) => (crashReports = v)"
      @update:lock-screen-titles="(v) => (lockScreenTitles = v)"
    />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdSettingsDrawer from '@/components/ui/CdSettingsDrawer.vue'
import { useUiStore, type SettingsPane } from '@/stores/ui-store'
import { useSettingsStore, type FirstDay } from '@/stores/settings-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useAuthStore } from '@/stores/auth-store'
import { notifySyncError } from '@/lib/notify'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { fetchMembers } from '@/services/calendars-service'
import type { CalendarMember } from '@/types/calendar'

// SettingsDrawer — feature-layer composition for the Settings overlay (design.md "7.1 Build the
// Settings drawer with stacked pane navigation"), wiring the pure ui/CdSettingsDrawer content into
// the same CdDrawerOrSheet convention every other overlay uses (DraftDrawer.vue is the precedent).
// Account/notifications/privacy/gcal-connection fields have no backing store per the proposal's
// Non-Goals ("Google Calendar real sync... ship as static shells") — they live as local refs here,
// the same static-shell treatment CdAssistantDrawer's greeting/chips already get.
const ui = useUiStore()
const settings = useSettingsStore()
const calendars = useCalendarsStore()
const auth = useAuthStore()
const router = useRouter()
const { isDesktop } = useBreakpoint()

const sortedCalendars = computed(() => [...calendars.calendars].sort((a, b) => a.order - b.order))
const visibleCalendarIds = computed(() => calendars.calendars.filter((c) => calendars.isVisible(c.id)).map((c) => c.id))

function onCreateCalendar(draft: { name: string; color: string; icon: string | null; cover: string | null }): void {
  const calendar = calendars.addCalendar(draft.name, draft.color)
  calendars.setCalendarIcon(calendar.id, draft.icon)
  calendars.setCalendarCover(calendar.id, draft.cover)
}

// Roster for the calendar detail pane. Held here (not in CdSettingsDrawer) because it's fetched
// data, not draft-editing UI state. draftEditId tracks which calendar's members are loaded, purely
// so the stale-response guard below can tell an in-flight fetch for a since-closed/switched
// calendar apart from the current one.
const draftEditId = ref<string | null>(null)
const members = ref<CalendarMember[]>([])

async function onOpenCalendarDetail(id: string): Promise<void> {
  draftEditId.value = id
  members.value = []
  const fetched = await fetchMembers(id)
  if (draftEditId.value !== id) return
  members.value = fetched
}

// Clears the roster once the detail pane is no longer showing, so a later re-open of a different
// calendar never flashes the previous one's members before its own fetch resolves.
function resetCalendarDetail(): void {
  draftEditId.value = null
  members.value = []
}

// Static-shell state (no backend, no persistence — matches CdAssistantDrawer's precedent).
const gcalConnected = ref(false)
const notifEvents = ref(true)
const notifAgenda = ref(true)
const notifAssistant = ref(true)
const analytics = ref(true)
const crashReports = ref(true)
const lockScreenTitles = ref(true)

// Calendar detail nests one level under calendars, so back from it returns to the calendars list
// rather than all the way to root.
function goBack(): void {
  if (ui.settingsPane === 'calendarDetail') resetCalendarDetail()
  ui.settingsPane = ui.settingsPane === 'calendarDetail' ? 'calendars' : 'root'
}

function onNavigate(pane: SettingsPane): void {
  if (ui.settingsPane === 'calendarDetail' && pane !== 'calendarDetail') resetCalendarDetail()
  ui.settingsPane = pane
}

function close(): void {
  resetCalendarDetail()
  ui.settingsOpen = false
  ui.settingsPane = 'root'
}

async function onLogout(): Promise<void> {
  close()
  await auth.signOut()
  if (auth.isSignedIn) {
    notifySyncError('登出失敗', () => void onLogout())
    return
  }
  // The router guard only runs on navigation, so a signed-out SPA parked on '/'
  // has to be pushed to the login page explicitly.
  await router.push('/login')
}
</script>
