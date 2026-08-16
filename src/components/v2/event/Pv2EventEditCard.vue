<template>
  <div class="pv2-edit-card">
    <button v-if="!isNew" type="button" class="pv2-edit-card__back" @click="emit('back')">‹ EDIT</button>

    <input
      ref="titleEl"
      class="pv2-edit-card__title"
      :value="title"
      :autofocus="isNew"
      :placeholder="isNew ? (type === 'task' ? 'Task name' : 'Event name') : 'Event name'"
      :role="suggestionsEnabled ? 'combobox' : undefined"
      :aria-expanded="suggestionsEnabled ? listboxRendered : undefined"
      :aria-controls="listboxRendered ? SUGGESTIONS_ID : undefined"
      :aria-autocomplete="suggestionsEnabled ? 'list' : undefined"
      :aria-activedescendant="activeDescendant"
      autocomplete="off"
      @input="onTitleInput"
      @click="onTitleActivate"
      @blur="closeSuggestions"
      @keydown="onTitleKeydown"
      @compositionstart="onCompositionStart"
      @compositionend="onTitleCompositionEnd"
    />

    <Pv2TitleSuggestions
      v-if="listboxRendered"
      :suggestions="suggestions"
      :active-index="activeIndex"
      :anchor="titleEl"
      :listbox-id="SUGGESTIONS_ID"
      @select="applySuggestion"
      @dismiss="dismissSuggestion"
      @dismiss-list="closeSuggestions"
      @update:active-index="(i) => (activeIndex = i)"
    />

    <div class="pv2-edit-card__scroll">
      <CdSegmented
        class="pv2-edit-card__type"
        :model-value="type"
        :options="[{ value: 'event', label: 'EVENT' }, { value: 'task', label: 'TASK' }]"
        @update:model-value="(v) => emit('update:type', v as 'event' | 'task')"
      />

      <div v-if="calendarOptions && calendarOptions.length > 1" class="pv2-edit-card__line">
        <span class="pv2-edit-card__label">CALENDAR</span>
        <select class="pv2-edit-card__select" :value="calendarId ?? ''" @change="emit('update:calendarId', ($event.target as HTMLSelectElement).value)">
          <option v-for="option in calendarOptions" :key="option.id" :value="option.id">{{ option.name }}</option>
        </select>
      </div>

      <div v-if="type === 'event'" class="pv2-edit-card__line">
        <span class="pv2-edit-card__label">ALL-DAY</span>
        <CdSwitch :model-value="allDay" size="34x19" @update:model-value="(v) => emit('update:allDay', v)" />
      </div>

      <div v-if="type === 'task'" class="pv2-edit-card__matrix">
        <div class="pv2-edit-card__matrix-head">
          <span>URGENT</span>
          <span>NOT URGENT</span>
        </div>
        <div class="pv2-edit-card__matrix-body">
          <div class="pv2-edit-card__matrix-axis">
            <span>IMPORTANT</span>
            <span>NOT</span>
          </div>
          <div class="pv2-edit-card__matrix-grid">
            <button
              v-for="q in matrixOptions"
              :key="q.k"
              type="button"
              class="pv2-edit-card__matrix-cell"
              :class="{ 'pv2-edit-card__matrix-cell--selected': quad === q.k }"
              :style="quad === q.k ? { background: quadColor(q.k), borderColor: quadColor(q.k) } : undefined"
              @click="emit('update:quad', q.k)"
            >
              <span>{{ q.l }}</span>
              <small>{{ q.s }}</small>
            </button>
          </div>
        </div>
      </div>

      <!-- Row + wheel share a wrapper: the wheel must span the card's full width rather than
           sit in the row's value column, and the wrapper doubles as the containment boundary
           for the outside-click that closes it. -->
      <div ref="startFieldEl" class="pv2-edit-card__time-field">
        <div class="pv2-edit-card__line pv2-edit-card__line--time">
          <span class="pv2-edit-card__label">STARTS</span>
          <div class="pv2-edit-card__time-controls">
            <CdDatePicker :model-value="date" @update:model-value="(v) => emit('update:date', v)" />
            <Pv2TimeChip
              v-if="!effectiveAllDay"
              :model-value="start"
              :open="openWheel === 'start'"
              ariaLabel="Start time"
              @open="openWheel = 'start'"
              @update:model-value="(v) => commitTime('start', v)"
            />
          </div>
        </div>
        <Pv2TimeWheel
          v-if="openWheel === 'start' && !effectiveAllDay"
          :model-value="start"
          aria-label="Start"
          @click="onWheelClick"
          @update:model-value="(v) => commitTime('start', v)"
        />
      </div>
      <div ref="endFieldEl" class="pv2-edit-card__time-field">
        <div class="pv2-edit-card__line pv2-edit-card__line--time">
          <span class="pv2-edit-card__label">ENDS</span>
          <div class="pv2-edit-card__time-controls">
            <CdDatePicker :model-value="date" @update:model-value="(v) => emit('update:date', v)" />
            <Pv2TimeChip
              v-if="!effectiveAllDay"
              :model-value="end"
              :open="openWheel === 'end'"
              ariaLabel="End time"
              @open="openWheel = 'end'"
              @update:model-value="(v) => commitTime('end', v)"
            />
          </div>
        </div>
        <Pv2TimeWheel
          v-if="openWheel === 'end' && !effectiveAllDay"
          :model-value="end"
          aria-label="End"
          @click="onWheelClick"
          @update:model-value="(v) => commitTime('end', v)"
        />
      </div>
      <p v-if="timeInvalid" class="pv2-edit-card__warning">End time must be after start time</p>
      <div v-else-if="type === 'task'" class="pv2-edit-card__estimate">
        <span class="pv2-edit-card__estimate-dot" :style="{ background: color }" />
        <span class="pv2-edit-card__estimate-count">{{ pomodoroCount }} pomodoros</span>
        <span class="pv2-edit-card__estimate-detail">25 min · 5 min</span>
      </div>

      <!-- Same wrapper pattern as the time fields above: the row keeps its own divider and
           the expanded list spans the card's full width instead of sitting in the row's
           value column, and the wrapper is the containment boundary for the outside-click. -->
      <div v-if="type === 'event'" ref="styleFieldEl" class="pv2-edit-card__style-field">
        <div class="pv2-edit-card__line">
          <span class="pv2-edit-card__label">STYLE</span>
          <button
            type="button"
            class="pv2-edit-card__style"
            aria-label="Edit colour"
            :aria-expanded="colorOpen"
            @click="colorOpen = !colorOpen"
          >
            <span class="pv2-edit-card__style-dot" :style="{ background: color }" />
            <span class="pv2-edit-card__style-name">{{ colorName ?? 'Custom' }}</span>
            <svg class="pv2-edit-card__more-icon" :class="{ 'pv2-edit-card__more-icon--open': colorOpen }" width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true">
              <path d="M1 1.5 L5.5 5.5 L10 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <Pv2ColorList
          v-if="colorOpen"
          :model-value="color"
          aria-label="Event colour"
          @pick="pickColor"
          @preview="(v) => emit('update:color', v)"
        />
      </div>

      <div class="pv2-edit-card__line pv2-edit-card__line--pill">
        <span class="pv2-edit-card__label">REMINDER</span>
        <CdReminderPill :model-value="reminder" @update:model-value="(v) => emit('update:reminder', v)" />
      </div>

      <button type="button" class="pv2-edit-card__more" @click="moreOpen = !moreOpen">
        <span class="pv2-edit-card__more-text">
          {{ moreOpen ? 'FEWER OPTIONS' : 'MORE OPTIONS' }}
          <svg class="pv2-edit-card__more-icon" :class="{ 'pv2-edit-card__more-icon--open': moreOpen }" width="11" height="7" viewBox="0 0 11 7" fill="none" aria-hidden="true">
            <path d="M1 1.5 L5.5 5.5 L10 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      </button>

      <div v-if="moreOpen" class="pv2-edit-card__more-body">
        <div class="pv2-edit-card__line pv2-edit-card__line--pill">
          <span class="pv2-edit-card__label">REPEAT</span>
          <CdRepeatPill :label="repeatLabel" @cycle="emit('cycleRepeat')" />
        </div>
        <label class="pv2-edit-card__line pv2-edit-card__inline-field">
          <span class="pv2-edit-card__label">LOCATION</span>
          <input class="pv2-edit-card__inline-input" :value="location" placeholder="Add location..." @input="emit('update:location', ($event.target as HTMLInputElement).value)" />
        </label>
        <label class="pv2-edit-card__line pv2-edit-card__inline-field">
          <span class="pv2-edit-card__label">NOTES</span>
          <textarea class="pv2-edit-card__inline-input pv2-edit-card__inline-input--notes" :value="notes" placeholder="Add notes..." rows="1" @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)" />
        </label>
      </div>
    </div>

    <div class="pv2-edit-card__footer">
      <button v-if="isNew" type="button" class="pv2-edit-card__delete" @click="emit('cancel')">CANCEL</button>
      <button v-else type="button" class="pv2-edit-card__delete" @click="emit('delete')">
        <CdIcon name="trash" :size="14" color="var(--cd-danger-hover)" />
        DELETE
      </button>
      <button type="button" class="pv2-edit-card__save" :disabled="timeInvalid" @click="!timeInvalid && emit('save')">
        {{ isNew ? 'Add' : 'Save' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import Pv2TitleSuggestions from './Pv2TitleSuggestions.vue'
import CdDatePicker from '@/components/ui/CdDatePicker.vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import CdReminderPill from '@/components/ui/CdReminderPill.vue'
import CdRepeatPill from '@/components/ui/CdRepeatPill.vue'
import CdSegmented from '@/components/ui/CdSegmented.vue'
import CdSwitch from '@/components/ui/CdSwitch.vue'
import Pv2ColorList from '@/components/v2/ui/Pv2ColorList.vue'
import Pv2TimeChip from '@/components/v2/ui/Pv2TimeChip.vue'
import Pv2TimeWheel from '@/components/v2/ui/Pv2TimeWheel.vue'
import { eventColorNameOf } from '@/components/v2/ui/event-colors'
import { estPomsOf, minutes, shiftRange, type TimeFormatName } from '@/utils/convert-date-time'
import { buildTitleSuggestions, type TitleSuggestion } from '@/utils/title-suggestions'
import { useImeSafeEnter } from '@/composables/use-ime-safe-enter'
import { QUADRANTS } from '@/composables/use-theme'
import { useAuthStore } from '@/stores/auth-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useTitleDismissalsStore } from '@/stores/title-dismissals-store'
import type { ReminderPreset } from '@/types/task'

const props = withDefaults(
  defineProps<{
    isNew: boolean
    title: string
    type: 'event' | 'task'
    quad: 'do' | 'plan' | 'quick' | 'later'
    color?: string
    allDay: boolean
    date: string
    start: string
    end: string
    alertLabel: string
    reminder: ReminderPreset | null
    repeatLabel: string
    location: string
    notes: string
    estimatedPomodoros?: number
    timeFormat?: TimeFormatName
    calendarOptions?: Array<{ id: string; name: string }>
    calendarId?: string | null
  }>(),
  { color: '#E3A75C', timeFormat: '24-Hour', calendarId: null }
)

const emit = defineEmits<{
  back: []
  cancel: []
  delete: []
  save: []
  'update:title': [value: string]
  'update:type': [value: 'event' | 'task']
  'update:quad': [value: 'do' | 'plan' | 'quick' | 'later']
  'update:color': [value: string]
  'update:allDay': [value: boolean]
  'update:date': [value: string]
  'update:start': [value: string]
  'update:end': [value: string]
  'update:reminder': [value: ReminderPreset | null]
  'update:location': [value: string]
  'update:notes': [value: string]
  cycleRepeat: []
  'update:calendarId': [value: string]
  applySuggestion: [suggestion: TitleSuggestion]
}>()

const moreOpen = ref(false)
const colorOpen = ref(false)

// Which time wheel is expanded. Only one at a time: the card is fixed-height, and two open
// wheels would push the footer out of reach.
const openWheel = ref<'start' | 'end' | null>(null)
const startFieldEl = ref<HTMLElement | null>(null)
const endFieldEl = ref<HTMLElement | null>(null)
const styleFieldEl = ref<HTMLElement | null>(null)

// Moving one edge carries the other, so the picker can't strand the user in the
// "end must be after start" state. shiftRange owns the arithmetic and the day-boundary clamp.
function commitTime(edge: 'start' | 'end', value: string): void {
  const next = shiftRange({ start: props.start, end: props.end }, edge, value)
  if (next.start !== props.start) emit('update:start', next.start)
  if (next.end !== props.end) emit('update:end', next.end)
}

// Deliberately NOT closed on the chip's blur: moving a finger from the chip to the wheel
// blurs the input, which would make the wheel vanish exactly when it is being used.
//
// Containment is tested against the row and the wheel's *columns*, not the wrapper: the
// wrapper is a full-width flex column and the wheel's root spans it too, but the wheel only
// paints a centred ~136px pair of columns. Testing the wrapper would count the wide blank
// gutters either side of the digits as "inside", so a click on obviously empty space would
// not dismiss it.
function onOutsideInteraction(e: Event): void {
  const target = e.target as Node
  const field = openWheel.value === 'start' ? startFieldEl.value : endFieldEl.value
  const row = field?.querySelector('.pv2-edit-card__line')
  const cols = field?.querySelector('.pv2-time-wheel__cols')
  if (row?.contains(target) || cols?.contains(target)) return
  openWheel.value = null
}

// Clicking the digits confirms the scrolled-to time and dismisses. The value is already
// committed on every snap, so there is nothing to save here — this only closes.
//
// Bound to `click` rather than the `mousedown` path above because a click fires only when
// press and release land on the same element: ending a scroll drag over the digits therefore
// does not count, and the wheel stays open mid-gesture.
function onWheelClick(): void {
  openWheel.value = null
}

watch(openWheel, async (v) => {
  if (v) {
    document.addEventListener('mousedown', onOutsideInteraction)
    document.addEventListener('touchstart', onOutsideInteraction)
    // The card scrolls internally and is height-capped, so a wheel opened near the bottom
    // can expand out of view.
    await nextTick()
    const field = v === 'start' ? startFieldEl.value : endFieldEl.value
    field?.scrollIntoView({ block: 'nearest' })
  } else {
    document.removeEventListener('mousedown', onOutsideInteraction)
    document.removeEventListener('touchstart', onOutsideInteraction)
  }
})

// Same containment rule as the wheel, on the STYLE wrapper: a click inside the list is a
// colour pick (which closes it itself), anything else outside dismisses.
function onOutsideColorInteraction(e: Event): void {
  if (styleFieldEl.value?.contains(e.target as Node)) return
  colorOpen.value = false
}

watch(colorOpen, async (v) => {
  if (v) {
    document.addEventListener('mousedown', onOutsideColorInteraction)
    document.addEventListener('touchstart', onOutsideColorInteraction)
    // The card scrolls internally and is height-capped, so a list opened near the bottom
    // can expand out of view.
    await nextTick()
    styleFieldEl.value?.scrollIntoView({ block: 'nearest' })
  } else {
    document.removeEventListener('mousedown', onOutsideColorInteraction)
    document.removeEventListener('touchstart', onOutsideColorInteraction)
  }
})

// Switching to a task hides the STYLE row entirely, which would otherwise leave the list's
// document listeners bound with no way to reach the row that owns them.
watch(() => props.type, (v) => { if (v !== 'event') colorOpen.value = false })

function pickColor(hex: string): void {
  emit('update:color', hex)
  colorOpen.value = false
}

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideInteraction)
  document.removeEventListener('touchstart', onOutsideInteraction)
  document.removeEventListener('mousedown', onOutsideColorInteraction)
  document.removeEventListener('touchstart', onOutsideColorInteraction)
})

