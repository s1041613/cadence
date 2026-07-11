<template>
  <div class="cd-sheet-root" :class="{ 'cd-sheet-root--fullscreen': fullscreen, 'cd-sheet-root--raised': raised }">
    <CdScrim v-if="!fullscreen" :color="scrimColor" @click="emit('scrimClick')" />
    <div class="cd-sheet" :class="{ 'cd-sheet--fullscreen': fullscreen }" :style="{ animationDuration: duration }">
      <div v-if="showHandle" class="cd-sheet__handle" />
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
import CdScrim from './CdScrim.vue'

withDefaults(
  defineProps<{
    scrimColor?: string
    duration?: string
    showHandle?: boolean
    fullscreen?: boolean
    raised?: boolean
  }>(),
  { scrimColor: 'var(--cd-scrim-mid)', duration: '.3s', showHandle: true, fullscreen: false, raised: false }
)

const emit = defineEmits<{
  scrimClick: []
}>()
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
}

.cd-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #ddd9cf;
  margin: 10px auto 4px;
  flex: none;
}
</style>
