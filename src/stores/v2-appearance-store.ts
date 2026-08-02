import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { publicAssetPath } from '@/utils/public-assets'

// v2 外觀 store：Customization 子頁寫、月曆頁讀。與舊 settings-store 分開，
// 只承載 v2 專屬的整頁背景圖 + 柔紗遮罩，不污染既有設定邏輯。
// 元件分 v1/v2，但這份跨頁狀態集中在此，v2 各頁共用同一實例。

// 遮罩不透明度預設值：越強背景越被白紗蓋住、文字越清楚
// （沿用原三段式的 strong = 0.8，對齊月曆海報 .dc.html 的 SCRIM_OPACITY）。
export const DEFAULT_SCRIM_OPACITY = 0.8

// 使用者可調範圍：0（完全不遮）到 1（全白）。
export const MIN_SCRIM_OPACITY = 0
export const MAX_SCRIM_OPACITY = 1

const clampScrimOpacity = (value: number): number =>
  Math.min(MAX_SCRIM_OPACITY, Math.max(MIN_SCRIM_OPACITY, value))

// 系統預設背景圖（使用者未上傳時使用）。放在 public/ 下，路徑需跟隨部署 base。
export const DEFAULT_BACKGROUND = publicAssetPath('v2-backgrounds/default.jpg')

export const useV2AppearanceStore = defineStore('v2-appearance', () => {
  // 整頁背景圖（data URL 或路徑）。預設為系統預設圖；使用者上傳會覆蓋。
  const backgroundImage = ref<string | null>(DEFAULT_BACKGROUND)
  // 柔紗遮罩不透明度，使用者以滑桿連續調整（0＝無遮罩、1＝全白）
  const scrimOpacityRaw = ref(DEFAULT_SCRIM_OPACITY)

  // 月曆頁的白紗 overlay 不透明度。讀取端一律走這個 computed，
  // 確保就算外部寫進超出範圍的值，套到畫面上的仍在 0–1 之間。
  const scrimOpacity = computed({
    get: () => clampScrimOpacity(scrimOpacityRaw.value),
    set: (value: number) => {
      scrimOpacityRaw.value = clampScrimOpacity(value)
    }
  })

  return { backgroundImage, scrimOpacity }
})
