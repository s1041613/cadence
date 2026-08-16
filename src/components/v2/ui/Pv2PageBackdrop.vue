<template>
  <!--
    共用桌布層：使用者背景圖 + 白紗遮罩。內容頁（Month / Day / Week / Notes）掛這個，
    Settings 不掛 —— 工具頁維持素面畫布，那是規則不是遺漏。

    沒有 props：三頁原本各自 import store 再往下傳同樣兩個值，所以直接讀 store。
    使用者可以清空背景圖，v-if 讓那個狀態落回 frame 的底色。

    寄主 frame 必須提供：
      - position: relative 與 isolation: isolate（背景層是 z-index: -1，需要一個
        堆疊脈絡把它關在 frame 內，否則會沉到 frame 底下）
      - --pv2-safe-top，即 frame 自己的 padding-top（見下方負 top 的說明）
  -->
  <template v-if="appearance.backgroundImage">
    <img :src="appearance.backgroundImage" alt="" class="pv2-backdrop__image" />
    <div
      class="pv2-backdrop__scrim"
      :style="{ opacity: appearance.scrimOpacity }"
    />
  </template>
</template>

<script setup lang="ts">
import { useV2AppearanceStore } from '@/stores/v2-appearance-store'

const appearance = useV2AppearanceStore()
</script>

<style scoped>
/*
  兩層都用負 top 抵回寄主的 padding-top：absolute 的 inset 錨定 padding-box 內緣，
  不抵銷的話背景會從 safe-area 之後才開始、頂部露出一條底色（白帶）。
*/
.pv2-backdrop__image {
  position: absolute;
  top: calc(-1 * var(--pv2-safe-top));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  width: 100%;
  /* 顯式 height，讓 <img> 填滿 frame + 被抵銷掉的 safe-area。只給 width: 100%
     的話它會停在內在（auto）高度，object-fit: cover 沒有東西可以 cover，
     圖片會在中途斷掉。 */
  height: calc(100% + var(--pv2-safe-top));
  object-fit: cover;
  pointer-events: none;
}

/* 白紗遮罩：opacity 由 store 的 scrimOpacity 控制，越強背景越淡、文字越清楚 */
.pv2-backdrop__scrim {
  position: absolute;
  top: calc(-1 * var(--pv2-safe-top));
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  background: var(--cd-surface-canvas);
  pointer-events: none;
  transition: opacity 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .pv2-backdrop__scrim {
    transition: none;
  }
}
</style>
