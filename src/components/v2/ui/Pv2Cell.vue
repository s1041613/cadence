<template>
  <!--
    月曆單日格。日期數字 Caveat 藥丸：today 黑底白字、非 today 深色 + 可讀陰影、外月淡色。
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
.pv2-cell {
  position: relative;
  min-height: 0;
  overflow: hidden;
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
  min-width: 24px;
  height: 24px;
  padding: 0 3px;
  border-radius: 999px;
  font: 700 17px var(--cd-font-caveat);
  line-height: 1;
  color: #1b1b1b;
}

.pv2-cell__num--today {
  background: #1b1b1b;
  color: #fafaf9;
}

.pv2-cell__num--outside {
  color: #cdcdcd;
}

/* Pinned to the bottom of the cell rather than following a chip list — the chips live in the
   week's overlay now, so there is nothing here for it to sit after. */
.pv2-cell__more {
  position: absolute;
  right: 3px;
  bottom: 3px;
  font: 400 8px var(--cd-font-mono);
  color: #b2b2b2;
}
</style>
