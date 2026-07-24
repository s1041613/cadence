<template>
  <!-- 日曆過濾 chip：mono 藥丸，# 前綴。active 黑底白字、inactive 透明底描邊。 -->
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
  border: 1px solid #cdcdcd;
  background: transparent;
  cursor: pointer;
  /* button 預設會繼承 line-height:normal 撐高藥丸；鎖死字級與行高，藥丸才緊湊如設計稿 */
  font: 600 10px var(--cd-font-mono);
  line-height: 1;
}

.pv2-chip-tab__label {
  font: inherit;
  letter-spacing: 0.03em;
  line-height: 1;
  color: #6e6e6e;
}

.pv2-chip-tab__label::before {
  content: '#';
}

.pv2-chip-tab--on {
  background: #1b1b1b;
  border-color: #1b1b1b;
}

.pv2-chip-tab--on .pv2-chip-tab__label {
  color: #fafaf9;
}
</style>
