<template>
  <div
    class="pv2-event-block"
    :class="[
      `pv2-event-block--${tier}`,
      { 'pv2-event-block--active': active, 'pv2-event-block--done': isTask && done }
    ]"
    :style="blockStyle"
    @click="(e) => { e.stopPropagation(); emit('click', e) }"
  >
    <div class="pv2-event-block__head">
      <!-- Tasks only. An event is "where you have to be at three"; a task is the thing that has
           to get finished, and only the second one can be finished. Always live once it is
           drawn, checked included: unchecking is the only way back from settling a task too
           early, so it must never be a dead end. -->
      <button
        v-if="isTask"
        type="button"
        class="pv2-event-block__check"
        :data-on="done"
        :disabled="!canToggle"
        :aria-label="`${done ? 'Uncheck' : 'Check'} ${title}`"
        @click.stop="emit('toggleDone')"
      >
        <span class="pv2-event-block__box">
          <CdIcon v-if="done" name="check" :size="CHECK_GLYPH" :stroke-width="3" color="#fff" />
        </span>
      </button>

      <div class="pv2-event-block__headtext">
        <span class="pv2-event-block__title">{{ title }}</span>
        <span class="pv2-event-block__time">
          {{ startLabel }}
          <span v-if="tier !== 'compact' && remainingLabel" class="pv2-event-block__left">
            · {{ remainingLabel }}
          </span>
        </span>
      </div>
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
import type { Subtask } from '@/types/subtask'

// Pv2EventBlock — the day grid's event card.
//
// A block is sized by the clock, so a four-hour event is a 270px rectangle whose only content
// used to be one 15px line: the page read as coloured panels rather than as a day. The block
// now spends the height it is given — it picks a layout TIER from its own height and fills the
// remainder with the event's own detail (where, what's on the checklist, the first line of the
// notes) rather than leaving it blank.
//
// The two tiers, and why the threshold is where it is:
//
//   compact  (< 47px, i.e. under ~40 min)  title and time share one row. There is no room for
//                                          a second line at this height and a shrunken
//                                          two-line stack reads worse than one line.
//   regular  (>= 47px)                     the time drops UNDER the title. On one row the mono
//                                          time carried the same visual weight as the title it
//                                          sits beside — the hierarchy was inverted.
//
// The head is the same size in both, and at every block height above them: a block earns MORE
// DETAIL as it grows, never a bigger title. There was a third tier that set a 20px title above
// ~87 minutes, and it made duration read as importance — the day's largest type landed on
// whatever happened to run longest, which is lunch as often as it is the thing that matters.
// Height is the clock, and the clock is not a priority.
//
// The threshold below is line-box arithmetic against the constants, not a taste number: it IS
// the height the stacked head occupies, so a block only enters the tier once that head
// actually fits inside it. Change a font size and the constant it feeds must change with it,
// or a head starts overflowing its own block.
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
    /** Gates the checkbox. Quadrant tasks carry a completion state; calendar events keep the
     *  column's default false and are drawn exactly as they were before it existed. */
    isTask?: boolean
    done?: boolean
    /** False on a task someone else authored. The state is still drawn — whether a shared
     *  calendar's task got finished is worth seeing — but RLS only lets the author write the
     *  row, so an enabled control would promise a write the server refuses. */
    canToggle?: boolean
    subtasks?: Subtask[]
    /** Detail lines, shown only as far as the block's height affords. */
    location?: string
    notes?: string
    /** "3.8 hr left" — passed only for the in-progress block; the grid owns the clock. */
    remainingLabel?: string
  }>(),
  {
    isTask: false,
    done: false,
    canToggle: true,
    subtasks: () => [],
    location: '',
    notes: '',
    remainingLabel: ''
  }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
  /** Checkbox only. The block's own click opens the preview, so the checkbox stops propagation
   *  — one tap must not both settle the task and open a card over it. */
  toggleDone: []
}>()

// --- Line-box constants. Each mirrors a declaration in the stylesheet below. ---
const PAD_Y = 12 // .pv2-event-block padding: 6px top + 6px bottom
const TITLE_LH_SM = 19 // .pv2-event-block__title  15px/19px
const META_LH = 16 // .pv2-event-block__time   12px/16px
const DETAIL_GAP = 2 // .pv2-event-block__details margin-top
const DETAIL_LINE_H = 17 // one .pv2-event-block__details li

// Legacy dropped the time line and shrank the title on short blocks so a 30-minute event
// could stay its true height. v2 keeps the content instead: every block is floored at the
// height its two lines actually occupy, so a 1-minute event reads the same as an hour-long
// one. The cost is that a very short block overhangs its slot — accepted deliberately,
// since an unreadable block is worse than one that borrows a few pixels.
const MIN_CONTENT_HEIGHT = PAD_Y + TITLE_LH_SM // 31 — the compact head, title and time on one row
const REGULAR_MIN = MIN_CONTENT_HEIGHT + META_LH // 47 — the same head with the time on its own row

