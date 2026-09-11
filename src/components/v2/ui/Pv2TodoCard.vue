<template>
  <!--
    月曆標題下的待辦小卡（照參考圖的雙卡版面）。一張卡＝一份清單：
    左上標籤、右上 +N（沒顯示出來的還有幾筆）、下面一行最該做的那一筆。

    A card shows ONE item, not a list. Two of these sit above a whole month grid — the space
    pays for a glance, not for reading, and the count is what says "there is more". Tapping the
    item opens the same preview the month chips open, so the card is a shortcut into the day's
    work rather than a second place to manage it.
  -->
  <div class="pv2-todo" :class="{ 'pv2-todo--empty': !item }">
    <div class="pv2-todo__head">
      <span class="pv2-todo__label">{{ label }}</span>
      <span v-if="remaining > 0" class="pv2-todo__more">+{{ remaining }}</span>
    </div>

    <button v-if="item" type="button" class="pv2-todo__item" @click="emit('itemClick', item.id, $event)">
      <span class="pv2-todo__dot" :style="{ background: item.color }" />
      <span class="pv2-todo__title">{{ item.title }}</span>
    </button>
    <span v-else class="pv2-todo__none">{{ emptyText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Pv2TodoItem {
  id: string
  title: string
  /** The task's quadrant colour — the same mark the month grid gives it. */
  color: string
}

const props = withDefaults(
  defineProps<{
    label: string
    /** Everything in this list, not just what is shown: the count is derived, never passed in. */
    total: number
    item: Pv2TodoItem | null
    emptyText?: string
  }>(),
  { emptyText: '沒有待辦' }
)

const emit = defineEmits<{
  itemClick: [id: string, event: MouseEvent]
}>()

// The card renders one item, so the badge is everything else. Derived rather than a prop because
// a caller that computed it itself is a caller that can get it wrong by one.
const remaining = computed(() => Math.max(0, props.total - (props.item ? 1 : 0)))
</script>

<style scoped>
.pv2-todo {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  padding: 18px 16px 20px;
  border-radius: 18px;
  /* A white card with a soft lift, not a tinted panel: everything else on this page is drawn
     flat onto the paper, so the two cards are the one thing that sits ON it — that is what
     makes them read as a summary of somewhere else rather than as part of the grid. */
  background: #fff;
  box-shadow: 0 2px 10px rgba(var(--pv2-ink-rgb), 0.06);
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.pv2-todo__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* Uppercase and wide-tracked: it is a section marker, not a sentence, and at this size the
   tracking is what stops it reading as a shrunken heading. */
.pv2-todo__label {
  font: 500 10px var(--cd-font-ui);
  letter-spacing: 0.06em;
  color: var(--pv2-ink-3);
}

.pv2-todo__more {
  flex: none;
  font: 500 10px var(--cd-font-ui);
  font-variant-numeric: var(--cd-numeric-aligned);
  color: var(--pv2-ink-3);
}

/* A button, not a div: it opens the task, so it has to be reachable by keyboard and announce
   itself. The reset is here because the app's global button styles do not cover this shape. */
.pv2-todo__item {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.pv2-todo__dot {
  flex: none;
  width: 4px;
  height: 13px;
  border-radius: 3px;
}

.pv2-todo__title {
  min-width: 0;
  font: 700 13px var(--cd-font-ui);
  color: var(--pv2-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Same height as an item row so an empty card does not shrink and leave the pair uneven. */
.pv2-todo__none {
  font: 500 13px/13px var(--cd-font-ui);
  color: var(--pv2-ink-3);
}
</style>
