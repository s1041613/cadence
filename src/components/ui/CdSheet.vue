<template>
  <div class="cd-sheet-root" :class="{ 'cd-sheet-root--fullscreen': fullscreen, 'cd-sheet-root--raised': raised }">
    <CdScrim v-if="!fullscreen" :color="scrimColor" @click="emit('scrimClick')" />
    <div class="cd-sheet" :class="{ 'cd-sheet--fullscreen': fullscreen }" :style="{ animationDuration: duration, ...(surface ? { background: surface } : {}) }">
      <div v-if="shouldShowHandle" class="cd-sheet__handle-zone" v-touch-swipe.down.mouse="onSwipeDown">
        <div class="cd-sheet__handle" />
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// CdSheet — bottom sheet container (month calendar picker, Quick Add, event preview, mobile drawers).
// design-research-report.md §3.17 / §4.11: radius 22px 22px 0 0, animation sheetUp (.3s for calendar/invite,
// .28s for draftConv), handle 40x4 #DDD9CF, shadow 0 -18px 42px -20px rgba(40,38,30,.4), max-height 92%.
// `showHandle` defaults on; the month calendar sheet opts out since its own header already carries
// the affordance (Zoe's 2026-07-10 correction — no visual drag handle on that sheet).
//
// `fullscreen` (Zoe's 2026-07-11 correction): Draft/Settings/Assistant render edge-to-edge on phone —
// no corner radius, no scrim, no inset — instead of the card-style bottom sheet. Event composer and
// the month-calendar picker keep the card-style sheet, so this is opt-in per consumer, not a global change.
//
// `raised` (Zoe's 2026-07-11 correction): stacks this sheet above another already-open `fullscreen`
// sheet (e.g. the event composer opened from within the still-open Draft drawer) while keeping the
// card-style look — a z-index bump only, independent of `fullscreen`'s edge-to-edge styling.
import { computed } from 'vue'
import CdScrim from './CdScrim.vue'

const props = withDefaults(
  defineProps<{
    scrimColor?: string
    duration?: string
    showHandle?: boolean
    fullscreen?: boolean
    raised?: boolean
    // Overrides the sheet's default #fafaf9 paper (e.g. Draft passes its own paper token so the
    // fullscreen sheet's edge-to-edge background matches the drawer content).
    // NOT #fff — the handle zone and the panel's bottom padding sit outside the slot and are
    // painted by this surface, so slot content that sets a different background of its own shows
    // it as a band above and below itself. Match the paper or override it here, not in the slot.
    surface?: string
  }>(),
  { scrimColor: 'var(--cd-scrim)', duration: '.3s', showHandle: true, fullscreen: false, raised: false }
)

const emit = defineEmits<{
  scrimClick: []
  dismiss: []
}>()

// `fullscreen` sheets are edge-to-edge and not swipe-dismissable, so the drag handle affordance is
// suppressed regardless of `showHandle` (Zoe's 2026-07-11 correction).
const shouldShowHandle = computed(() => props.showHandle && !props.fullscreen)

// Swipe-to-dismiss is bound to the handle zone only, not the whole sheet — sheet bodies contain
// their own overflow-y:auto regions and a sheet-wide gesture would swallow their scroll.
function onSwipeDown(): void {
  emit('dismiss')
}
</script>

<style scoped>
.cd-sheet-root {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.cd-sheet-root--fullscreen {
  z-index: 70;
  bottom: 86px;
}

.cd-sheet-root--raised {
  z-index: 80;
}

.cd-sheet {
  position: relative;
  width: 100%;
  max-height: 92%;
  /* All bottom sheets share the v2 paper surface. Callers may still override via the
     `surface` prop; this is just the default every sheet gets. */
  background: #fafaf9;
  border-radius: 22px 22px 0 0;
  box-shadow: var(--cd-shadow-overlay);
  animation-name: cd-sheetUp;
  animation-timing-function: var(--cd-ease-standard);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Clears the home indicator so a sheet's last row / footer button isn't hard against the
     screen edge. Applies to every bottom sheet (composer, settings, draft, assistant). */
  padding-bottom: 30px;
}

/* Fullscreen fills the frame and its root is already inset from the bottom, so the
   home-indicator padding above would only shrink the content area. */
.cd-sheet--fullscreen {
  max-height: 100%;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
  animation-name: none;
  padding-bottom: 0;
}

/* Zone is taller than the 4px pill so the swipe target is actually hittable; the pill's former
   10px/4px margins live here to keep the rendered layout identical. */
.cd-sheet__handle-zone {
  padding: 10px 0 4px;
  flex: none;
  touch-action: none;
  cursor: grab;
}

.cd-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #ddd9cf;
  margin: 0 auto;
}

