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
    // Overrides the sheet's default #fff surface (e.g. Draft passes its paper token so the
    // fullscreen sheet's edge-to-edge background matches the drawer content, not white).
    surface?: string
  }>(),
  { scrimColor: 'var(--cd-scrim-mid)', duration: '.3s', showHandle: true, fullscreen: false, raised: false }
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
  background: #fff;
  border-radius: 22px 22px 0 0;
  box-shadow: var(--cd-shadow-sheet);
  animation-name: cd-sheetUp;
  animation-timing-function: var(--cd-ease-standard);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cd-sheet--fullscreen {
  max-height: 100%;
  height: 100%;
  border-radius: 0;
  box-shadow: none;
  animation-name: none;
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
</style>
