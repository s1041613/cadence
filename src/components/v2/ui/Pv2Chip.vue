<template>
  <!-- 日曆過濾 chip：藥丸，# 前綴。active 淺粉底粉字、inactive 透明底描邊灰字。 -->
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

/* 選中＝淺粉底 + 粉字，與底部 nav 的選中態同一套語彙：這個粉在 app 裡講的就是
   「你在這個上面」。外框收掉——底色就是訊號了，再加一圈線只會讓兩種狀態都像有框。

   注意：--pv2-accent 的文字對這層淺粉底約 3:1，而這個標籤是 11px。設計的粉就是這個值，
   記在這裡而不是自己換一個色；要提高對比就是把 --pv2-accent 壓深，兩個狀態一起變。 */
.pv2-chip-tab--on {
  background: rgba(var(--pv2-accent-rgb), 0.12);
  border-color: transparent;
}

.pv2-chip-tab--on .pv2-chip-tab__label {
  color: var(--pv2-accent);
}
</style>
