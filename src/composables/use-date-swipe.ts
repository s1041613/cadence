import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useUiStore } from '@/stores/ui-store'

// Payload shape of Quasar's v-touch-swipe handler (quasar/src/directives/touch-swipe).
// Quasar's own TouchSwipeValue types these fields as optional, so the runtime shape is
// declared here instead and the handler stays total over it.
export interface SwipeDetails {
  evt: Event
  touch: boolean
  mouse: boolean
  direction: 'up' | 'right' | 'down' | 'left'
  duration: number
  distance: { x: number; y: number }
}

// How far to move, in view-defined units: +1 forward, -1 back, 0 for "ignore this input".
export type DateStep = 1 | 0 | -1

// No distance floor here, deliberately. Quasar calls the handler on the FIRST touchmove that
// clears its own 6px threshold and never again (TouchSwipe.js:100-103, 116, 217-227), so
// `distance.x` is the displacement at that instant — single digits to low twenties on a real
// finger — not the length of the finished swipe. An earlier 40px floor therefore rejected
// essentially every touch gesture. It could not reproduce on a desktop because the `.mouse`
// path waits for 50px (sensitivity[2]) before firing at all. What makes a swipe deliberate is
// the directive's own velocity test, not a floor applied to a number it never promises to
// reach.
//
// Pure so the whole decision — direction and blocking — is testable without mounting a
// component. useDateSwipe below is only the wiring around these two.
export function resolveSwipeStep(details: SwipeDetails, blocked: boolean): DateStep {
  if (blocked) return 0
  // Swiping left reveals what comes next, matching iOS Calendar.
  if (details.direction === 'left') return 1
  if (details.direction === 'right') return -1
  return 0
}

// What the composable needs to know about a keydown, as plain data. Reading it off the event
// at the edge keeps this decision testable without a DOM.
export interface KeyIntent {
  key: string
  // Cmd/Ctrl/Alt/Shift+Arrow are browser and OS shortcuts (back/forward, word-wise caret
  // movement); the calendar must not swallow them.
  hasModifier: boolean
  // Arrow keys inside a text field move the caret, not the calendar.
  fromEditable: boolean
}

export function resolveKeyStep(intent: KeyIntent, blocked: boolean): DateStep {
  if (blocked || intent.hasModifier || intent.fromEditable) return 0
  if (intent.key === 'ArrowRight') return 1
  if (intent.key === 'ArrowLeft') return -1
  return 0
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function toKeyIntent(e: KeyboardEvent): KeyIntent {
  const target = e.target as HTMLElement | null
  return {
    key: e.key,
    hasModifier: e.metaKey || e.ctrlKey || e.altKey || e.shiftKey,
    fromEditable:
      target !== null && (EDITABLE_TAGS.has(target.tagName) || target.isContentEditable === true)
  }
}

export type SlideDirection = 'next' | 'prev'

// A step of 0 leaves the direction where it was: the pane is not moving, so flipping the
// animation would only mislead the next transition.
export function resolveSlideDirection(delta: number, current: SlideDirection): SlideDirection {
  if (delta === 0) return current
  return delta > 0 ? 'next' : 'prev'
}

export interface DateSwipeOptions {
  // Applies the step. Each view supplies its own unit: ±1 month, ±7 days, ±1 day.
  step: (delta: number) => void
  // Extra, view-local reasons to ignore input. The store-backed overlays every page can
  // mount are already handled inside the composable — pass only what this view owns
  // itself, such as the month view's sheets.
  blocked?: ComputedRef<boolean> | Ref<boolean>
}

export interface DateSwipe {
  onSwipe: (details: SwipeDetails) => void
  transitionName: ComputedRef<string>
  // Steps the date the same way a swipe does, so header arrows animate in the direction they
  // actually move through time. Every non-gesture navigation should go through this rather
  // than calling `step` directly, or the pane slides the way the last gesture went.
  navigate: (delta: number) => void
  // For jumps that set the date themselves (the month wheel picks an absolute month), where
  // only the direction needs syncing.
  setDirection: (delta: number) => void
}

// Shared horizontal swipe + arrow-key date navigation for the month, week and day views.
// Views differ only in what one step means, so they pass `step` and share everything else:
// the distance floor, the direction mapping, and the slide direction the transition reads.
export function useDateSwipe(options: DateSwipeOptions): DateSwipe {
  const ui = useUiStore()
  const direction = ref<'next' | 'prev'>('next')
  const transitionName = computed(() => `pv2-slide-${direction.value}`)

  // Mirrors the v-if conditions the three v2 page shells use to mount their overlays:
  // QuickAddPopover on qaPop, EventPreviewPopoverV2 on eventPreview, and EventComposerOverlay
  // on `eventComposerInitialValues || createOpen` (MonthPageV2.vue:27-32, and the same three
  // lines in WeekPageV2 / DayPageV2). Checked here rather than in each view's `blocked`
  // because the keydown listener is on window — a view that forgot one would change the date
  // underneath an open overlay. Keep this in step with those v-ifs; if a page gains another
  // overlay, add its condition here too.
  const blocked = computed(
    () =>
      ui.qaPop !== null ||
      ui.eventPreview !== null ||
      ui.eventComposerInitialValues !== null ||
      ui.createOpen ||
      options.blocked?.value === true
  )

  function navigate(delta: number): void {
    if (delta === 0) return
    direction.value = resolveSlideDirection(delta, direction.value)
    options.step(delta)
  }

  function onSwipe(details: SwipeDetails): void {
    navigate(resolveSwipeStep(details, blocked.value))
  }

  function onKeydown(e: KeyboardEvent): void {
    const delta = resolveKeyStep(toKeyIntent(e), blocked.value)
    if (delta === 0) return
    navigate(delta)
    e.preventDefault()
  }

  function setDirection(delta: number): void {
    direction.value = resolveSlideDirection(delta, direction.value)
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  return { onSwipe, transitionName, navigate, setDirection }
}
