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
      email="chloe.rivera@gmail.com"
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
      :default-calendar-id="DEFAULT_CALENDAR_ID"
      :visible-calendar-ids="visibleCalendarIds"
      :sheet-mode="!isDesktop"
      @close="close"
      @back="goBack"
      @navigate="(pane) => (ui.settingsPane = pane)"
      @logout="close"
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
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdSettingsDrawer from '@/components/ui/CdSettingsDrawer.vue'
import { useUiStore } from '@/stores/ui-store'
import { useSettingsStore, type FirstDay } from '@/stores/settings-store'
import { useCalendarsStore, DEFAULT_CALENDAR_ID } from '@/stores/calendars-store'
import { useBreakpoint } from '@/composables/use-breakpoint'

// SettingsDrawer — feature-layer composition for the Settings overlay (design.md "7.1 Build the
// Settings drawer with stacked pane navigation"), wiring the pure ui/CdSettingsDrawer content into
// the same CdDrawerOrSheet convention every other overlay uses (DraftDrawer.vue is the precedent).
// Account/notifications/privacy/gcal-connection fields have no backing store per the proposal's
// Non-Goals ("Google Calendar real sync... ship as static shells") — they live as local refs here,
// the same static-shell treatment CdAssistantDrawer's greeting/chips already get.
const ui = useUiStore()
const settings = useSettingsStore()
const calendars = useCalendarsStore()
const { isDesktop } = useBreakpoint()

const sortedCalendars = computed(() => [...calendars.calendars].sort((a, b) => a.order - b.order))
const visibleCalendarIds = computed(() => calendars.calendars.filter((c) => calendars.isVisible(c.id)).map((c) => c.id))

function onCreateCalendar(draft: { name: string; color: string; icon: string | null; cover: string | null }): void {
  const calendar = calendars.addCalendar(draft.name, draft.color)
  calendars.setCalendarIcon(calendar.id, draft.icon)
  calendars.setCalendarCover(calendar.id, draft.cover)
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
  ui.settingsPane = ui.settingsPane === 'calendarDetail' ? 'calendars' : 'root'
}

function close(): void {
  ui.settingsOpen = false
  ui.settingsPane = 'root'
}
</script>
