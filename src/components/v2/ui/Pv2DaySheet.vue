<template>
  <!--
    當日事件預覽面板（照設計稿，cell 點擊長出）。DOW + 日期標題 + 右上新增；
    事件列＝時間 + 象限直條 + 標題 + 象限標籤。空日顯示 nothing planned。
  -->
  <div class="pv2-ds-scrim" @click="emit('close')">
    <div class="pv2-ds" @click.stop>
      <!-- Swipe-to-dismiss is bound to the handle zone only: the list below owns its own
           overflow-y scroll, and a sheet-wide gesture would swallow it. -->
      <div class="pv2-ds__handle-zone" v-touch-swipe.down.mouse="onSwipeDown">
        <div class="pv2-ds__handle" />
      </div>

      <div class="pv2-ds__head">
        <div class="pv2-ds__head-text">
          <span class="pv2-ds__dow">{{ dow }}</span>
          <span class="pv2-ds__date">{{ dateLabel }}</span>
        </div>
        <button type="button" class="pv2-ds__add" aria-label="新增事件" @click="emit('create')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fafaf9" stroke-width="2.2" stroke-linecap="round">
            <path d="M12 5 V19 M5 12 H19" />
          </svg>
        </button>
      </div>

      <div class="pv2-ds__list">
        <template v-if="events.length">
          <button
            v-for="ev in events"
            :key="ev.id"
            type="button"
            class="pv2-ds__row"
            @click="(e) => emit('eventClick', ev, e)"
          >
            <span class="pv2-ds__time">{{ ev.timeLabel }}</span>
            <span class="pv2-ds__bar" :style="{ background: ev.quadColor }" />
            <span class="pv2-ds__row-text">
              <span class="pv2-ds__title">{{ ev.title }}</span>
            </span>
          </button>
        </template>
        <span v-else class="pv2-ds__empty">nothing planned</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface Pv2DayEvent {
  id: string
  title: string
  timeLabel: string // "09:00" / "all-day" / "—"
  quadColor: string
  quadLabel: string // "EVENT" / "LATER" / "PLAN" …
}

defineProps<{
  dow: string
  dateLabel: string
  events: Pv2DayEvent[]
}>()

const emit = defineEmits<{
  close: []
  create: []
  eventClick: [event: Pv2DayEvent, mouseEvent: MouseEvent]
}>()

function onSwipeDown(): void {
  emit('close')
}
</script>

<style scoped>
.pv2-ds-scrim {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(27, 27, 27, 0.32);
  display: flex;
  align-items: flex-end;
}

.pv2-ds {
  width: 100%;
  height: 50%; /* 固定高度：不論事件多少都一樣高，超過的事件在列表區捲動 */
  display: flex;
  flex-direction: column;
  background: #fafaf9;
  border-radius: 24px 24px 0 0;
  padding: 14px 24px 30px;
  box-shadow: 0 -12px 34px rgba(0, 0, 0, 0.22);
}

/* Zone is taller than the 5px pill so the swipe target is actually hittable; the pill's former
   bottom margin lives here to keep the rendered layout identical. */
.pv2-ds__handle-zone {
  flex: none;
  padding: 4px 0 10px;
  touch-action: none;
  cursor: grab;
}

.pv2-ds__handle {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: #dadad4;
  margin: 0 auto;
}

.pv2-ds__head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1.5px solid #1b1b1b;
}

.pv2-ds__head-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pv2-ds__dow {
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9c9c9c;
}

/* 同 poster 的斜體，字級跟著全站大標題乘 0.7（見 Pv2DayHeader） */
.pv2-ds__date {
  font: italic 400 24px var(--cd-font-serif);
  line-height: 1;
  color: #1b1b1b;
}

.pv2-ds__add {
  flex: none;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #1b1b1b;
  cursor: pointer;
}

.pv2-ds__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.pv2-ds__list::-webkit-scrollbar {
  display: none;
}

.pv2-ds__row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 2px;
  border: none;
  border-bottom: 1px solid rgba(27, 27, 27, 0.08);
  background: none;
  cursor: pointer;
  text-align: left;
}

/* 62px 才裝得下 "all-day"：等寬臉每字 0.6em，7 字在 14px 下約 61px，
   舊的 48px 是照比例字身抓的，換臉後會斷成兩行。nowrap 是保險，
   讓未來更長的標籤寧可被切也不要撐成兩行破壞列高。 */
.pv2-ds__time {
  flex: none;
  width: 62px;
  font: 500 14px var(--cd-font-mono);
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: #6e6e6e;
}

/* 象限色點：小圓點（非直條），列高由 align-items:center 垂直置中 */
.pv2-ds__bar {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.pv2-ds__row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pv2-ds__title {
  font: 600 16px var(--cd-font-ui);
  color: #1b1b1b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-ds__empty {
  display: block;
  padding: 24px 2px;
  font: italic 400 15px var(--cd-font-serif);
  color: #b0b0aa;
}
</style>
