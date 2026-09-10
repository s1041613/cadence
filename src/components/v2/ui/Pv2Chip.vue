<template>
  <!-- 日曆過濾 chip：# 前綴的藥丸。active 是填色的（設計稿裡兩個都亮），inactive 只剩描邊。 -->
  <button
    type="button"
    class="pv2-chip-tab"
    :class="{ 'pv2-chip-tab--on': active }"
    :aria-pressed="active"
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
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--pv2-chip-off-line);
  background: transparent;
  cursor: pointer;
  /* button 預設會繼承 line-height:normal 撐高藥丸；鎖死字級與行高，藥丸才緊湊如設計稿 */
  font: 600 11px var(--cd-font-ui);
  line-height: 1;
  transition:
    background-color var(--cd-duration-micro-4) var(--cd-ease-standard),
    border-color var(--cd-duration-micro-4) var(--cd-ease-standard);
}

.pv2-chip-tab__label {
  font: inherit;
  letter-spacing: 0.02em;
  line-height: 1;
  color: var(--pv2-ink-2);
}

.pv2-chip-tab__label::before {
  content: '#';
}

/* on 是「這個日曆有在畫」的常態，所以它是填色的柔和面，不是黑底反白——
   一整排都亮著的時候，反白會讓過濾條比月曆本身還搶眼。 */
.pv2-chip-tab--on {
  background: var(--pv2-chip-on);
  border-color: transparent;
}

.pv2-chip-tab--on .pv2-chip-tab__label {
  color: var(--pv2-chip-on-ink);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-chip-tab {
    transition: none;
  }
}
</style>
