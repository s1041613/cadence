<template>
  <div v-if="draft && fromCreate && isDesktop" class="task-editor-dock-root">
    <div class="task-editor-dock-root__panel">
      <CdEventEditCard
        is-new
        :title="draft.title"
        :type="editType"
        :quad="editQuad"
        :color="draft.backgroundColor ?? FALLBACK_EVENT_COLOR"
        :icon="draft.icon"
        :all-day="draft.allDay"
        :date-label="dateLabel"
        :start="draft.start"
        :end="draft.end"
        :alert-label="alertLabel"
        :repeat-label="repeatLabel"
        :location="draft.location"
        :notes="draft.notes"
        :estimated-pomodoros="estimatedPomodoros"
        :time-format="settings.timeFormat"
        :calendar-options="calendarOptions"
        :calendar-id="draft.calendarId"
        @update:calendar-id="(v) => (draft!.calendarId = v)"
        @back="close"
        @close="close"
        @cancel="close"
        @save="trySave"
        @update:title="(v) => (draft!.title = v)"
        @update:type="onUpdateType"
        @update:quad="onUpdateQuad"
        @update:color="(v) => (draft!.backgroundColor = v)"
        @update:icon="(v) => (draft!.icon = v)"
        @remove-icon="draft!.icon = null"
        @update:all-day="(v) => (draft!.allDay = v)"
        @update:start="(v) => (draft!.start = v)"
        @update:end="(v) => (draft!.end = v)"
        @update:location="(v) => (draft!.location = v)"
        @update:notes="(v) => (draft!.notes = v)"
        @cycle-repeat="cycleRepeat"
      />
    </div>
  </div>
  <CdDrawerOrSheet
    v-else-if="draft"
    :presentation="isDesktop ? 'drawer' : 'sheet'"
    :width="editorWidth"
    scrim-color="var(--cd-scrim-strong)"
    :raised="!!ui.draftConv"
    @scrim-click="close"
    @dismiss="close"
  >
    <CdEventEditCard
      is-new
      :title="draft.title"
      :type="editType"
      :quad="editQuad"
      :color="draft.backgroundColor ?? FALLBACK_EVENT_COLOR"
      :icon="draft.icon"
      :all-day="draft.allDay"
      :date-label="dateLabel"
      :start="draft.start"
      :end="draft.end"
      :alert-label="alertLabel"
      :repeat-label="repeatLabel"
      :location="draft.location"
      :notes="draft.notes"
      :estimated-pomodoros="estimatedPomodoros"
      :time-format="settings.timeFormat"
      :calendar-options="calendarOptions"
      :calendar-id="draft.calendarId"
      @update:calendar-id="(v) => (draft!.calendarId = v)"
      @back="close"
      @close="close"
      @cancel="close"
      @save="trySave"
      @cycle-repeat="cycleRepeat"
      @update:title="(v) => (draft!.title = v)"
      @update:type="onUpdateType"
      @update:quad="onUpdateQuad"
      @update:color="(v) => (draft!.backgroundColor = v)"
      @update:icon="(v) => (draft!.icon = v)"
      @remove-icon="draft!.icon = null"
      @update:all-day="(v) => (draft!.allDay = v)"
      @update:start="(v) => (draft!.start = v)"
      @update:end="(v) => (draft!.end = v)"
      @update:location="(v) => (draft!.location = v)"
      @update:notes="(v) => (draft!.notes = v)"
    />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdEventEditCard from '@/components/ui/CdEventEditCard.vue'
import { useUiStore } from '@/stores/ui-store'
import { useTasksStore, mkTask } from '@/stores/tasks-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { useInboxStore } from '@/stores/inbox-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { quadrantOf, themeOf } from '@/composables/use-theme'
import { autoPoms, parseISO } from '@/utils/convert-date-time'
import type { RepeatMode, Task } from '@/types/task'

// EventComposerOverlay — feature-layer composition for the handoff's New Event/Task edit card.
// Create, Draft schedule, and Quick Add "Details" all enter this same event-preview-style editor,
// not the larger prototype that looked like a full task detail drawer.
const ui = useUiStore()
const tasksStore = useTasksStore()
const calendarsStore = useCalendarsStore()
const inboxStore = useInboxStore()
const settings = useSettingsStore()
const { isDesktop } = useBreakpoint()

const fromCreate = ref(false)

const FALLBACK_EVENT_COLOR = '#6E839B'
const DEFAULT_START = '09:00'
const DEFAULT_END = '09:30'

const REPEAT_LABELS: Record<RepeatMode, string> = {
  none: 'Does not repeat',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month'
}
const REPEAT_CYCLE: RepeatMode[] = ['none', 'daily', 'weekly', 'monthly']

const draft = ref<Task | null>(null)
const isEditing = ref(false)

// CdEventEditCard's type/quad vocabulary ('event'|'task', quadrant key) is derived from the
// draft's Task fields (type: 'quadrant'|'event', important/urgent) at the read/write boundary,
// mirroring EventPreviewPopover's edit-state pattern.
const editType = computed<'event' | 'task'>(() => (draft.value?.type === 'event' ? 'event' : 'task'))
const editQuad = computed(() => (draft.value ? quadrantOf(draft.value).key : 'later'))

// All member calendars (own and shared) as picker options, in display order. The picker only
// renders for 2+ options; the draft defaults to the user's default calendar.
const calendarOptions = computed(() =>
  [...calendarsStore.calendars].sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, name: c.name }))
)

