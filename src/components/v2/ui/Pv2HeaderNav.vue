<template>
  <!--
    Week/Day header 共用的導覽鈕：只有 TODAY 一顆。
    上/下一個箭頭已移除——換週、換日走手勢滑動，標題列只留「回到今天」這個絕對定位。
  -->
  <div class="pv2-hn">
    <!-- 時鐘圖示沿用月份面板（Pv2MonthSheet）的 TODAY，全 app 同一個「回今天」語彙 -->
    <button type="button" class="pv2-hn__seg pv2-hn__seg--today" :aria-label="todayLabel" @click="emit('today')">
      <svg class="pv2-hn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      Today
    </button>
  </div>
</template>

<script setup lang="ts">
// 標籤由呼叫端給：week 是「回到本週」，day 是「回到今天」，同一顆鈕在兩個語境下唸法不同。
defineProps<{
  todayLabel: string
}>()

const emit = defineEmits<{
  today: []
}>()
</script>

<style scoped>
/* 藥丸外殼：圓角與陰影收在這一層，內層的鈕不再自帶邊框。 */
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

.pv2-hn__seg--today {
  gap: 5px;
  padding: 0 11px;
  color: #6e6e6e;
  /* UI face, not the display face the bottom nav uses: this pill belongs to the week
     and day headers, which are set in the UI face throughout. Weight goes back to 500
     — the display face only ships 400, this one has a real 500. */
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

.pv2-hn__seg:active {
  background: #f0efec;
}
</style>
