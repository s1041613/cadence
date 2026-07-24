import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// v2 外觀 store：Customization 子頁寫、月曆頁讀。與舊 settings-store 分開，
// 只承載 v2 專屬的整頁背景圖 + 柔紗遮罩，不污染既有設定邏輯。
// 元件分 v1/v2，但這份跨頁狀態集中在此，v2 各頁共用同一實例。

export type PhotoIntensity = 'none' | 'soft' | 'strong'

// 遮罩不透明度：越強背景越被白紗蓋住、文字越清楚（對齊月曆海報 .dc.html 的 SCRIM_OPACITY）。
const SCRIM_OPACITY: Record<PhotoIntensity, number> = {
  none: 0,
  soft: 0.5,
  strong: 0.8
}

// 系統預設背景圖（使用者未上傳時使用）。放在 public/ 下，以絕對路徑引用。
export const DEFAULT_BACKGROUND = '/v2-backgrounds/default.jpg'

export const useV2AppearanceStore = defineStore('v2-appearance', () => {
  // 整頁背景圖（data URL 或路徑）。預設為系統預設圖；使用者上傳會覆蓋。
  const backgroundImage = ref<string | null>(DEFAULT_BACKGROUND)
  // 柔紗遮罩強度
  const photoIntensity = ref<PhotoIntensity>('soft')

  // 月曆頁的白紗 overlay 不透明度（0＝無遮罩）
  const scrimOpacity = computed(() => SCRIM_OPACITY[photoIntensity.value])

  return { backgroundImage, photoIntensity, scrimOpacity }
})
