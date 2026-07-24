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
  font: 700 12px/1.2 var(--cd-font-ui);
}

/* Inner label does the single-line, whole-character clip: per-character wrapping,
   then the box is clamped to one line-height and overflow hidden — a glyph that
   doesn't fully fit wraps to the (hidden) next line instead of being sliced or given
   an ellipsis. The flex parent vertically centers it so top/bottom spacing is even. */
.pv2-chip__label {
  display: block;
  width: 100%;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
  max-height: 1.2em;
  overflow: hidden;
}

/* 整天：實心色填滿 bar */
.pv2-chip--allday {
  border-radius: 6px;
  padding: 3px 7px;
}

/* 定時：白底 + 色描邊 + 同色文字 */
.pv2-chip--timed {
  border: 1px solid;
  border-radius: 6px;
  padding: 1px 7px;
  background: #fff;
}
</style>
