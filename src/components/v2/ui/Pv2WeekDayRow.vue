<template>
  <!--
    週檢視單日列（照設計稿）：左側大日期數字（serif，今天較大較黑）；
    右側 DOW 標籤 + 事件列（色點 + 標題 + 右側時間 / all-day / —），空日顯示 nothing planned。
  -->
  <div class="pv2-wdr">
    <span class="pv2-wdr__num" :class="{ 'pv2-wdr__num--today': today, 'pv2-wdr__num--outside': !inWeekFocus && !today }">
      {{ dayNum }}
    </span>

    <div class="pv2-wdr__body">
      <span class="pv2-wdr__dow">{{ dowLabel }}</span>

      <!-- 事件多時這區塊內部可捲，看得到全部；DOW 標籤固定不捲 -->
      <div class="pv2-wdr__events">
        <template v-if="events.length">
          <button
            v-for="ev in events"
            :key="ev.id"
            type="button"
            class="pv2-wdr__event"
            @click="(e) => emit('eventClick', ev, e)"
          >
            <span class="pv2-wdr__dot" :style="{ background: ev.color }" />
            <span class="pv2-wdr__title">{{ ev.title }}</span>
            <span class="pv2-wdr__time">{{ ev.timeLabel }}</span>
          </button>
        </template>
        <span v-else class="pv2-wdr__empty">nothing planned</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Pv2WeekEvent {
  id: string
  title: string
  color: string
  timeLabel: string // "09:00" / "all-day" / "—"
}

defineProps<{
  dayNum: number
  dowLabel: string
  today: boolean
  inWeekFocus: boolean // 保留：目前一週皆 focus；跨月時可用來淡化非當月日
  events: Pv2WeekEvent[]
}>()

const emit = defineEmits<{
  eventClick: [event: Pv2WeekEvent, mouseEvent: MouseEvent]
}>()
</script>

<style scoped>
.pv2-wdr {
  display: flex;
  align-items: stretch; /* body 撐滿 row 全高，事件區塊才有高度可捲 */
  gap: 18px;
  padding: 10px 0;
  border-top: 1px solid rgba(27, 27, 27, 0.08);
  overflow: hidden; /* 等高時事件多的列在自身內裁切，不撐高整體 */
}

/* 左側大日期數字 */
/* 日期數字＝浮水印感：大、斜體 serif、半透明淡灰，像蓋在背景上的水印 */
.pv2-wdr__num {
  flex: none;
  width: 74px;
  text-align: center;
  font: italic 400 74px var(--cd-font-serif);
  line-height: 1;
  color: rgba(27, 27, 27, 0.16); /* 非今天：淡浮水印 */
}

/* 今天：同樣斜體 serif，但更大更深、明顯浮出 */
.pv2-wdr__num--today {
  font-size: 74px;
  color: #1b1b1b;
}

.pv2-wdr__num--outside {
  color: rgba(27, 27, 27, 0.1);
}

.pv2-wdr__body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
  overflow: hidden;
}

/* 事件區塊：事件多時內部捲動看全部（DOW 固定在上方不捲）。
   底部漸層淡出遮罩，讓被裁的事件柔和淡掉而非硬邊銳利切斷。 */
.pv2-wdr__events {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent);
}

.pv2-wdr__events::-webkit-scrollbar {
  display: none;
}

.pv2-wdr__dow {
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9c9c9c;
}

.pv2-wdr__event {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.pv2-wdr__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.pv2-wdr__title {
  flex: 1;
  min-width: 0;
  font: 500 14px var(--cd-font-ui);
  color: #1b1b1b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-wdr__time {
  flex: none;
  font: 500 12px var(--cd-font-mono);
  letter-spacing: 0.04em;
  color: #9c9c9c;
}

.pv2-wdr__empty {
  font: italic 400 15px var(--cd-font-serif);
  color: #b0b0aa;
}
</style>