watch(
  () => ui.eventComposerInitialValues,
  (initialValues) => {
    if (initialValues === null) {
      draft.value = null
      fromCreate.value = false
      return
    }
    const existing = initialValues.id ? tasksStore.tasks.find((t) => t.id === initialValues.id) : undefined
    isEditing.value = existing !== undefined
    // DraftDrawer's seed (ui.eventComposerInitialValues from openSchedule) carries no calendarId —
    // this is the one mkTask call that has to supply it for every fresh-draft path, since
    // initialValues can come from either DraftDrawer or the plain topbar/FAB Create flow below.
    draft.value = existing
      ? { ...existing }
      : mkTask({ date: ui.selectedDate, calendarId: calendarsStore.defaultCalendarId!, ...initialValues })
    // CdTimeDropdown expects a valid 'HH:MM' — a new draft with no time context yet (e.g. Quick-Add's
    // month-cell escalation, which carries no clicked time) falls back to a sensible default rather
    // than the empty string mkTask() otherwise leaves in place. A task's time block always shows
    // regardless of the stored `allDay` flag; only an event can actually go all-day.
    const showsTimeFields = draft.value?.type === 'quadrant' || !draft.value?.allDay
    if (draft.value && showsTimeFields) {
      if (!draft.value.start) draft.value.start = DEFAULT_START
      if (!draft.value.end) draft.value.end = DEFAULT_END
    }
  },
  { immediate: true }
)

// The topbar Create pill / phone FAB set ui.createOpen (no date/time context, per design.md's
// "Creation entry points seed context from where they are invoked" — Create carries only today's
// selected date). Route it through the same editor seeding path so there is one state machine,
// tagged `fromCreate` to pick the docked desktop presentation.
watch(
  () => ui.createOpen,
  (open) => {
    if (!open) return
    fromCreate.value = true
    ui.eventComposerInitialValues = { date: ui.selectedDate }
  },
  { immediate: true }
)

const theme = computed(() =>
  draft.value ? themeOf(draft.value) : themeOf(mkTask({ date: ui.selectedDate, calendarId: calendarsStore.defaultCalendarId! }))
)
const dateLabel = computed(() => (draft.value ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(parseISO(draft.value.date)) : ''))
const estimatedPomodoros = computed(() => (draft.value ? autoPoms(draft.value) : 1))
const repeatLabel = computed(() => REPEAT_LABELS[draft.value?.repeat ?? 'none'])
const alertLabel = computed(() => 'No reminder')
const editorWidth = computed(() => (ui.draftConv ? 'min(440px, 46%)' : 'min(500px, 90%)'))

function onUpdateType(type: 'event' | 'task'): void {
  if (!draft.value) return
  draft.value.type = type === 'event' ? 'event' : 'quadrant'
  // Switching from an all-day event to a task reveals the time block (tasks always show it) —
  // fill the same defaults the initial seed uses if it's still empty.
  if (type === 'task') {
    if (!draft.value.start) draft.value.start = DEFAULT_START
    if (!draft.value.end) draft.value.end = DEFAULT_END
  }
}

function onUpdateQuad(quad: 'do' | 'plan' | 'quick' | 'later'): void {
  if (!draft.value) return
  draft.value.important = quad === 'do' || quad === 'plan'
  draft.value.urgent = quad === 'do' || quad === 'quick'
}

function cycleRepeat(): void {
  if (!draft.value) return
  const next = (REPEAT_CYCLE.indexOf(draft.value.repeat) + 1) % REPEAT_CYCLE.length
  draft.value.repeat = REPEAT_CYCLE[next]!
}

function trySave(): void {
  // Defensive second layer: covers the residual window where the composer was already open when
  // isLoading flipped back to true (e.g. a retried load after sign-in), same reasoning as
  // QuickAddPopover.onAdd's guard.
  if (!draft.value || tasksStore.isLoading) return
  draft.value.estimatedPomodoros = autoPoms(draft.value)
  tasksStore.saveTask(draft.value)
  inboxStore.completePromotion({ type: draft.value.type === 'event' ? 'event' : 'task', color: theme.value.backgroundColor, tag: 'Scheduled' })
  ui.eventComposerInitialValues = null
  ui.createOpen = false
  ui.draftConv = null
}

function close(): void {
  inboxStore.cancelPromotion()
  ui.eventComposerInitialValues = null
  ui.createOpen = false
  ui.draftConv = null
}

// task 7.5 "restyled start button that sets focusTaskId" — only offered while editing an existing
// task (isEditing), since a fresh unsaved draft has no id yet for FocusSession.vue to key off.
function startFocus(): void {
  if (!draft.value || !isEditing.value) return
  ui.focusTaskId = draft.value.id
  close()
}
</script>

<style scoped>
.task-editor-dock-root {
  position: absolute;
  inset: 0;
  z-index: 70;
  pointer-events: none;
}

.task-editor-dock-root__panel {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 388px;
  max-height: calc(100% - 48px);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 30px 64px -22px rgba(40, 38, 30, 0.5);
}

.task-editor-dock-root__panel :deep(.cd-edit-card) {
  width: 100%;
  max-height: calc(100dvh - 48px);
}

:deep(.cd-drawer .cd-edit-card) {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
}

/* .cd-sheet has no definite height (it shrink-wraps to content) — unlike .cd-drawer above, a
   height:100% here would resolve to auto and let the card's own height collapse to whatever the
   active Event/Task tab's content needs, which is exactly the per-tab height jump Zoe flagged
   (2026-07-11). Leaving the card's own fixed height (CdEventEditCard.vue) in control keeps the
   sheet's height stable across tabs. */
:deep(.cd-sheet .cd-edit-card) {
  width: 100%;
  border: none;
  border-radius: 0;
}
</style>
