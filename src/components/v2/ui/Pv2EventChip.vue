<template>
  <!--
    格子內事件 chip，兩種呈現：
    - 整天（allDay）：實心事件色填滿 + 對比字色，連續 bar。
    - 定時（timed）：同色淡底 + 同色深字，單格 pill。

    Both renderings are FILLED. The timed chip used to be white with a coloured outline, which
    at 9px reads as a hairline box rather than as the event's colour: a 1px border carries a
    fraction of the pixels a fill does, so at a glance a row of timed events looked colourless.
    A wash of the same colour puts the hue across the whole chip while staying quieter than the
    all-day bar, which is the distinction the two renderings exist to make.

    A multi-day event is ONE chip stretched across its columns by the week row, not one chip per
    day — so the title renders once and there is no seam to hide. The continues flags only square
    off the end that a week boundary cut, leaving the real start and end rounded.
  -->
  <span
    v-if="allDay"
    class="pv2-chip pv2-chip--allday"
    :class="edgeClass"
    :style="allDayStyle"
  ><span class="pv2-chip__label">{{ title }}</span></span>
  <span
    v-else
    class="pv2-chip pv2-chip--timed"
    :class="edgeClass"
    :style="timedStyle"
  ><span class="pv2-chip__label">{{ title }}</span></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { readableInkOn, shadeOf, tintOf } from './event-colors'

const props = withDefaults(
  defineProps<{
    title: string
    color: string
    allDay: boolean
    /** The span carries on past this week row, so this end is cut rather than finished. */
    continuesLeft?: boolean
    continuesRight?: boolean
  }>(),
  { continuesLeft: false, continuesRight: false }
)

const edgeClass = computed(() => ({
  'pv2-chip--cut-left': props.continuesLeft,
  'pv2-chip--cut-right': props.continuesRight
}))

// 整天：實心事件色填滿，字色照 fill 量出來（白或深李子色），不是固定白字
const allDayStyle = computed(() => ({
  background: props.color,
  color: readableInkOn(props.color)
}))

// 定時：同色淡底 + 同色深字
const timedStyle = computed(() => ({
  background: tintOf(props.color),
  color: shadeOf(props.color)
}))
</script>

<style scoped>
/* One box for both renderings — only the fill and the ink differ, and those come from the
   inline style. The box has to be shared: month-lanes.ts CELL.chipH is a single number, so a
   variant with its own padding would make every lane's arithmetic wrong for half the chips. */
.pv2-chip {
  display: flex;
  align-items: center;
  max-width: 100%;
  border-radius: 6px;
  /* 2px vertical: with the 9px/1.2 line this is CELL.chipH exactly. 4px horizontal because the
     fill now runs edge to edge and a label flush against it reads as clipped. */
  padding: 2px 4px;
  box-sizing: border-box;
  font: 700 9px/1.2 var(--cd-font-ui);
  letter-spacing: -0.02em;
}

/* Hard single line, sliced at the box edge.
 *
 * This used to wrap per character (word-break: break-all) and hide everything past
 * one line-height, so a glyph that didn't fully fit moved to a hidden second line
 * rather than being cut. That never actually held: the label's box rounds up to a
 * whole pixel while the line does not (9px against 8.7px at the old size), and the
 * top of the second line bled through that gap as a row of specks under the title.
 *
 * nowrap removes the second line altogether, which is the only way to guarantee the
 * bleed cannot come back at some other size. Slicing the last glyph is the cost, and
 * it buys back the width the whole-character rule wasted: the chip now fills its box,
 * so roughly as much of a Chinese title is legible at 9px as was at 7.25px.
 * The flex parent vertically centers it so top/bottom spacing is even. */
.pv2-chip__label {
  display: block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}

/* A cut end is square: the rounded end is what says "the event starts/ends here", so leaving it
   rounded at a week boundary would read as two separate events rather than one continuing. */
.pv2-chip--cut-left {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.pv2-chip--cut-right {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