/** The height actually rendered — short blocks are floored, so the row budget must use this. */
const renderedHeight = computed(() => Math.max(MIN_CONTENT_HEIGHT, props.height))

const tier = computed<'compact' | 'regular'>(() =>
  renderedHeight.value >= REGULAR_MIN ? 'regular' : 'compact'
)

/** The checkmark inside the 14px circle — one size, since the circle is one size. */
const CHECK_GLYPH = 9

const headHeight = computed(() =>
  tier.value === 'compact' ? MIN_CONTENT_HEIGHT : REGULAR_MIN
)

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

/**
 * Geometry, plus the event's colour as a custom property.
 *
 * Nothing else: the fill, the lift and the in-progress ring are all expressed in the
 * stylesheet against --pv2-block-color, so the whole look of a block can be read in one place
 * instead of half here and half there. Inline styles also win over every rule in the sheet,
 * which makes them the wrong home for anything a reader might expect to override.
 */
const blockStyle = computed(() => ({
  position: 'absolute' as const,
  top: `${props.top}px`,
  height: `${renderedHeight.value}px`,
  left: props.left,
  right: props.right,
  zIndex: 3 + props.lane,
  '--pv2-block-color': props.color
}))
</script>

<style scoped>
/*
 * A block is a card that floats over the axis, washed with its event's colour — NOT a panel
 * filled with it.
 *
 * The fill used to be 22% of the event colour, with the in-progress block at a full 100%.
 * That is a defensible density for a 30-minute block and a wall of colour for a four-hour one:
 * the same rule, applied to a shape whose height is the clock, necessarily overdoses the long
 * events. And the colour was doing a job it does not have here — in Month a chip is too small
 * to carry its title, so the colour has to say which event it is, but in Day the title is
 * right there in 15px type. So the colour is turned down to a wash that only has to say
 * "these pixels belong to one event", and the card's edge is drawn by a shadow instead.
 *
 * Two shadow layers, because one cannot do both jobs: the 1px contact shadow separates the
 * card from the hour line it sits on, and the 16px ambient one is what actually reads as
 * height. Heavier than the flat v2 cards (Pv2TodoCard, Pv2GoalCard) on purpose — those sit on
 * empty paper and only need an edge, while these sit on a ruled grid with no border of their
 * own, so the shadow IS the border.
 */
.pv2-event-block {
  cursor: pointer;
  box-sizing: border-box;
  border-radius: 8px;
  padding: 6px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--pv2-ink);
  background: color-mix(in srgb, var(--pv2-block-color) 10%, var(--pv2-canvas));
  box-shadow:
    0 1px 2px rgba(var(--pv2-ink-rgb), 0.05),
    0 6px 16px -6px rgba(var(--pv2-ink-rgb), 0.16);
}

/*
 * In progress. Lifted one step higher and ringed in its own colour, rather than inverted to a
 * solid fill: on a four-hour shift that solid fill was the loudest thing on the page, and the
 * now line already says where "now" is — the block only has to say which event contains it.
 * The wash goes up by six points, which is enough to read as "this one" beside its neighbours
 * without becoming the panel again.
 */
.pv2-event-block--active {
  background: color-mix(in srgb, var(--pv2-block-color) 16%, var(--pv2-canvas));
  box-shadow:
    0 2px 4px rgba(var(--pv2-ink-rgb), 0.07),
    0 10px 24px -8px rgba(var(--pv2-ink-rgb), 0.22),
    inset 0 0 0 1.5px var(--pv2-block-color);
}

/* The head is a row in every tier now: the checkbox on the left, the title and time stacked or
   side by side beside it. What differs per tier is only what __headtext does with its two
   children, below — so the checkbox's placement is written once instead of three times. */
