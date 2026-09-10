<template>
  <!-- 日曆過濾 chip：藥丸，# 前綴。active 淺灰底深字、inactive 透明底描邊。 -->
  <button
    type="button"
    class="pv2-chip-tab"
    :class="{ 'pv2-chip-tab--on': active }"
    @click="emit('toggle')"
  >
    <span class="pv2-chip-tab__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  active: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.pv2-chip-tab {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid var(--pv2-line);
  background: transparent;
  cursor: pointer;
  /* button 預設會繼承 line-height:normal 撐高藥丸；鎖死字級與行高，藥丸才緊湊如設計稿 */
  font: 600 11px var(--cd-font-ui);
  line-height: 1;
}

.pv2-chip-tab__label {
  font: inherit;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--pv2-ink-3);
}

.pv2-chip-tab__label::before {
  content: '#';
}

/* 選中＝填一層淺色，不是塗成一顆墨球：這排 chip 是篩選器，不是這頁的主角，
   而且多開幾本日曆時，一整排深色藥丸會比它們篩的月曆本身還搶眼。 */
.pv2-chip-tab--on {
  background: var(--pv2-fill);
  border-color: var(--pv2-line);
}

.pv2-chip-tab--on .pv2-chip-tab__label {
  color: var(--pv2-ink);
}
</style>