// --- title suggestions ------------------------------------------------------
// Past events offered while naming a new one. Creation only: on an existing event the list would
// sit over the form every time the user fixes a typo.
const tasksStore = useTasksStore()
const dismissalsStore = useTitleDismissalsStore()
const auth = useAuthStore()
const { isComposing, onCompositionStart, onCompositionEnd } = useImeSafeEnter()

const SUGGESTIONS_ID = `pv2-title-suggestions-${useId()}`
const titleEl = ref<HTMLInputElement | null>(null)
const suggestionsOpen = ref(false)
const activeIndex = ref(-1)
// Frozen while an IME composition is in flight: mid-composition the input holds bopomofo or pinyin
// fragments, which match nothing and would blink the list shut between keystrokes.
const committedQuery = ref('')

// Offered for tasks as well as events: recurring chores ("吃飯", "倒垃圾") are retyped as often as
// recurring events, and when you type a title you're thinking of the words, not whether last time
// it was stored as an event or a task. The suggestion source stays events-only — a task carries no
// colour, icon or calendar, so those fields are simply dropped on the way in (see the hosts).
const suggestionsEnabled = computed(() => props.isNew)

const suggestions = computed<TitleSuggestion[]>(() => {
  if (!suggestionsEnabled.value) return []
  return buildTitleSuggestions(tasksStore.tasks, {
    ownerId: auth.user?.id,
    query: committedQuery.value,
    dismissed: dismissalsStore.dismissedKeys
  })
})

