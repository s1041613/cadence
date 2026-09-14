<template>
  <div
    class="pv2-event-block"
    :class="[`pv2-event-block--${tier}`, { 'pv2-event-block--active': active }]"
    :style="blockStyle"
    @click="(e) => { e.stopPropagation(); emit('click', e) }"
  >
    <div class="pv2-event-block__head">
      <span class="pv2-event-block__title">{{ title }}</span>
      <span class="pv2-event-block__time">
        {{ startLabel }}
        <span v-if="tier !== 'compact' && remainingLabel" class="pv2-event-block__left">
          · {{ remainingLabel }}
        </span>
      </span>
    </div>

    <!-- Reading a block's intent without opening it. Only as many lines as the block's own
         height affords, with the remainder counted rather than clipped: one busy block must
         not crowd out the rest of the day. -->
    <ul v-if="details.lines.length || details.more" class="pv2-event-block__details">
      <li
        v-for="line in details.lines"
        :key="line.key"
        :class="`pv2-event-block__detail--${line.kind}`"
        :data-done="line.done"
        :data-wrap="line.rows > 1 || undefined"
        :style="line.rows > 1 ? { maxHeight: `${line.rows * DETAIL_LINE_H}px` } : undefined"
      >
        <span class="pv2-event-block__lead">
          <CdIcon v-if="line.kind !== 'subtask'" :name="line.kind" :size="12" />
          <span v-else class="pv2-event-block__dot" />
        </span>
        <span
          class="pv2-event-block__detail-text"
          :style="line.rows > 1 ? { WebkitLineClamp: line.rows } : undefined"
        >{{ line.text }}</span>
      </li>
      <li v-if="details.more" class="pv2-event-block__more">
        <span class="pv2-event-block__lead" />
        <span class="pv2-event-block__detail-text">+{{ details.more }} more</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import { readableInkOn } from '@/components/v2/ui/event-colors'
import type { Subtask } from '@/types/subtask'

// Pv2EventBlock — the day grid's event card.
//
// A block is sized by the clock, so a four-hour event is a 270px rectangle whose only content
// used to be one 15px line: the page read as coloured panels rather than as a day. The block
// now spends the height it is given — it picks a layout TIER from its own height and fills the
// remainder with the event's own detail (where, what's on the checklist, the first line of the
// notes) rather than leaving it blank.
//
// The three tiers, and why the thresholds are where they are:
//
//   compact  (< 47px, i.e. under ~40 min)  title and time share one row, as before. There is
//                                          no room for a second line at this height and a
//                                          shrunken two-line stack reads worse than one line.
//   regular  (47–95px, ~40 min to 1½ hr)   the time drops UNDER the title. On one row the mono
//                                          time carried the same visual weight as the title it
//                                          sits beside — the hierarchy was inverted.
//   tall     (>= 96px)                     title at poster size (20px), and the detail list
//                                          gets real room.
//
// Every threshold below is line-box arithmetic against the constants, not a taste number: the
// tier boundaries ARE the height each tier's head occupies, so a block only enters a tier once
// that tier actually fits inside it. Change a font size and the constant it feeds must change
// with it, or a head starts overflowing its own block.
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
    /** Detail lines, shown only as far as the block's height affords. */
    location?: string
    notes?: string
    /** "3.8 hr left" — passed only for the in-progress block; the grid owns the clock. */
    remainingLabel?: string
  }>(),
  { subtasks: () => [], location: '', notes: '', remainingLabel: '' }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// --- Line-box constants. Each mirrors a declaration in the stylesheet below. ---
const PAD_Y = 12 // .pv2-event-block padding: 6px top + 6px bottom
const TITLE_LH_SM = 19 // .pv2-event-block__title       15px/19px
const TITLE_LH_LG = 24 // --tall .pv2-event-block__title 20px/24px
const META_LH = 16 // .pv2-event-block__time         12px/16px
const DETAIL_GAP = 2 // .pv2-event-block__details margin-top
const DETAIL_LINE_H = 17 // one .pv2-event-block__details li

