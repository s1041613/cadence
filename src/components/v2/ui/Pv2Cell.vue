<template>
  <!--
    月曆單日格。日期數字置中，today 是實心 rose 圓、非 today 深藍墨、外月淡灰。
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
    <span v-if="hiddenCount > 0" class="pv2-cell__more">+{{ hiddenCount }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dayNum: number
  today: boolean
  outsideMonth: boolean
  /** Events on this day the week's lane budget could not fit. */
  hiddenCount: number
}>()

const emit = defineEmits<{
  cellClick: []
}>()
</script>

<style scoped>
/* padding / head 尺寸與 month-lanes 的 CELL 常數是同一組數字：那邊算「一列塞得下幾條」，
   這邊畫格子本身，對不上就會多畫或少畫一條 chip。改這裡要一起改 CELL。 */
.pv2-cell {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-bottom: 1px solid var(--pv2-line);
  padding: 3px 1px 4px;
  box-sizing: border-box;
  cursor: pointer;
}

.pv2-cell__head {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px; /* = CELL.headH */
}

/* 圓形而非藥丸：today 是實心圓，一位數與兩位數要同樣大小，所以寬高都鎖 24。 */
.pv2-cell__num {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font: 500 15px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  line-height: 1;
  color: var(--pv2-ink);
}

.pv2-cell__num--today {
  background: var(--pv2-rose);
  color: #fff;
  font-weight: 600;
}

.pv2-cell__num--outside {
  color: var(--pv2-ink-3);
}

/* Pinned to the bottom of the cell rather than following a chip list — the chips live in the
   week's overlay now, so there is nothing here for it to sit after. */
.pv2-cell__more {
  position: absolute;
  right: 4px;
  bottom: 2px;
  font: 500 8px var(--cd-font-ui);
  color: var(--pv2-ink-2);
}
</style>
