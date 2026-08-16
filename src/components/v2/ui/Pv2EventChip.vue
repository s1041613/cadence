<template>
  <!--
    格子內事件 chip，兩種呈現（照 handoff §05 Calendar · Event display）：
    - 整天（allDay）：實心飽和事件色填滿 + 白字，連續 bar。
    - 定時（timed）：白底 + 事件色描邊 + 同色文字，單格 pill。
  -->
  <span v-if="allDay" class="pv2-chip pv2-chip--allday" :style="allDayStyle"><span class="pv2-chip__label">{{ title }}</span></span>
  <span v-else class="pv2-chip pv2-chip--timed" :style="timedStyle"><span class="pv2-chip__label">{{ title }}</span></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  color: string
  allDay: boolean
}>()

// 整天：實心事件色填滿、白字
const allDayStyle = computed(() => ({
  background: props.color,
  color: '#fff'
}))

// 定時：白底、事件色描邊 + 同色文字
const timedStyle = computed(() => ({
  borderColor: props.color,
  color: props.color
}))
</script>

<style scoped>
.pv2-chip {
  display: flex;
  align-items: center;
  max-width: 100%;
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

/* 整天：實心色填滿 bar */
.pv2-chip--allday {
  border-radius: 6px;
  padding: 3px 3px;
}

/* 定時：白底 + 色描邊 + 同色文字 */
.pv2-chip--timed {
  border: 1px solid;
  border-radius: 6px;
  padding: 1px 3px;
  background: #fff;
}
</style>