// Single source of truth for "is the listbox in the DOM". aria-controls and aria-expanded must
// agree with it exactly, or they point at an element that isn't there.
const listboxRendered = computed(
  () => suggestionsEnabled.value && suggestionsOpen.value && suggestions.value.length > 0
)

// No active row until the user arrows into the list, so Enter still saves the form rather than
// silently picking whatever happens to be first.
const activeDescendant = computed(() =>
  suggestionsEnabled.value && suggestionsOpen.value && activeIndex.value >= 0
    ? `${SUGGESTIONS_ID}-option-${activeIndex.value}`
    : undefined
)

function onTitleInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  emit('update:title', value)
  if (isComposing.value) return
  committedQuery.value = value
  activeIndex.value = -1
  suggestionsOpen.value = true
}

// compositionend fires before `input` in Safari and after it in Chrome, so read the element
// directly here rather than relying on the ordering.
function onTitleCompositionEnd(e: CompositionEvent): void {
  onCompositionEnd()
  const value = (e.target as HTMLInputElement).value
  emit('update:title', value)
  committedQuery.value = value
  activeIndex.value = -1
  suggestionsOpen.value = true
}

// Bound to `click`, not `focus`: `:autofocus="isNew"` focuses this field the moment the card
// mounts, which on phone is mid-way through the sheet's .3s cd-sheetUp slide. The list is
// teleported to <body> and positioned from a one-shot getBoundingClientRect of this input
// (Pv2TitleSuggestions), and a CSS transform fires none of the scroll/resize/visualViewport
// events that would re-measure it — so opening on that programmatic focus pinned the list to
// wherever the still-sliding sheet happened to be. Only the first open per page load was
// affected: the document's autofocus-processed flag makes `autofocus` a once-per-document
// affair, so later opens already waited for a real tap. A click is that real tap, by which
// point the sheet has settled. Typing still opens the list via onTitleInput.
function onTitleActivate(): void {
  committedQuery.value = props.title
  activeIndex.value = -1
  suggestionsOpen.value = true
}

