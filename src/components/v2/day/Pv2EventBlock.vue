<template>
  <div
    class="pv2-event-block"
    :class="{ 'pv2-event-block--active': active }"
    :style="blockStyle"
    @click="(e) => { e.stopPropagation(); emit('click', e) }"
  >
    <div class="pv2-event-block__head">
      <span class="pv2-event-block__title">{{ title }}</span>
      <span class="pv2-event-block__time">{{ startLabel }}</span>
    </div>
    <!-- Reading a block's intent without opening it. Only as many lines as the block's own
         height affords, with the remainder counted rather than clipped: one busy block must
         not crowd out the rest of the day. -->
    <ul v-if="visibleSubtasks.length" class="pv2-event-block__subs">
      <li v-for="subtask in visibleSubtasks" :key="subtask.id" :data-done="subtask.done">
        {{ subtask.title }}
      </li>
      <li v-if="hiddenSubtaskCount > 0" class="pv2-event-block__more">+{{ hiddenSubtaskCount }} more</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Subtask } from '@/types/subtask'

// Pv2EventBlock — v2 copy of CdEventBlock. The geometry and the three height clamps are
// carried over unchanged (they are the tested part); only the palette differs: v2 mixes
// against its own neutral paper instead of --cd-surface-raised, so no warm token reaches v2.
const props = withDefaults(
  defineProps<{
    title: string
    color: string
    top: number // px from grid top
    height: number // px
    left: string // CSS calc() or percentage string, from lane layout
    right: string
    lane: number
    startLabel: string
    active: boolean // true when this event is "in progress" (today + now within range)
    subtasks?: Subtask[]
  }>(),
  { subtasks: () => [] }
)

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

// One subtask line at 12px/1.35 plus its 2px row gap. Blocks are sized by the clock, not by
// their contents, so the list takes only the room the slot already affords rather than growing
// the block and pushing the day's geometry out of true.
const SUBTASK_LINE_HEIGHT = 18

// A "+N more" line costs a row too, so it is only worth showing when it hides more than the
// one subtask it would have displaced.
const visibleSubtasks = computed(() => {
  const all = props.subtasks
  if (all.length === 0) return []
  const room = Math.floor((props.height - MIN_CONTENT_HEIGHT) / SUBTASK_LINE_HEIGHT)
  if (room <= 0) return []
  if (all.length <= room) return all
  return all.slice(0, Math.max(0, room - 1))
})

const hiddenSubtaskCount = computed(() => props.subtasks.length - visibleSubtasks.value.length)

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
  flex-direction: column;
}

/* The title/time row keeps the original one-line baseline treatment; any subtask lines
   stack beneath it. */
.pv2-event-block__head {
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

.pv2-event-block__subs {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  min-height: 0;
  overflow: hidden;
}

.pv2-event-block__subs li {
  font: 500 12px/1.35 var(--cd-font-ui);
  color: #6e6e6e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-event-block__subs li[data-done='true'] {
  text-decoration: line-through;
  color: #b2b2b2;
}

.pv2-event-block__more {
  font-weight: 700;
  color: #9c9c9c;
}

.pv2-event-block--active .pv2-event-block__subs li {
  color: inherit;
  opacity: 0.8;
}
</style>
