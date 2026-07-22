<template>
  <div class="app-shell-chrome">
    <div class="app-shell-chrome__desktop">
      <CdTopbar
        :active-view="activeViewLabel"
        :avatar-src="auth.avatarUrl"
        @update:active-view="onActiveViewLabel"
        @open-settings="ui.settingsOpen = true"
        @open-journal="ui.draftDrawer = true"
        @open-assistant="ui.assistantOpen = true"
        @create-task="onCreateTask"
      />
    </div>

    <div class="app-shell-chrome__phone">
      <CdBottomNav
        :active-view="ui.activeView"
        :avatar-src="auth.avatarUrl"
        :avatar-name="auth.displayName"
        @update:active-view="onPhoneActiveView"
        @open-assistant="openPhoneAssistant"
        @open-journal="openPhoneJournal"
        @open-settings="openPhoneSettings"
      />
      <CdFab @click="onCreateTask" />
    </div>
  </div>
</template>

<script setup lang="ts">
// AppShellChrome — feature-layer composition of the desktop topbar and phone bottom-nav+FAB, per
// design.md "Pure presentational ui layer with feature-layer composition" and "Replacement proceeds
// shell-first". This is the ONLY place in tasks 2.1/2.2 that imports the ui-store; CdTopbar/
// CdBottomNav/CdFab stay pure props/emits components.
//
// Both `.app-shell-chrome__desktop` and `.app-shell-chrome__phone` always mount; the scoped
// stylesheet below toggles `display` at the shared breakpoint so exactly one is visible at a time.
// This is deliberate, not an oversight: a JS viewport check (matchMedia / window.innerWidth) would
// need a resize listener and a hydration-safe initial value, whereas plain CSS satisfies "no FAB/
// bottom-nav at or above the breakpoint" and "no topbar below it" with zero JS branching — matching
// how CdTopbar already avoids JS-driven layout decisions.
//
// CdCalStrip lives in MonthView.vue instead, directly under its month-label header on both
// desktop and phone — matching the handoff's monthPoster ordering (nav strip -> calStrip -> grid),
// which AppShellChrome's old "CdCalStrip above CdTopbar's month label" placement did not.
//
// Mounted unconditionally into IndexPage.vue (tasks 3.1/4.2/4.3): Month, Day, and Week are all
// now rebuilt against the new design, so every view body under this chrome is new, matching
// design.md's "a view is either fully old or fully new."
import { computed } from 'vue'
import { useUiStore, type ActiveView } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTasksStore } from '@/stores/tasks-store'
import CdTopbar from '@/components/ui/CdTopbar.vue'
import CdBottomNav from '@/components/ui/CdBottomNav.vue'
import CdFab from '@/components/ui/CdFab.vue'

const ui = useUiStore()
const auth = useAuthStore()
const tasksStore = useTasksStore()

// CdTopbar's CdViewSwitcher speaks Title-Case labels ('Day'/'Week'/'Month'); the store speaks
// lowercase ActiveView. This mapping is local to the composition layer per the pure-ui-layer
// contract — CdTopbar itself must not know about the store's value shape.
const VIEW_LABELS: Record<ActiveView, string> = { day: 'Day', week: 'Week', month: 'Month' }
const LABEL_VIEWS: Record<string, ActiveView> = { Day: 'day', Week: 'week', Month: 'month' }

const activeViewLabel = computed(() => VIEW_LABELS[ui.activeView])

function onActiveViewLabel(label: string): void {
  const view = LABEL_VIEWS[label]
  if (view) ui.activeView = view
}

// Gates the topbar Create pill / mobile FAB — the two entry points AppShellChrome owns — against
// the load-window race documented in the events-supabase-sync plan: a task created before
// loadFromRemote resolves would either be silently dropped (syncCtx not yet set) or wiped out by
// the incoming full-replace fetch result.
function onCreateTask(): void {
  if (tasksStore.isLoading) return
  ui.createOpen = true
}

function closePhoneFullscreenPanels(): void {
  ui.draftDrawer = false
  ui.draftConv = null
  ui.assistantOpen = false
  ui.settingsOpen = false
  ui.settingsPane = 'root'
}

function onPhoneActiveView(value: string): void {
  const view = value as ActiveView
  closePhoneFullscreenPanels()
  ui.activeView = view
}

function openPhoneAssistant(): void {
  closePhoneFullscreenPanels()
  ui.assistantOpen = true
}

function openPhoneJournal(): void {
  closePhoneFullscreenPanels()
  ui.draftDrawer = true
}

function openPhoneSettings(): void {
  closePhoneFullscreenPanels()
  ui.settingsOpen = true
}
</script>

<style scoped lang="sass">
@import '../../css/breakpoints.sass'

.app-shell-chrome
  display: contents

// Desktop topbar/cal-strip render by default; hidden below the shared breakpoint so it never
// overlaps the phone chrome. $cd-bp-desktop is the same token src/css/cadence-tokens.css documents
// as --cd-bp-desktop — CSS custom properties cannot parameterize @media queries (design.md), so this
// Sass variable is the single source every component's stylesheet must import instead of a literal.
.app-shell-chrome__desktop
  display: flex
  flex-direction: column

  @media (max-width: $cd-bp-desktop - 1px)
    display: none

// Phone bottom-nav/FAB render only below the breakpoint. Fixed to the viewport bottom (task 3.1):
// CdBottomNav is a plain in-flow <nav> and CdFab is `position: absolute` expecting a positioned
// ancestor sized to clear the nav bar (its `bottom: 104px` floats above that bar) — `display: contents`
// alone left both floating in document flow above whatever view rendered first. This wrapper is that
// positioned ancestor: fixed spans the full viewport width and pins to the bottom edge, giving the
// FAB's absolute offsets a stable containing block while CdBottomNav lays out normally inside it.
.app-shell-chrome__phone
  display: none

  @media (max-width: $cd-bp-desktop - 1px)
    display: block
    position: fixed
    left: 0
    right: 0
    bottom: 0
    z-index: 40
</style>