function closeSuggestions(): void {
  suggestionsOpen.value = false
  activeIndex.value = -1
}

function onTitleKeydown(e: KeyboardEvent): void {
  // Never steal keys mid-composition: Enter and arrows belong to the IME candidate window.
  if (isComposing.value || e.isComposing) return
  if (!suggestionsEnabled.value) return

  const count = suggestions.value.length

  if (e.key === 'Escape' && suggestionsOpen.value) {
    e.stopPropagation()
    closeSuggestions()
    return
  }
  if (!suggestionsOpen.value || count === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = activeIndex.value >= count - 1 ? 0 : activeIndex.value + 1
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? count - 1 : activeIndex.value - 1
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    const picked = suggestions.value[activeIndex.value]
    if (picked) applySuggestion(picked)
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && activeIndex.value >= 0) {
    // Focus stays on the input for the whole interaction (aria-activedescendant, not roving focus),
    // so the row's ✕ button is never tabbable. This is the keyboard route to it.
    e.preventDefault()
    const picked = suggestions.value[activeIndex.value]
    if (picked) dismissSuggestion(picked)
  }
}

function applySuggestion(suggestion: TitleSuggestion): void {
  emit('applySuggestion', suggestion)
  committedQuery.value = suggestion.title
  closeSuggestions()
  // Dismiss the on-screen keyboard so the carried-over fields are visible on mobile.
  titleEl.value?.blur()
}

