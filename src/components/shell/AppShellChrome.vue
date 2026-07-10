<template>
  <div class="app-shell-chrome">
    <div class="app-shell-chrome__desktop">
      <CdTopbar
        :active-view="activeViewLabel"
        @update:active-view="onActiveViewLabel"
        @open-settings="ui.settingsOpen = true"
        @open-journal="ui.draftDrawer = true"
        @open-assistant="ui.assistantOpen = true"
        @create-task="ui.createOpen = true"
      />
      <CdCalStrip :calendars="placeholderCalendars" :selected="selectedCalendarIds" @toggle="onToggleCalendar" />
    </div>

    <div class="app-shell-chrome__phone">
      <CdBottomNav
        :active-view="ui.activeView"
        @update:active-view="(v) => (ui.activeView = v as ActiveView)"
        @open-assistant="ui.assistantOpen = true"
        @open-journal="ui.draftDrawer = true"
        @open-settings="ui.settingsOpen = true"
      />
      <CdFab @click="ui.createOpen = true" />
    </div>
  </div>
</template>

<script setup lang="ts">
// AppShellChrome — feature-layer composition of the desktop topbar+cal-strip and phone
// bottom-nav+FAB, per design.md "Pure presentational ui layer with feature-layer composition" and
// "Replacement proceeds shell-first". This is the ONLY place in tasks 2.1/2.2 that imports the
// ui-store; CdTopbar/CdCalStrip/CdBottomNav/CdFab stay pure props/emits components.
//
// Both `.app-shell-chrome__desktop` and `.app-shell-chrome__phone` always mount; the scoped
// stylesheet below toggles `display` at the shared breakpoint so exactly one is visible at a time.
// This is deliberate, not an oversight: a JS viewport check (matchMedia / window.innerWidth) would
// need a resize listener and a hydration-safe initial value, whereas plain CSS satisfies "no FAB/
// bottom-nav at or above the breakpoint" and "no topbar/cal-strip below it" with zero JS branching —
// matching how CdTopbar/CdCalStrip already avoid JS-driven layout decisions.
//
// Mounted into IndexPage.vue only when `ui.activeView === 'month'` (task 3.1): Month is the first
// rebuilt view, so the new shell now has a live screen underneath it. Day/Week still render behind
// the legacy AppTopbar until tasks 4.2/4.3 rebuild them, per design.md's "a view is either fully old
// or fully new" — swapping every view to this chrome at once would run the new shell above two
// legacy view bodies with no design mandate to do so.
import { computed } from 'vue'
import { useUiStore, type ActiveView } from '@/stores/ui-store'
import CdTopbar from '@/components/ui/CdTopbar.vue'
import CdCalStrip, { type CalStripCalendar } from '@/components/ui/CdCalStrip.vue'
import CdBottomNav from '@/components/ui/CdBottomNav.vue'
import CdFab from '@/components/ui/CdFab.vue'

const ui = useUiStore()

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

// Placeholder calendar-filter data — no calendars-store exists yet (task 8.1 adds `Calendar` type
// and `calendars-store` per design.md's Interface/data shape section). This static single-entry list
// only exercises CdCalStrip's layout/rendering; task 8.1 replaces it with live store data and task
// 7.3 wires reordering/visibility. `selectedCalendarIds` mirrors `placeholderCalendars` so the strip
// renders every chip "on" by default (no calendar is excluded before real visibility state exists).
const placeholderCalendars: CalStripCalendar[] = [{ id: 'placeholder-all', name: 'All events', iconSvg: '' }]
const selectedCalendarIds = computed(() => placeholderCalendars.map((c) => c.id))

function onToggleCalendar(_id: string): void {
  // No-op until calendars-store (task 8.1) exists: there is nowhere yet to persist a toggled-off
  // calendar, and design.md scopes visibility filtering to task 7.3. Intentionally not wired further.
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
// ancestor sized to clear the nav bar (its `bottom: 86px` assumes exactly that) — `display: contents`
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
