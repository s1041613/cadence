<template>
  <div ref="popoverRootEl" class="cd-popover-root">
    <CdScrim v-if="scrim" :color="scrimColor" @click="emit('scrimClick')" />
    <div class="cd-popover-wrap" :style="popoverStyle">
      <span v-if="caret" class="cd-popover__caret" :style="caretStyle" />
      <div class="cd-popover">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// CdPopover — anchored popover (Event Preview/Edit card, month +N more list, copy-to-days picker).
// design-research-report.md §3.8/§4.4 explicitly notes the source file is truncated mid-way through this
// component's positioning math ("_eventPreview's desktop anchored positioning code, mid-definition"), so
// this clamp/flip logic delegates to the pure `anchoredPosition()` (design.md "Anchored popover
// positioning as a pure function" / task 1.4), pinned by its own unit tests rather than eyeballed here:
//   - default position: anchor.x, below the anchor (anchor.y + anchor.h + 8px gap)
//   - if it would overflow the clamp root's bottom edge, flip to above the anchor instead
//   - horizontal position is clamped so the popover never overflows the clamp root's left/right edges
// `anchor` gives the anchor rect in container-local coordinates (matches the prototype's own
// `{x,y,w,h,rw,rh}` shape captured via `getBoundingClientRect()` relative to `[data-poster-root]`).
// The clamp root passed to `anchoredPosition()` is `[data-poster-root]`'s bounds narrowed to the
// visible browser viewport — `[data-poster-root]` can be taller than the window (e.g. a month grid
// with six week-rows on a short viewport, and the page scrolls as a unit), so clamping against its
// full scrollable extent alone could still let the card render below the fold (app-shell spec
// "Anchored popovers remain fully visible").
//
// CADENCE Handoff §6.2: anchored popovers default to a TRANSPARENT click-away scrim (the scrim still
// captures clicks and emits `scrimClick`, it just isn't visible) — `scrimColor` default changed from
// `var(--cd-scrim)` to `transparent`. Callers that want a visible scrim (e.g. `fromCreate` centered
// modal reuse) pass an explicit color.
// CADENCE Handoff §6.2: optional `caret` — a 12x12 square rotated 45deg, background #fff, with the
// two anchor-facing edges bordered 1px solid #E9E6DD and a soft shadow, sitting on the card edge that
// faces the anchor (top edge when the card is below the anchor, bottom edge when flipped above),
// horizontally positioned at the anchor's x and clamped to stay inside the card bounds minus 12px.
import { computed, onMounted, ref } from 'vue'
import CdScrim from './CdScrim.vue'
import { anchoredPosition } from '@/utils/anchored-position'

export interface PopoverAnchor {
  x: number
  y: number
  w: number
  h: number
  rw: number // container width
  rh: number // container height
}

const props = withDefaults(
  defineProps<{
    anchor: PopoverAnchor
    width?: number
    approxHeight?: number
    scrim?: boolean
    scrimColor?: string
    gap?: number
    caret?: boolean
  }>(),
  { width: 370, approxHeight: 440, scrim: true, scrimColor: 'transparent', gap: 8, caret: false }
)

const emit = defineEmits<{
  scrimClick: []
}>()

const popoverRootEl = ref<HTMLElement | null>(null)

// Root's own top offset in the browser viewport, captured once on mount. Root can be taller than
// the viewport (e.g. a month grid with six week-rows on a short window) and the page scrolls as a
// unit, so a purely root-relative clamp can still let a popover's rendered box fall below the
// visible viewport bottom. Combined with `window.innerHeight`, this lets the vertical clamp target
// "stays inside the visible viewport" (app-shell spec "Anchored popovers remain fully visible"),
// not just "stays inside root's full scrollable extent".
const rootViewportTop = ref(0)
onMounted(() => {
  const root = popoverRootEl.value?.parentElement
  if (root) rootViewportTop.value = root.getBoundingClientRect().top
})

// Clamp root height: the smaller of root's own extent and the visible viewport (translated into
// root-relative coordinates via `rootViewportTop`) — see the header comment above.
const clampRootHeight = computed(() => {
  const { anchor } = props
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : Infinity
  return Math.min(anchor.rh, viewportH - rootViewportTop.value)
})

const anchoredPoint = computed(() => {
  const { anchor, width, approxHeight, gap } = props
  return anchoredPosition(
    { x: anchor.x, y: anchor.y, width: anchor.w, height: anchor.h },
    { width, height: approxHeight },
    { width: anchor.rw, height: clampRootHeight.value },
    gap
  )
})

const flipUp = computed(() => {
  const { anchor, gap } = props
  return anchoredPoint.value.y < anchor.y + anchor.h + gap
})

const popoverStyle = computed(() => {
  const { width } = props
  return {
    position: 'absolute' as const,
    top: `${anchoredPoint.value.y}px`,
    left: `${anchoredPoint.value.x}px`,
    width: `${width}px`
  }
})

// Caret sits on the card edge facing the anchor, at the anchor's x, clamped inside the card bounds
// minus 12px (its own size) so it never pokes past the card's rounded corners.
const caretStyle = computed(() => {
  const { anchor, width } = props
  const caretLeft = Math.min(Math.max(anchor.x - parseFloat(String(popoverStyle.value.left)), 0), width - 12)

  return flipUp.value
    ? { bottom: '-6px', left: `${caretLeft}px`, borderTop: 'none', borderLeft: 'none' }
    : { top: '-6px', left: `${caretLeft}px`, borderBottom: 'none', borderRight: 'none' }
})
</script>

<style scoped>
.cd-popover-root {
  position: absolute;
  inset: 0;
  z-index: 50;
}

.cd-popover-wrap {
  position: relative;
}

.cd-popover {
  background: #fff;
  border: 1px solid #e9e6dd;
  border-radius: var(--cd-radius-preview);
  box-shadow: var(--cd-shadow-menu);
  overflow: hidden;
}

.cd-popover__caret {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border: 1px solid #e9e6dd;
  box-shadow: 0 2px 6px -2px rgba(40, 38, 30, 0.25);
  transform: rotate(45deg);
  z-index: 1;
}
</style>