function dismissSuggestion(suggestion: TitleSuggestion): void {
  void dismissalsStore.dismiss(suggestion.key)
  activeIndex.value = -1
}

// Null for a colour outside the palette (an older event, a calendar's own colour); the
// trigger then shows the swatch with a neutral "Custom" label rather than a wrong name.
const colorName = computed(() => eventColorNameOf(props.color))

const effectiveAllDay = computed(() => (props.type === 'task' ? false : props.allDay))

// An all-day event must not leave an orphaned wheel behind after its chip is gone.
watch(effectiveAllDay, (v) => { if (v) openWheel.value = null })
const timeInvalid = computed(() => !effectiveAllDay.value && minutes(props.end) <= minutes(props.start))
// estPomsOf, not `?? autoPoms`: a stored 0 must fall through to the derived count, or the
// card shows 0 while the focus session shows the real total.
const pomodoroCount = computed(() =>
  estPomsOf({ estimatedPomodoros: props.estimatedPomodoros ?? 0, allDay: false, start: props.start, end: props.end })
)

// The selected cell fills with its own quadrant hue rather than the shared v2 ink, so the
// picker previews the colour the task will carry in the month/week/day views — the same
// treatment CdEventEditCard uses. Colours come from QUADRANTS (the authority) instead of a
// local copy, so a palette change reaches this card too. Unselected cells stay neutral.
const quadColor = (k: string): string =>
  QUADRANTS.find((q) => q.key === k)?.backgroundColor ?? '#9A988F'

const matrixOptions = [
  { k: 'do' as const, l: 'Do Now', s: 'Right away' },
  { k: 'plan' as const, l: 'Plan', s: 'Schedule it' },
  { k: 'quick' as const, l: 'Quick', s: 'Quick win' },
  { k: 'later' as const, l: 'Later', s: 'When free' }
]
</script>

<style scoped>
.pv2-edit-card {
  /* v2 palette — neutral ink-on-paper, not the app-wide warm-beige cd-* tokens.
     Mirrors the v2 month surface (Pv2Cell / Pv2Chip): near-black ink #1b1b1b,
     paper #fafaf9, cool neutral greys for lines and fills. Everything below is
     expressed through these locals so the whole card reads as one v2 surface. */
  --pv2-ink: #1b1b1b;
  --pv2-ink-2: #6e6e6e;
  --pv2-ink-3: #b2b2b2;
  --pv2-line: #e2e2e2;
  --pv2-line-strong: #cdcdcd;
  --pv2-fill: #f3f3f1;
  --pv2-fill-hover: #ececea;
  --pv2-paper: #fafaf9;

  --pv2-label-col: 92px;
  --pv2-gap: 12px;
  /* Shared row height for every __line, set by the tallest control on the card (the
     STARTS/ENDS date/time pills). See .pv2-edit-card__line for the derivation. */
  --pv2-row-h: 62.67px;
  /* Shared width for the REMINDER / REPEAT / CALENDAR value pills so they align as
     one column; wide enough for the longest preset label ("Does not repeat"). */
  --pv2-pill-w: 156px;
  width: 388px;
  height: min(640px, calc(100dvh - 24px));
  max-height: min(640px, calc(100dvh - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--pv2-line);
  border-radius: 8px;
  background: var(--pv2-paper);
  color: var(--pv2-ink);
}

@media (max-width: 899px) {
  .pv2-edit-card {
    width: 100%;
    border: none;
    border-radius: 0;
  }
}

.pv2-edit-card__back {
  align-self: flex-start;
  margin: 16px 18px 0;
  border: none;
  background: transparent;
  color: var(--pv2-ink-2);
  cursor: pointer;
  font: 700 11px var(--cd-font-ui);
  letter-spacing: 0.08em;
}

.pv2-edit-card__title {
  flex: none;
  width: calc(100% - 36px);
  margin: 12px 18px 0;
  padding: 0 0 14px;
  border: none;
  border-bottom: 1.5px solid var(--pv2-ink);
  outline: none;
  background: transparent;
  color: var(--pv2-ink);
  font: 500 32px/1.12 var(--cd-font-ui);
  letter-spacing: -0.01em;
}

.pv2-edit-card__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 0;
  scrollbar-width: thin;
}

.pv2-edit-card__type {
  margin-bottom: 12px;
}

/* Match the design's segmented control: a taller neutral-grey track wrapping a white,
   softly-outlined active pill, with uppercased mono labels on wide tracking so
   Event|Task reads like the card's other meta labels. Scoped via :deep so the
   shared CdSegmented stays untouched elsewhere. */
