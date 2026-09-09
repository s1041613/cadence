<template>
  <!--
    月曆單日格。日期數字 Caveat 藥丸：today 粉紅底白字、非 today 深色 + 可讀陰影、外月淡色。
    數字下方一行節日（國定假日紅字、民俗節日淡墨），沒有節日就留空。
    cell 點擊 → 開當日事件面板。

    Events are NOT rendered here: a multi-day event has to be one element crossing several
    columns, which a cell cannot do, so the week row draws them in an overlay above these cells.
    The cell keeps the day number, the click target, and the "+N" overflow count.
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

    <!-- Always rendered, empty on an ordinary day: the week's bar overlay is positioned from a
         single offset, so the line has to occupy its height whether or not it has text. -->
    <div
      class="pv2-cell__festival"
      :class="{
        'pv2-cell__festival--holiday': festival?.holiday,
        'pv2-cell__festival--outside': outsideMonth
      }"
    >{{ festival?.name ?? '' }}</div>
    <span v-if="hiddenCount > 0" class="pv2-cell__more">+{{ hiddenCount }}</span>
  </div>
</template>

<script setup lang="ts">
import type { Festival } from '@/utils/festivals'

defineProps<{
  dayNum: number
  today: boolean
  outsideMonth: boolean
  /** Null on an ordinary day; the line still takes its height. See utils/festivals.ts. */
  festival: Festival | null
  /** Events on this day the week's lane budget could not fit. */
  hiddenCount: number
}>()

const emit = defineEmits<{
  cellClick: []
}>()
</script>

<style scoped>
.pv2-cell {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--pv2-line);
  padding: 4px 2px 5px;
  box-sizing: border-box;
  cursor: pointer;
}

/* center，不是 space-between：head 目前只有日期藥丸一個子元素，space-between 等同 flex-start，
   藥丸貼欄左緣、每欄右側空一截，整個月曆讀起來偏左。日後若補右側元素再回頭調整。 */
.pv2-cell__head {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pv2-cell__num {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 3px;
  border-radius: 999px;
  font: 700 13px var(--cd-font-caveat);
  line-height: 1;
  color: var(--pv2-ink);
  text-shadow: 0 1px 3px rgba(var(--pv2-canvas-rgb), 0.9), 0 0 2px rgba(var(--pv2-canvas-rgb), 0.9);
}

/* Today wears the accent, not the ink: in a month of pink chips an ink pill reads as just
   another dark mark, and the one cell a user looks for first should be the loudest thing
   on the grid. */
.pv2-cell__num--today {
  background: var(--pv2-accent);
  color: var(--pv2-on-accent);
  text-shadow: none;
}

.pv2-cell__num--outside {
  color: var(--pv2-line);
  text-shadow: none;
}

/* 8px is the smallest size the CJK festival names stay readable at, and they have to fit a
   1/7 column: 中元節 is three glyphs, 和平紀念日 is six. The long ones are allowed to run to the
   column edge and clip rather than shrink further or wrap into the chips below.
   Height is fixed to month-lanes' CELL.festivalH — the two numbers must agree or the bar
   overlay lands on top of this line. */
.pv2-cell__festival {
  height: 11px;
  margin-top: 1px;
  overflow: hidden;
  text-align: center;
  font: 500 8px/11px var(--cd-font-ui);
  color: var(--pv2-ink-3);
  white-space: nowrap;
}

/* 紅字：日曆對「今天不用上班」的既有語彙，而且是這一行唯一需要一眼看到的資訊。 */
.pv2-cell__festival--holiday {
  color: var(--pv2-holiday);
  font-weight: 700;
}

/* 外月的節日跟著外月的日期一起退到背景，否則上下月的紅字會比本月的日期還搶眼。 */
.pv2-cell__festival--outside {
  opacity: 0.45;
}

/* Pinned to the bottom of the cell rather than following a chip list — the chips live in the
   week's overlay now, so there is nothing here for it to sit after. */
.pv2-cell__more {
  position: absolute;
  right: 3px;
  bottom: 3px;
  font: 400 8px var(--cd-font-mono);
  color: var(--pv2-ink-4);
}
</style>
