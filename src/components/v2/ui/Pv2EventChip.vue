<template>
  <!--
    格子內事件 chip，兩種樣式（無描邊框線）：
    - 整天（allDay）：事件色淡底 + 事件色文字（色底藥丸）。
    - 非整天（timed）：無底、左側色點 + 深色文字。
  -->
  <span v-if="allDay" class="pv2-chip pv2-chip--allday" :style="allDayStyle">{{ title }}</span>
  <span v-else class="pv2-chip pv2-chip--timed">
    <span class="pv2-chip__dot" :style="{ background: color }" />
    <span class="pv2-chip__title">{{ title }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  color: string
  allDay: boolean
}>()

// 整天藥丸：事件色淡底（+22 ≈ 13% alpha）、事件色文字
const allDayStyle = computed(() => ({
  background: `${props.color}22`,
  color: props.color
}))
</script>

<style scoped>
.pv2-chip {
  display: block;
  max-width: 100%;
  font: 700 8px var(--cd-font-ui);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 整天：色底藥丸 */
.pv2-chip--allday {
  border-radius: 5px;
  padding: 1px 5px;
}

/* 非整天：色點 + 深色文字，無底無框 */
.pv2-chip--timed {
  display: flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
  color: #3c3c3c;
}

.pv2-chip__dot {
  flex: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.pv2-chip__title {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