.pv2-edit-card__type:deep(.cd-segmented) {
  /* Same neutral fill as the pomodoro estimate chip (#F3F3F1) — overrides the shared
     CdSegmented's warm #f1efe8 track. Written literally rather than via --pv2-fill so
     the value resolves reliably across the :deep boundary. */
  background: #f3f3f1;
  border-radius: 14px;
  padding: 5px;
}

.pv2-edit-card__type:deep(.cd-segmented__btn) {
  padding: 11px 14px;
  border-radius: 10px;
  color: var(--pv2-ink-2);
  font-family: var(--cd-font-ui);
  font-size: 12px;
  letter-spacing: 0.12em;
}

.pv2-edit-card__type:deep(.cd-segmented__btn--active) {
  background: #fff;
  border: 1px solid var(--pv2-line);
  box-shadow: 0 1px 2px rgba(27, 27, 27, 0.08);
  color: var(--pv2-ink);
}

.pv2-edit-card__line {
  display: grid;
  grid-template-columns: var(--pv2-label-col) minmax(0, 1fr);
  align-items: center;
  gap: var(--pv2-gap);
  /* One shared height floor for every row (STYLE, ALL-DAY, STARTS/ENDS, and the
     MORE OPTIONS rows) so the dividers keep an even rhythm no matter which control
     a row holds. 62.67px is what the STARTS/ENDS rows measure naturally: 10px top +
     10px bottom padding around a 42.67px date/time pill (15.5px mono text + 9px
     vertical padding + 1px border, both sides). Expressed as a min-height rather
     than a fixed height so a row whose content grows — a wrapped value, or the NOTES
     textarea dragged taller — still expands instead of overflowing. */
  min-height: var(--pv2-row-h);
  padding: 10px 0;
  border-bottom: 1px solid var(--pv2-line);
}

.pv2-edit-card__line--time {
  align-items: start;
}

/* REMINDER / REPEAT pills, restyled to the design's white chip with a thin neutral
   border and a chevron affordance — the v2 palette, not the warm cd-* default.
   Scoped via :deep so the shared CdReminderPill / CdRepeatPill keep their own look
   elsewhere. */
.pv2-edit-card__line--pill:deep(.cd-reminder-pill),
.pv2-edit-card__line--pill:deep(.cd-repeat-pill) {
  border: 1px solid var(--pv2-line-strong);
  /* Square-round like the STARTS/ENDS time pills, not the components' default 999px
     ellipse — one radius family across every value control on the card. */
  border-radius: var(--cd-radius-sm);
  background: #fff;
  color: var(--pv2-ink);
  min-height: 36px;
  /* Shared width so REMINDER / REPEAT / CALENDAR line up as one column of equal
     pills — the shortest value ("None") stretches to the widest ("Does not repeat")
     instead of each pill hugging its own text. */
  min-width: var(--pv2-pill-w);
  justify-content: center;
}

.pv2-edit-card__line--pill:deep(.cd-reminder-pill:hover),
.pv2-edit-card__line--pill:deep(.cd-repeat-pill:hover) {
  background: var(--pv2-fill);
  border-color: var(--pv2-line-strong);
}

.pv2-edit-card__line--pill:deep(.cd-reminder-pill__text) {
  font-weight: 500;
}

.pv2-edit-card__line--pill:deep(.cd-repeat-pill) {
  padding: 9px 14px;
  font-weight: 500;
}

/* Every row's value (the non-label second column) hugs the right edge, matching the
   design: the ALL-DAY switch, REMINDER/REPEAT pills, and LOCATION/NOTES text all sit
   right. STYLE keeps its own justify-self:end below; time rows override to their own
   flex-end controls. */
.pv2-edit-card__line > :not(.pv2-edit-card__label) {
  justify-self: end;
}

.pv2-edit-card__label {
  font: 700 10px var(--cd-font-ui);
  letter-spacing: 0.06em;
  color: var(--pv2-ink-2);
}

.pv2-edit-card__matrix-head {
  font: 700 9px var(--cd-font-ui);
  letter-spacing: 0.12em;
  color: var(--pv2-ink-3);
}

/* The row keeps its own divider; the wrapper only groups it with the colour list below, so
   the list spans the card's width instead of sitting in the row's value column. Same shape
   as .pv2-edit-card__time-field. */
.pv2-edit-card__style-field {
  display: flex;
  flex-direction: column;
}

/* The style value reads as a pill, matching the design: a white rounded container holding
   the colour dot, the colour's name and a chevron affordance, echoing the STARTS/ENDS and
   REMINDER/REPEAT pills so the whole right column is one family — including their shared
   --pv2-pill-w width, so STYLE lines up with REMINDER/REPEAT/CALENDAR. */
