<template>
  <!--
    月曆格線的顯示切換：只看行事曆 / 全部。浮在月份標題上方、靠右——
    iOS Notes 把資料夾與 Edit 放的那一排。

    玻璃整組沿用 Pv2BottomNav，底座那層白漸層是刻意留下的。純透明的版本（只有模糊與
    邊緣高光）在有桌布時更好看，但 app 預設沒有桌布（v2-appearance-store 的
    backgroundImage 預設是 null），而且就算設了，DEFAULT_SCRIM_OPACITY 是 0.8——照片會被
    洗到接近白。玻璃沒有東西可以折射就只剩一圈白邊，所以這裡選了在兩種情況下都讀得出來
    的那一版，而不是只在一種情況下漂亮的那一版。

    滑塊的位置由選項索引直接算，不像 Pv2BottomNav 要量 DOM：那裡的欄數由使用者設定決定，
    這裡永遠是兩段等寬，量一次 DOM 只是把一個常數繞遠路。
  -->
  <div class="pv2-typeswitch" role="group" aria-label="月曆顯示內容">
    <div class="pv2-typeswitch__thumb" :style="thumbStyle" aria-hidden="true" />
    <button
      v-for="(o, i) in OPTIONS"
      :key="o.value"
      type="button"
      class="pv2-typeswitch__seg"
      :class="{ 'pv2-typeswitch__seg--on': o.value === modelValue }"
      :aria-label="o.label"
      :aria-pressed="o.value === modelValue"
      @click="emit('update:modelValue', OPTIONS[i]!.value)"
    >
      <span class="pv2-typeswitch__icon" v-html="ICONS[o.value]" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MonthFilter } from '@/stores/ui-store'
import { PV2_NAV_ICON_PATHS } from './pv2-nav-icons'

const props = defineProps<{
  modelValue: MonthFilter
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MonthFilter]
}>()

/** Segment width in px. The thumb's travel is a multiple of it — see .pv2-typeswitch__seg. */
const SEG_W = 42

// Order is the thumb's coordinate system: index 0 sits at rest, index 1 is one SEG_W along.
// 'event' is first because it is the default (ui-store's monthFilter) — a fresh mount has to find
// the thumb already under the icon it parks at, and the resting end of a two-segment track is the
// left one.
const OPTIONS: readonly { value: MonthFilter; label: string }[] = [
  { value: 'event', label: '只看行事曆' },
  { value: 'all', label: '全部' }
]

// Icon-only, so the aria-label above is the whole accessible name — the labels are not decoration.
//
// 'event' IS the nav's own month glyph, imported rather than copied: in this app that shape
// already means "行事曆", and a second copy would be a second definition free to drift.
// 'all' is a 2x2 of rounded squares — drawn on the same 24 grid at stroke 1.7 round, which is
// what makes it sit next to an icon it did not come from.
const ICONS: Record<MonthFilter, string> = {
  event: PV2_NAV_ICON_PATHS.month,
  all: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>'
}

// An unknown value parks the thumb at rest rather than translating it off the track.
const thumbStyle = computed(() => ({
  transform: `translateX(${Math.max(0, OPTIONS.findIndex((o) => o.value === props.modelValue)) * SEG_W}px)`
}))
</script>

<style scoped>
/* The same glass as .pv2-nav, at capsule scale. Height is 36, not the 44 a standalone button
   would take — that is a segmented control's height, and the month header has no room to spend
   on a control that outweighs the title above it. The 44px touch target is restored on the
   segments themselves, where it costs no layout. */
.pv2-typeswitch {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  padding: 3px;
  border-radius: var(--cd-radius-pill);
  border: 1px solid rgba(255, 255, 255, .55);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .72), rgba(255, 255, 255, .46)),
    var(--pv2-canvas);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  box-shadow: var(--cd-shadow-overlay);
}

/* Opaque, still-legible fallback where backdrop-filter isn't supported — same as .pv2-nav. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .pv2-typeswitch {
    background: var(--pv2-canvas);
  }
}

/* top/bottom mirror the track's own 3px padding, so the thumb spans exactly the segment box. */
.pv2-typeswitch__thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: 42px;
  border-radius: var(--cd-radius-pill);
  will-change: transform;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, .55), rgba(255, 255, 255, .18)),
    rgba(var(--pv2-accent-rgb), .12);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, .5);
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, .6),
    0 2px 8px rgba(var(--pv2-ink-rgb), .12);
  transition: transform var(--cd-duration-glass) var(--cd-ease-glass);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .pv2-typeswitch__thumb {
    background: rgba(var(--pv2-accent-rgb), .16);
  }
}

.pv2-typeswitch__seg {
  position: relative;
  z-index: 1;
  flex: none;
  display: grid;
  place-items: center;
  width: 42px;
  height: 30px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  /* --pv2-ink-2, not the nav's --pv2-ink-3: this control can sit over a wallpaper with no
     white row of its own to lean on, and the hint grey lets go of a photo. */
  color: var(--pv2-ink-2);
  transition: color var(--cd-duration-micro-4) var(--cd-ease-standard);
}

/* The 44px touch target, taken outside the layout box: the visible capsule stays 36 tall while
   the tappable area is 44 x 44 centred on each segment. */
.pv2-typeswitch__seg::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

.pv2-typeswitch__seg--on {
  color: var(--pv2-accent);
}

.pv2-typeswitch__icon {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
}

/* The glyph arrives through v-html, so it carries no scope attribute of its own. It is also
   the nav's 24px drawing — sized down here rather than forked at 20. */
.pv2-typeswitch__icon :deep(svg) {
  width: 20px;
  height: 20px;
}

@media (prefers-reduced-motion: reduce) {
  .pv2-typeswitch__thumb {
    transition: none;
  }
}
</style>
