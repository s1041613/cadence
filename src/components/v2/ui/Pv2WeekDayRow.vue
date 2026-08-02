<template>
  <!--
    週檢視單日列（照設計稿）：左側大日期數字（Instrument Serif，今天較大較黑）；
    其餘小字一律 Zen Kaku；
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
  padding: 7px 0;
  border-top: 1px solid rgba(27, 27, 27, 0.08);
  overflow: hidden; /* 等高時事件多的列在自身內裁切，不撐高整體 */
}

/* 左側大日期數字 */
/* 日期數字＝浮水印感：大、斜體 serif、灰階墨色，像蓋在背景上的水印。
   背景是照片＋可調白紗（scrim 0/0.5/0.8），底色亮度不固定，
   所以非今天的數字必須夠深才讀得到；今天維持全黑，兩者落差仍然明顯。 */
.pv2-wdr__num {
  flex: none;
  width: 74px;
  text-align: center;
  font: italic 400 74px var(--cd-font-serif);
  line-height: 1;
  color: rgba(27, 27, 27, 0.62); /* 非今天：約 4.5:1，仍明顯淡於今天 */
}

/* 今天：同樣斜體 serif，但更大更深、明顯浮出 */
.pv2-wdr__num--today {
  font-size: 74px;
  color: #1b1b1b;
}

.pv2-wdr__num--outside {
  color: rgba(27, 27, 27, 0.42);
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
   底部漸層淡出遮罩只吃最後 12px，讓「還有更多」有暗示但不咬掉第 3 件的字。 */
.pv2-wdr__events {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 10px), transparent);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 10px), transparent);
}

.pv2-wdr__events::-webkit-scrollbar {
  display: none;
}

/* 10px 全大寫 Zen Kaku，字級小又有字距，原 #9c9c9c 在照片背景上只有約 2.2:1，改用 #6e6e6e。
   字距從 0.16em 收到 0.12em：0.16em 是為等寬臉調的，比例字身在小字級下會鬆散。 */
.pv2-wdr__dow {
  font: 500 10px var(--cd-font-ui);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6e6e6e;
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
  font: 500 13px/1.25 var(--cd-font-ui);
  color: #1b1b1b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 事件時間：維持次於標題的層級，但從 #9c9c9c 加深到 #6e6e6e 才讀得到。
   Zen Kaku 是比例字身，數字寬度不一致會讓右側時間欄參差，補 tabular-nums 對齊。 */
.pv2-wdr__time {
  flex: none;
  font: 500 11px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  letter-spacing: 0.04em;
  color: #6e6e6e;
}

/* 空日提示：原本 #b0b0aa 偏暖（olive），既太淡也不符 v2 中性 ink/paper 調性，
   改為調色盤既有的中性灰 #6e6e6e。
   改用 Zen Kaku 並拿掉 italic：Zen Kaku 沒有真斜體，瀏覽器只能合成傾斜（synthetic oblique），
   在有 CJK 覆蓋的黑體上會歪得很難看。層級改靠字級（15→13px）與灰階維持，不靠斜體。 */
.pv2-wdr__empty {
  font: 400 13px var(--cd-font-ui);
  color: #6e6e6e;
}
</style>