.pv2-edit-card__style {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: var(--pv2-pill-w);
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid var(--pv2-line-strong);
  border-radius: var(--cd-radius-sm);
  background: #fff;
  color: var(--pv2-ink-3);
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.pv2-edit-card__style:hover {
  background: var(--pv2-fill-hover);
}

.pv2-edit-card__style-dot {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

/* Pushes the chevron to the pill's right edge, so the affordance sits where it does on the
   REMINDER/REPEAT pills regardless of how long the colour's name is. */
.pv2-edit-card__style-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  color: var(--pv2-ink);
  font: 500 13px var(--cd-font-ui);
}

.pv2-edit-card__matrix {
  --pv2-axis-col: 18px;
  padding: 7px 0 14px;
  border-bottom: 1px solid var(--pv2-line);
}

/* Both the column header and the grid below sit in the same two-track frame — an
   axis gutter on the left, then the 2-column quadrant area — so URGENT / NOT URGENT
   line up over their columns and IMPORTANT / NOT run down the left edge (the design's
   Eisenhower axes). */
.pv2-edit-card__matrix-head {
  display: grid;
  grid-template-columns: var(--pv2-axis-col) repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 8px;
  text-align: center;
}

/* Skip the axis gutter so the two labels land over the two quadrant columns. */
.pv2-edit-card__matrix-head span:first-child {
  grid-column-start: 2;
}

.pv2-edit-card__matrix-body {
  display: grid;
  grid-template-columns: var(--pv2-axis-col) minmax(0, 1fr);
  gap: 8px;
}

.pv2-edit-card__matrix-axis {
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
}

.pv2-edit-card__matrix-axis span {
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  letter-spacing: 0.12em;
  font: 700 9px var(--cd-font-ui);
  color: var(--pv2-ink-3);
}

.pv2-edit-card__matrix-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.pv2-edit-card__matrix-cell {
  min-height: 72px;
  border: 1px solid var(--pv2-line);
  border-radius: var(--cd-radius-matrix);
  background: #fff;
  color: var(--pv2-ink);
  cursor: pointer;
  text-align: left;
  padding: 12px;
  transition:
    background var(--cd-duration-micro-3),
    border-color var(--cd-duration-micro-3);
}

.pv2-edit-card__matrix-cell:hover:not(.pv2-edit-card__matrix-cell--selected) {
  background: var(--pv2-fill-hover);
  border-color: var(--pv2-line-strong);
}

.pv2-edit-card__matrix-cell span,
.pv2-edit-card__matrix-cell small {
  display: block;
}

.pv2-edit-card__matrix-cell span {
  font: 500 14px var(--cd-font-ui);
}

.pv2-edit-card__matrix-cell small {
  margin-top: 4px;
  color: var(--pv2-ink-2);
  font: 400 11px var(--cd-font-ui);
}

/* Selection = the quadrant's own hue, filled. Background and border come from the inline
   style in the template (see quadColor); only the type colours live here, since they are
   the same on all four hues. The subtitle sits at .82 alpha so it stays secondary to the
   title. On the paler hues (quick, later) white type lands under WCAG AA — an accepted
   trade for matching CdEventEditCard's treatment; darken the hues, not this rule, to fix. */
.pv2-edit-card__matrix-cell--selected {
  color: #fff;
}

.pv2-edit-card__matrix-cell--selected small {
  color: rgba(255, 255, 255, 0.82);
}

.pv2-edit-card__time-controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* Keep the date and time pills on one row, each hugging its own content (no stretch,
   no wrap) so they sit side by side and right-aligned, as in the design. */
.pv2-edit-card__time-controls:deep(.cd-date-picker) {
  flex: none;
}

/* STARTS/ENDS pills per the design: white fill with a thin neutral border, no
   calendar icon — just the mono date text in v2 ink. Scoped via :deep so the shared
   CdDatePicker keeps its own look everywhere else. The time chip is a v2 component and
   styles itself. */
.pv2-edit-card__time-controls:deep(.cd-date-picker__trigger) {
  border: 1px solid var(--pv2-line-strong);
  background: #fff;
  border-radius: var(--cd-radius-sm);
  padding: 9px 14px;
  color: var(--pv2-ink);
}

.pv2-edit-card__time-controls:deep(.cd-date-picker__trigger:hover) {
  background: var(--pv2-fill);
}

/* Neutralize the shared picker's olive open-state accent — off the v2 palette. */
.pv2-edit-card__time-controls:deep(.cd-date-picker__trigger--open) {
  border-color: var(--pv2-ink);
}

.pv2-edit-card__time-controls:deep(.cd-date-picker__trigger .cd-icon) {
  display: none;
}

/* The row keeps its own divider; the wrapper only groups it with the wheel below, so the
   wheel spans the card's width instead of sitting in the row's value column. */
.pv2-edit-card__time-field {
  display: flex;
  flex-direction: column;
}

.pv2-edit-card__warning {
  margin: 8px 0 0 calc(var(--pv2-label-col) + var(--pv2-gap));
  font: 700 12px var(--cd-font-ui);
  color: var(--cd-danger);
}

/* Pomodoro estimate as a full-width soft chip, matching the task design: color dot,
   bold count, and a mono detail cluster pushed to the right edge. */
.pv2-edit-card__estimate {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0 2px;
  padding: 14px 16px;
  border-radius: var(--cd-radius-editor-field);
  background: var(--pv2-fill);
}

.pv2-edit-card__estimate-dot {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.pv2-edit-card__estimate-count {
  font: 700 15px var(--cd-font-ui);
  color: var(--pv2-ink);
}

.pv2-edit-card__estimate-detail {
  margin-left: auto;
  font: 500 13px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  color: var(--pv2-ink-3);
}

/* MORE OPTIONS draws its own flanking hairlines, so the row directly above it must drop
   its divider or the two stack into a visible double rule. Written as a sibling selector
   rather than a modifier class so it keeps holding whichever row ends up last — the rows
   above are conditional (STYLE and ALL-DAY are event-only, CALENDAR needs 2+ calendars). */
.pv2-edit-card__line:has(+ .pv2-edit-card__more),
.pv2-edit-card__style-field:has(+ .pv2-edit-card__more) .pv2-edit-card__line,
.pv2-edit-card__time-field:has(+ .pv2-edit-card__more) .pv2-edit-card__line {
  border-bottom: none;
}

/* Same doubling against the footer, which keeps its own border-top as the anchor line that
   separates it from content scrolling underneath. The last row inside the scroll area drops
   its divider instead — :last-child on the row and on the expanded MORE OPTIONS body, since
   either can be what ends the scroll area depending on whether the section is open. */
.pv2-edit-card__scroll > .pv2-edit-card__line:last-child,
.pv2-edit-card__more-body:last-child > .pv2-edit-card__line:last-child {
  border-bottom: none;
}

/* Centered label flanked by hairlines, matching the design's "— FEWER OPTIONS ^ —"
   divider row (rather than a left-label / right-chevron bar). */
.pv2-edit-card__more {
  width: 100%;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--pv2-ink-2);
  cursor: pointer;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
}

.pv2-edit-card__more::before,
.pv2-edit-card__more::after {
  content: "";
  height: 1px;
  background: var(--pv2-line);
}

.pv2-edit-card__more-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.12em;
  font: 700 10px var(--cd-font-ui);
}