/* ---------- Opt-in open/close transition ----------
 *
 * `cd-sheetUp` above is enter-only and, being a keyframe, restarts from
 * translateY(100%) every time it plays — a close interrupted by a re-open drops
 * the panel off-screen and replays instead of retargeting from where it is.
 * These classes replace it with transitions, which interpolate from the current
 * value and so survive interruption, and add the leave the keyframe never had.
 *
 * OPT-IN, and deliberately so. Of CdSheet's render sites only three are
 * reachable from the v2 routes; the rest are reachable only via /legacy, which
 * can't be exercised in normal use and therefore can't be verified on a device.
 * Wrapping a mount site in <Transition name="cd-sheet"> converts it; every site
 * without that wrapper keeps the keyframe above, unchanged. Two mechanisms
 * coexist on purpose — deleting the keyframe to "unify" them would silently
 * strip the enter animation from every unconverted sheet.
 *
 * Scoped rather than global on purpose. Vue applies these classes to
 * .cd-sheet-root, which is this component's own root, so the compiled selector
 * carries the scope attribute and lands at (0,3,0) — beating the base
 * `.cd-sheet` rule's (0,2,0). The same rules written in app.css would tie at
 * (0,2,0) and resolve by stylesheet order, which is a build-order-dependent
 * silent failure. */
.cd-sheet-root.cd-sheet-enter-active .cd-sheet,
.cd-sheet-root.cd-sheet-leave-active .cd-sheet {
  /* Kill the keyframe, or it fights the transition over transform. */
  animation: none;
  transition: transform var(--cd-duration-sheet) var(--cd-ease-standard);
}

/* The scrim fades on the same clock as the panel. Its own cd-scrimIn is
 * enter-only and runs at --cd-duration-scrim, so on the way out it would simply
 * disappear, and on the way in it would finish while the panel was still
 * travelling. CdScrim itself is untouched — this override only reaches the
 * mount sites that opted in. */
.cd-sheet-root.cd-sheet-enter-active .cd-scrim,
.cd-sheet-root.cd-sheet-leave-active .cd-scrim {
  animation: none;
  transition: opacity var(--cd-duration-sheet) var(--cd-ease-standard);
}

.cd-sheet-root.cd-sheet-enter-from .cd-sheet,
.cd-sheet-root.cd-sheet-leave-to .cd-sheet {
  /* Panel's own height, so this needs no hardcoded offset and self-corrects on
     rotation or resize. */
  transform: translateY(100%);
}

.cd-sheet-root.cd-sheet-enter-from .cd-scrim,
.cd-sheet-root.cd-sheet-leave-to .cd-scrim {
  opacity: 0;
}

/* Fullscreen sheets are edge-to-edge and opt out of the keyframe above; they
 * must opt out of the travel too or they would slide as a full-height panel.
 * No v2 mount site passes `fullscreen` today, so this cannot fire yet — it is
 * here so converting a legacy site later doesn't quietly inherit the wrong
 * motion. */
.cd-sheet-root.cd-sheet-enter-from .cd-sheet--fullscreen,
.cd-sheet-root.cd-sheet-leave-to .cd-sheet--fullscreen {
  transform: none;
}

/* Reduced motion keeps the scrim fade (it explains that a layer opened) and
 * drops the panel's travel, per the usual "fewer and gentler, not none". */
@media (prefers-reduced-motion: reduce) {
  .cd-sheet-root.cd-sheet-enter-active .cd-sheet,
  .cd-sheet-root.cd-sheet-leave-active .cd-sheet {
    transition: none;
  }

  .cd-sheet-root.cd-sheet-enter-from .cd-sheet,
  .cd-sheet-root.cd-sheet-leave-to .cd-sheet {
    transform: none;
  }
}
</style>