// Legacy dropped the time line and shrank the title on short blocks so a 30-minute event
// could stay its true height. v2 keeps the content instead: every block is floored at the
// height its two lines actually occupy, so a 1-minute event reads the same as an hour-long
// one. The cost is that a very short block overhangs its slot — accepted deliberately,
// since an unreadable block is worse than one that borrows a few pixels.
const MIN_CONTENT_HEIGHT = PAD_Y + TITLE_LH_SM // 31 — the compact head, title and time on one row
const REGULAR_MIN = MIN_CONTENT_HEIGHT + META_LH // 47 — the same head with the time on its own row
const TALL_MIN = 96 // ~85 min: the first height with room for a 20px title AND a detail line

// v2 paper. Kept as a literal rather than a --cd-* token: the whole v2 tree hardcodes its
// neutral palette so the app-wide warm tokens cannot leak in.
const V2_PAPER = 'var(--pv2-canvas)'

/** The height actually rendered — short blocks are floored, so the row budget must use this. */
const renderedHeight = computed(() => Math.max(MIN_CONTENT_HEIGHT, props.height))

const tier = computed<'compact' | 'regular' | 'tall'>(() => {
  if (renderedHeight.value >= TALL_MIN) return 'tall'
  if (renderedHeight.value >= REGULAR_MIN) return 'regular'
  return 'compact'
})

const headHeight = computed(() => {
  if (tier.value === 'compact') return MIN_CONTENT_HEIGHT
  if (tier.value === 'regular') return REGULAR_MIN
  return PAD_Y + TITLE_LH_LG + META_LH
})

interface DetailLine {
  key: string
  kind: 'location' | 'subtask' | 'notes'
  text: string
  done?: boolean
  /** How many detail rows this line is allowed to occupy. One, except for a trailing note. */
  rows: number
}

/** Where, then what's on the checklist, then why — the order someone scans a block in. */
const detailSource = computed<DetailLine[]>(() => {
  const out: DetailLine[] = []
  const where = props.location.trim()
  if (where) out.push({ key: 'location', kind: 'location', text: where, rows: 1 })
  for (const s of props.subtasks) {
    out.push({ key: `subtask:${s.id}`, kind: 'subtask', text: s.title, done: s.done, rows: 1 })
  }
  // First non-empty line only. Notes are free text and can run for paragraphs; the block is a
  // glance, not the record — the preview card is where the rest lives. A note that lands last
  // with rows to spare is the exception, below.
  const note = props.notes.split('\n').map((l) => l.trim()).find((l) => l.length > 0)
  if (note) out.push({ key: 'notes', kind: 'notes', text: note, rows: 1 })
  return out
})

const details = computed<{ lines: DetailLine[]; more: number }>(() => {
  const all = detailSource.value
  if (all.length === 0) return { lines: [], more: 0 }
  const room = Math.floor((renderedHeight.value - headHeight.value - DETAIL_GAP) / DETAIL_LINE_H)
  if (room <= 0) return { lines: [], more: 0 }
  if (all.length <= room) return { lines: withWrappedNote(all, room), more: 0 }
  // A "+N more" line costs a row of its own, so it only earns that row when there is more than
  // one row to spend: with room for a single line, one real detail beats a bare count.
  if (room === 1) return { lines: all.slice(0, 1), more: 0 }
  return { lines: all.slice(0, room - 1), more: all.length - (room - 1) }
})

/**
 * A tall block whose event has little detail still ends as a panel of colour with a gap under
 * the last line. When the note is what that last line is, it takes the leftover rows and wraps
 * into them rather than ellipsising at one — filling the block with the user's own words
 * instead of padding it with something invented.
 */
function withWrappedNote(lines: DetailLine[], room: number): DetailLine[] {
  const last = lines[lines.length - 1]
  const spare = room - lines.length
  if (!last || last.kind !== 'notes' || spare <= 0) return lines
  return [...lines.slice(0, -1), { ...last, rows: 1 + spare }]
}

const blockStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${props.top}px`,
  height: `${renderedHeight.value}px`,
  left: props.left,
  right: props.right,
  zIndex: 3 + props.lane,
  borderLeft: `3px solid ${props.color}`,
  background: props.active ? props.color : `color-mix(in srgb, ${props.color} 22%, ${V2_PAPER})`,
  // Measured against the fill rather than fixed to white — an active block filled with Blossom
  // pink and titled in white is a blank card.
  color: props.active ? readableInkOn(props.color) : 'var(--pv2-ink)'
}))
</script>

<style scoped>
.pv2-event-block {
  cursor: pointer;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 6px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Compact: title and time share one row. The time is pinned to its natural width and the
   title takes the rest, so a long title ellipsises rather than pushing the time out of view. */
.pv2-event-block--compact .pv2-event-block__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.pv2-event-block--compact .pv2-event-block__title {
  flex: 1;
  min-width: 0;
}

.pv2-event-block--compact .pv2-event-block__time {
  flex: none;
}

/* Regular and tall: the time drops under the title, where a 12px mono line reads as the
   title's caption instead of competing with it for the row. */
.pv2-event-block--regular .pv2-event-block__head,
.pv2-event-block--tall .pv2-event-block__head {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pv2-event-block__title {
  font: 600 15px/19px var(--cd-font-ui);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The only size step in the block. A block this tall is the day's headline event; at 15px it
   read as a label floating in a field of colour. */
.pv2-event-block--tall .pv2-event-block__title {
  font: 600 20px/24px var(--cd-font-ui);
  letter-spacing: -0.01em;
}

.pv2-event-block__time {
  font: 500 12px/16px var(--cd-font-mono);
  font-variant-numeric: var(--cd-numeric-aligned);
  color: var(--pv2-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Only ever rendered on an in-progress block, which is solid-filled — so it rides the
   inherited ink and earns its emphasis from weight rather than a colour of its own. */
.pv2-event-block__left {
  font-weight: 700;
}

/* In-progress blocks invert to a solid fill, so the time line rides the inherited white. */
.pv2-event-block--active .pv2-event-block__time {
  color: inherit;
  opacity: 0.85;
}

.pv2-event-block__details {
  list-style: none;
  /* DETAIL_GAP */
  margin: 2px 0 0;
  padding: 0;
  min-height: 0;
  overflow: hidden;
}

/* Fixed height, not line-height alone: DETAIL_LINE_H is what the row budget above counts in,
   and a row that renders taller than it is budgeted for clips the last line in half. */
.pv2-event-block__details li {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 17px;
  font: 500 12px/1.35 var(--cd-font-ui);
  color: var(--pv2-ink-2);
}

/* One leading slot for every row — glyph, bullet, or nothing on the overflow count — so the
   detail text starts on one left edge instead of stepping in and out per row. */
.pv2-event-block__lead {
  flex: none;
  width: 12px;
  /* A full row tall, not the glyph's 12px: on a wrapped note the row grows and the glyph must
     stay level with the note's first line rather than centring on the whole paragraph. */
  height: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv2-event-block__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.55;
}

.pv2-event-block__detail-text {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The wrapped trailing note. Height is released and re-capped by the row budget's max-height,
   with -webkit-line-clamp (bound inline) cutting the paragraph at the same row count — the two
   have to agree or the last line renders sliced through its middle. */
.pv2-event-block__details li[data-wrap] {
  height: auto;
  align-items: flex-start;
}

.pv2-event-block__details li[data-wrap] .pv2-event-block__detail-text {
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.pv2-event-block__details li[data-done='true'] {
  color: var(--pv2-ink-4);
}

.pv2-event-block__details li[data-done='true'] .pv2-event-block__detail-text {
  text-decoration: line-through;
}

.pv2-event-block__more {
  font-weight: 700;
  color: var(--pv2-ink-3);
}

.pv2-event-block--active .pv2-event-block__details li {
  color: inherit;
  opacity: 0.8;
}
</style>