.pv2-edit-card__more-icon {
  display: block;
  flex: none;
  /* Optical nudge: the SVG box centers on the text's line box, but the uppercase
     mono cap-height sits above that, so lift the chevron a hair to line up with
     the letters' visual middle. */
  margin-top: -1px;
  transition: transform var(--cd-duration-micro-3);
}

.pv2-edit-card__more-icon--open {
  transform: rotate(180deg);
}

.pv2-edit-card__select {
  min-height: 36px;
  min-width: var(--pv2-pill-w);
  padding: 0 12px;
  border: 1px solid var(--pv2-line-strong);
  border-radius: var(--cd-radius-sm);
  background: #fff;
  color: var(--pv2-ink);
  font: 700 13px var(--cd-font-ui);
  text-align: center;
}

/* LOCATION / NOTES: right-aligned, frameless text that reads as a placeholder value,
   sharing the same __line row as the meta rows above (no boxed input/textarea). */
.pv2-edit-card__inline-input {
  border: none;
  outline: none;
  background: transparent;
  text-align: right;
  color: var(--pv2-ink);
  font: 700 14px var(--cd-font-ui);
}

.pv2-edit-card__inline-input::placeholder {
  color: var(--pv2-ink-3);
  opacity: 1;
}

/* NOTES is a textarea (multi-line notes) styled to look like the same frameless,
   right-aligned value as the other rows. field-sizing:content grows it with the text
   where supported; otherwise it starts one row tall and can be dragged taller.
   The row's min-height gives it the same floor as every other row while empty; once
   the text wraps past that, the textarea grows and the row's min-height yields to it
   rather than clipping. align-self:center keeps a short value optically centered in
   the row; a grown one simply fills it. */
.pv2-edit-card__inline-input--notes {
  align-self: center;
  font: 400 15px/1.4 var(--cd-font-ui);
  resize: vertical;
  min-height: 1.35em;
  max-height: 6em;
  field-sizing: content;
}

/* No italic here: Zen Kaku ships no true italic, so `font-style: italic` would be a
   synthetic oblique — a mechanical slant applied to a CJK-capable gothic, which reads
   as a rendering fault rather than emphasis. The placeholder's de-emphasis instead
   comes from colour alone (--pv2-ink-3, inherited from the base ::placeholder rule
   above), which is what every other placeholder on the card already relies on. */
.pv2-edit-card__inline-input--notes::placeholder {
  color: var(--pv2-ink-3);
  opacity: 1;
}

.pv2-edit-card__footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 16px;
  border-top: 1px solid var(--pv2-line);
  background: var(--pv2-paper);
}

.pv2-edit-card__delete,
.pv2-edit-card__save {
  height: 44px;
  border-radius: var(--cd-radius-editor-field);
  cursor: pointer;
  font: 700 12px var(--cd-font-ui);
}

.pv2-edit-card__delete {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--cd-danger-hover);
  letter-spacing: 0.04em;
}

.pv2-edit-card__save {
  min-width: 104px;
  padding: 0 24px;
  border: none;
  background: var(--pv2-ink);
  color: var(--pv2-paper);
  font-size: 14px;
}

.pv2-edit-card__save:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
