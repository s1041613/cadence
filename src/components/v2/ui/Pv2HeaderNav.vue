<template>
  <!--
    Week/Day header 共用的導覽組：上一個 · TODAY · 下一個，三段合成一顆藥丸。
    一體式（segmented）而非三顆分離的鈕：三者同屬「換到哪一天」這一件事，
    合成一組後只讀作一個控制項，且 TODAY 夾在中間＝左右是相對移動、中間是絕對定位。
  -->
  <div class="pv2-hn">
    <button type="button" class="pv2-hn__seg pv2-hn__seg--arrow" :aria-label="prevLabel" @click="emit('prev')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 6 L8 12 L14 18" />
      </svg>
    </button>

    <!-- 時鐘圖示沿用月份面板（Pv2MonthSheet）的 TODAY，全 app 同一個「回今天」語彙 -->
    <button type="button" class="pv2-hn__seg pv2-hn__seg--today" :aria-label="todayLabel" @click="emit('today')">
      <svg class="pv2-hn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      Today
    </button>

    <button type="button" class="pv2-hn__seg pv2-hn__seg--arrow" :aria-label="nextLabel" @click="emit('next')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 6 L16 12 L10 18" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
// 標籤由呼叫端給：week 是「上一週」，day 是「前一天」，同一組鈕在兩個語境下唸法不同。
defineProps<{
  prevLabel: string
  nextLabel: string
  todayLabel: string
}>()

const emit = defineEmits<{
  prev: []
  next: []
  today: []
}>()
</script>

<style scoped>
/* 藥丸外殼：圓角與陰影收在這一層，三段各自不再帶邊框。
   overflow:hidden 讓兩端的分段被外殼的圓角裁切，按下去的底色才不會溢出圓角外。 */
.pv2-hn {
  display: inline-flex;
  align-items: stretch;
  height: 28px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.pv2-hn__seg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
}

/* 分段之間的細線：用 border-left 而不是各段自帶邊框，
   線只出現在段與段之間，藥丸兩端外緣保持乾淨。 */
.pv2-hn__seg + .pv2-hn__seg {
  border-left: 1px solid #e8e6e1;
}

.pv2-hn__seg--arrow {
  width: 30px;
  flex: none;
}

.pv2-hn__seg--today {
  gap: 5px;
  padding: 0 11px;
  color: #6e6e6e;
  font: 500 9.5px var(--cd-font-ui);
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}

.pv2-hn__icon {
  width: 11px;
  height: 11px;
  flex: none;
}

/* 按下去只有該段變色，分段邊界因此看得出來是三個獨立目標 */
.pv2-hn__seg:active {
  background: #f0efec;
}
</style>
