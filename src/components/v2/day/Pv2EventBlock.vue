<template>
  <div
    class="pv2-event-block"
    :class="{ 'pv2-event-block--active': active }"
    :style="blockStyle"
    @click="(e) => { e.stopPropagation(); emit('click', e) }"
  >
    <span class="pv2-event-block__title">{{ title }}</span>
    <span class="pv2-event-block__time">{{ startLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Pv2EventBlock — v2 copy of CdEventBlock. The geometry and the three height clamps are
// carried over unchanged (they are the tested part); only the palette differs: v2 mixes
// against its own neutral paper instead of --cd-surface-raised, so no warm token reaches v2.
const props = defineProps<{
  title: string
  color: string
  top: number // px from grid top
  height: number // px
  left: string // CSS calc() or percentage string, from lane layout
  right: string
  lane: number
  startLabel: string
  active: boolean // true when this event is "in progress" (today + now within range)
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// Legacy dropped the time line and shrank the title on short blocks so a 30-minute event
// could stay its true height. v2 keeps the content instead: every block is floored at the
// height its two lines actually occupy, so a 1-minute event reads the same as an hour-long
// one. The cost is that a very short block overhangs its slot — accepted deliberately,
// since an unreadable block is worse than one that borrows a few pixels.
// Title and time sit on one row: 15px title at 1.25 = 18.75px plus 12px vertical padding.
const MIN_CONTENT_HEIGHT = 31

// v2 paper. Kept as a literal rather than a --cd-* token: the whole v2 tree hardcodes its
// neutral palette so the app-wide warm tokens cannot leak in.
const V2_PAPER = '#fafaf9'

const blockStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${props.top}px`,
  height: `${Math.max(MIN_CONTENT_HEIGHT, props.height)}px`,
  left: props.left,
  right: props.right,
  zIndex: 3 + props.lane,
  borderLeft: `3px solid ${props.color}`,
  background: props.active ? props.color : `color-mix(in srgb, ${props.color} 22%, ${V2_PAPER})`,
  color: props.active ? '#fff' : '#1b1b1b'
}))
</script>

<style scoped>
/* Title and time share one row: the time is pinned to its natural width and the title
   takes the rest, so a long title ellipsises rather than pushing the time out of view. */
.pv2-event-block {
  cursor: pointer;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 6px 12px;
  overflow: hidden;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.pv2-event-block__title {
  flex: 1;
  min-width: 0;
  font: 600 15px/1.25 var(--cd-font-ui);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-event-block__time {
  flex: none;
  font: 500 13px var(--cd-font-mono);
  font-variant-numeric: var(--cd-numeric-aligned);
  color: #6e6e6e;
  white-space: nowrap;
}

/* In-progress blocks invert to a solid fill, so the time line rides the inherited white. */
.pv2-event-block--active .pv2-event-block__time {
  color: inherit;
  opacity: 0.85;
}
</style>
