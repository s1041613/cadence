<template>
  <!--
    可愛 ↔ 清楚 的切換鈕（眼睛）。只在有桌布時存在：沒有照片就沒有東西可以收掉。
    清楚模式時填 accent，讓「現在看到的不是平常的樣子」一眼可見——它不會被記住，
    所以按下去的狀態要自己說話。
  -->
  <button
    v-if="mode.available.value"
    type="button"
    class="pv2-bt"
    :class="{ 'pv2-bt--on': mode.clear.value }"
    :style="{ '--pv2-bt-size': `${size}px` }"
    :aria-pressed="mode.clear.value"
    :aria-label="mode.clear.value ? '顯示背景' : '隱藏背景，切換成清楚模式'"
    @click="mode.toggle"
  >
    <svg class="pv2-bt__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useBackdropMode } from '@/composables/use-backdrop-mode'

withDefaults(
  defineProps<{
    /** Matched to the control it sits beside: 28 next to the day header's pills, 38 next to the
     *  month view's segmented switch. */
    size?: number
  }>(),
  { size: 28 }
)

const mode = useBackdropMode()
</script>

<style scoped>
/* The same white capsule the day header's TODAY pill wears, as a circle. On a bare page that
   white has nothing behind it to read against, so the hairline keeps its edge. */
.pv2-bt {
  position: relative;
  flex: none;
  display: inline-grid;
  place-items: center;
  width: var(--pv2-bt-size);
  height: var(--pv2-bt-size);
  padding: 0;
  border: 1px solid var(--pv2-line-soft);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  color: var(--pv2-ink-2);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* 44px touch target without spending the layout on it, same trick as Pv2TypeSwitch. */
.pv2-bt::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

.pv2-bt--on {
  border-color: transparent;
  background: var(--pv2-accent);
  color: var(--pv2-on-accent);
}

.pv2-bt__icon {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linejoin: round;
}

@media (prefers-reduced-motion: reduce) {
  .pv2-bt {
    transition: none;
  }
}
</style>
