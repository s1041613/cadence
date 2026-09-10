<template>
  <!--
    月曆頁上方的摘要卡（TODAY'S TASKS / UP NEXT 7 DAYS）。

    只畫「最前面那一筆 + 還有幾筆」，不是清單：這張卡的工作是回答「現在該不該點進去」，
    不是取代日檢視。所以標題列右上只給數字，內容區只給一行。

    卡片本身是 button：整張都可點，點擊把最前面那一筆丟回去開 event preview。
    沒有事項時退回不可點的空狀態，而不是留一張看起來能點卻沒反應的卡。
  -->
  <button
    type="button"
    class="pv2-sum"
    :class="{ 'pv2-sum--empty': !lead }"
    :disabled="!lead"
    @click="onTap"
  >
    <span class="pv2-sum__head">
      <span class="pv2-sum__label">{{ label }}</span>
      <span v-if="more > 0" class="pv2-sum__more">+{{ more }}</span>
    </span>

    <span v-if="lead" class="pv2-sum__row">
      <span class="pv2-sum__bar" :style="{ background: lead.color }" />
      <span class="pv2-sum__title">{{ lead.title }}</span>
    </span>
    <span v-else class="pv2-sum__title pv2-sum__title--empty">{{ emptyText }}</span>
  </button>
</template>

<script setup lang="ts">
/** 摘要卡裡的一筆事項：只給要畫的東西，不傳整個 Task。 */
export interface Pv2SummaryItem {
  id: string
  title: string
  /** 事項自己的顏色（象限 / 事件色），左側那條色棒用。 */
  color: string
}

const props = defineProps<{
  /** 卡片標題，設計稿是全大寫小字。 */
  label: string
  /** 排最前面的那一筆；沒有就是空狀態。 */
  lead: Pv2SummaryItem | null
  /** lead 之外還有幾筆，右上角的 +N。0 不畫。 */
  more: number
  emptyText: string
}>()

const emit = defineEmits<{
  select: [id: string, e: MouseEvent]
}>()

function onTap(e: MouseEvent): void {
  if (props.lead) emit('select', props.lead.id, e)
}
</script>

<style scoped>
.pv2-sum {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0; /* grid item 預設 min-width:auto，長標題會把卡片撐爆版 */
  padding: 12px 14px 14px;
  border: 1px solid var(--pv2-card-line);
  border-radius: var(--pv2-radius-card);
  background: var(--pv2-card);
  box-shadow: var(--pv2-shadow-card);
  text-align: left;
  cursor: pointer;
  transition: transform 160ms var(--cd-ease-standard);
}

.pv2-sum:active {
  transform: scale(.985);
  transition: transform 60ms var(--cd-ease-standard);
}

.pv2-sum--empty {
  cursor: default;
}

.pv2-sum__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pv2-sum__label {
  font: 600 10px var(--cd-font-ui);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pv2-ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-sum__more {
  flex: none;
  font: 500 11px var(--cd-font-ui);
  color: var(--pv2-ink-2);
  font-variant-numeric: var(--cd-numeric-aligned);
}

.pv2-sum__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* 色棒是這張卡唯一的顏色來源，所以它得夠實：4px 寬、跟著文字高度走。 */
.pv2-sum__bar {
  flex: none;
  width: 4px;
  height: 15px;
  border-radius: 999px;
}

.pv2-sum__title {
  min-width: 0;
  font: 600 13px var(--cd-font-ui);
  color: var(--pv2-ink);
  /* 一行截斷，不換行：兩張卡並排時高度必須一致，否則整列會歪。 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-sum__title--empty {
  font-weight: 500;
  color: var(--pv2-ink-2);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-sum,
  .pv2-sum:active {
    transition: none;
  }
}
</style>