.pv2-event-block__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.pv2-event-block__headtext {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Compact: title and time share one row. The time is pinned to its natural width and the
   title takes the rest, so a long title ellipsises rather than pushing the time out of view. */
.pv2-event-block--compact .pv2-event-block__headtext {
  flex-direction: row;
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

/* Regular and tall keep __headtext's column default: the time drops under the title, where a
   12px mono line reads as the title's caption instead of competing with it for the row. */

/*
 * The completion checkbox — tasks only.
 *
 * The button is one TITLE LINE BOX tall and centres the circle inside it, the same trick
 * .pv2-event-block__lead uses on a wrapped note: on a regular block the time sits under the
 * title, and a checkbox centred on the head as a whole would float between the two lines
 * instead of level with the word it belongs to. It also means the checkbox costs the block no
 * vertical space at all — every constant above (PAD_Y, TITLE_LH_SM, the tier threshold, the
 * detail row budget) is untouched by it. The only cost is horizontal: the title gives up
 * box + gap, 22px in both tiers.
 */
.pv2-event-block__check {
  position: relative;
  flex: none;
  width: 14px;
  height: 19px; /* TITLE_LH_SM */
  padding: 0;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
}

/* A finger is not 14px. The hit area is pushed out past the circle without moving it, and it
   absorbs the whole of the shrink: the circle is a marker beside the 15px title, not a control
   sized for a thumb, so the reach it lost in diameter it takes back in inset.
   On a compact block the block's own overflow:hidden clips the vertical overshoot back to the
   block's 31px: accepted, since the horizontal reach is what a thumb misses by. */
.pv2-event-block__check::after {
  content: '';
  position: absolute;
  inset: -12px;
}

.pv2-event-block__box {
  width: 14px;
  height: 14px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1.4px solid rgba(var(--pv2-ink-rgb), 0.28);
  display: grid;
  place-items: center;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.pv2-event-block__check:hover:not(:disabled) .pv2-event-block__box {
  border-color: rgba(var(--pv2-ink-rgb), 0.55);
  box-shadow: 0 0 0 4px rgba(var(--pv2-ink-rgb), 0.06);
}

/* Filled in ink, NOT in the event's own colour. The quadrant palette runs from #F4A9A0 to
   #EC5093; a white checkmark clears 3:1 on the hot end of it and sits at 1.9:1 on the pale
   end, so a checkmark drawn on the task's colour would be legible on some tasks and invisible
   on others. One ink fill reads the same on all four. */
.pv2-event-block__check[data-on='true'] .pv2-event-block__box {
  background: var(--pv2-ink);
  border-color: var(--pv2-ink);
}

/* Someone else's task: shown, not writable (see the canToggle prop). */
.pv2-event-block__check:disabled {
  cursor: default;
}

.pv2-event-block__check:disabled .pv2-event-block__box {
  border-color: rgba(var(--pv2-ink-rgb), 0.14);
}

.pv2-event-block__title {
  font: 600 15px/19px var(--cd-font-ui);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-event-block__time {
  font: 500 12px/16px var(--cd-font-mono);
  font-variant-numeric: var(--cd-numeric-aligned);
  color: var(--pv2-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Only ever rendered on an in-progress block. Earns its emphasis from weight rather than a
   colour of its own — the countdown is the one moving number on the page and does not need
   help being noticed. */
.pv2-event-block__left {
  font-weight: 700;
}

/* The in-progress block keeps the page's ink, so its time line is marked by weight, not by
   the inverted white a solid fill used to demand. */
.pv2-event-block--active .pv2-event-block__time {
  color: var(--pv2-ink);
  font-weight: 700;
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

/* ink-3, not the ink-4 the faintest marks use: struck through AND at 2:1 over a 10% wash, a
   finished subtask stopped being readable at all — done is not the same as gone. */
.pv2-event-block__details li[data-done='true'] {
  color: var(--pv2-ink-3);
}

.pv2-event-block__details li[data-done='true'] .pv2-event-block__detail-text {
  text-decoration: line-through;
}

.pv2-event-block__more {
  font-weight: 700;
  color: var(--pv2-ink-3);
}

/*
 * Done. Last in the sheet on purpose: --done and --active are both one class deep, so this is
 * what decides which wins where they collide. (The grid also stops marking a finished task
 * in-progress, so in practice they do not — this is the belt to that braces.)
 *
 * The block recedes; it does not leave. Its slot on the axis is still information — the hour
 * was spent — and on a grid whose vertical axis IS the clock, something vanishing from under
 * your thumb reads as "I hit the wrong thing", not as "that's finished". So: the wash halves,
 * the ambient shadow goes and the card settles back onto the paper, and nothing moves.
 */
.pv2-event-block--done {
  background: color-mix(in srgb, var(--pv2-block-color) 5%, var(--pv2-canvas));
  box-shadow: 0 1px 2px rgba(var(--pv2-ink-rgb), 0.04);
}

/* ink-3, the same step a finished subtask takes: struck through AND faded to ink-4, a done
   title stopped being readable at all — done is not the same as gone. */
.pv2-event-block--done .pv2-event-block__title {
  color: var(--pv2-ink-3);
  text-decoration: line-through;
}

.pv2-event-block--done .pv2-event-block__time {
  color: var(--pv2-ink-4);
  font-weight: 500;
}
</style>
