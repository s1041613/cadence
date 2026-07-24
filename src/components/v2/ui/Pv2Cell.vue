<template>
  <!--
    月曆單日格。日期數字 Caveat 藥丸：today 黑底白字、非 today 深色 + 可讀陰影、外月淡色。
    cell 點擊 → 開當日事件面板；event chip 點擊 stop propagation 走 eventClick。
  -->
  <div class="pv2-cell" @click="emit('cellClick')">
    <div class="pv2-cell__head">
      <span
        class="pv2-cell__num"
        :class="{
          'pv2-cell__num--today': today,
          'pv2-cell__num--outside': outsideMonth
        }"
      >
        {{ dayNum }}
      </span>
    </div>
    <div class="pv2-cell__events">
      <!-- chip 不自己處理點擊：讓事件冒泡到 cell → 開當日 day sheet（避免與 detail 打架） -->
      <Pv2EventChip
        v-for="ev in visibleEvents"
        :key="ev.id"
        :title="ev.title"
        :color="ev.color"
        :all-day="ev.allDay"
      />
      <span v-if="hiddenCount > 0" class="pv2-cell__more">+{{ hiddenCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pv2EventChip from './Pv2EventChip.vue'

export interface Pv2CellEvent {
  id: string
  title: string
  color: string
  allDay: boolean
}

const props = defineProps<{
  dayNum: number
  today: boolean
  outsideMonth: boolean
  events: Pv2CellEvent[]
  maxChips: number
}>()

const emit = defineEmits<{
  cellClick: []
}>()

const visibleEvents = computed(() =>
  props.events.length <= props.maxChips
    ? props.events
    : props.events.slice(0, Math.max(0, props.maxChips - 1))
)
const hiddenCount = computed(() => props.events.length - visibleEvents.value.length)
</script>

<style scoped>
.pv2-cell {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid #cdcdcd;
  border-bottom: 1px solid #cdcdcd;
  padding: 4px 3px 5px;
  box-sizing: border-box;
  cursor: pointer;
}

.pv2-cell__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pv2-cell__num {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 3px;
  border-radius: 999px;
  font: 700 15px var(--cd-font-caveat);
  line-height: 1;
  color: #1b1b1b;
  text-shadow: 0 1px 3px rgba(250, 250, 249, 0.9), 0 0 2px rgba(250, 250, 249, 0.9);
}

.pv2-cell__num--today {
  background: #1b1b1b;
  color: #fafaf9;
  text-shadow: none;
}

.pv2-cell__num--outside {
  color: #cdcdcd;
  text-shadow: none;
}

.pv2-cell__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 3px;
  min-height: 0;
  overflow: hidden;
}

.pv2-cell__more {
  font: 400 8px var(--cd-font-mono);
  color: #b2b2b2;
}
</style>
