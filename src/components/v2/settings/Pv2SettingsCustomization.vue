<template>
  <!--
    v2 設定 · Customization 子頁（照設計稿）。背景圖上傳 + 顯示強度三段。
    接 settings-store（v1/v2 共用）：backgroundImage + photoIntensity。月曆頁讀同一份即時反映。
  -->
  <div class="pv2-cust">
    <header class="pv2-cust__head">
      <button type="button" class="pv2-cust__back" aria-label="返回" @click="emit('back')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5 L8 12 L15 19" />
        </svg>
      </button>
      <h1 class="pv2-cust__title">Customization</h1>
    </header>

    <div class="pv2-cust__scroll">
      <!-- 背景圖 -->
      <p class="pv2-cust__group-label">Background Image</p>
      <div class="pv2-cust__card">
        <div class="pv2-cust__preview">
          <img v-if="bgPreview" :src="bgPreview" alt="" class="pv2-cust__preview-img" />
          <span v-else class="pv2-cust__preview-empty">尚未設定背景圖</span>
          <!-- 白紗遮罩即時預覽：切 intensity 時這裡的圖就跟著變濛（與月曆頁同一份 scrimOpacity） -->
          <div class="pv2-cust__preview-scrim" :style="{ opacity: appearance.scrimOpacity }" />
        </div>
        <button type="button" class="pv2-cust__upload" @click="onUploadClick">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fafaf9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16 V4 M7 9 l5-5 5 5 M5 20 h14" />
          </svg>
          Upload image
        </button>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
        <p class="pv2-cust__caption">Drop or tap the preview to replace · hover it to reframe</p>
      </div>

      <!-- 顯示強度 -->
      <p class="pv2-cust__group-label">Display Intensity</p>
      <div class="pv2-cust__card">
        <div class="pv2-cust__segmented">
          <button
            v-for="opt in INTENSITY"
            :key="opt.key"
            type="button"
            class="pv2-cust__seg"
            :class="{ 'pv2-cust__seg--on': intensity === opt.key }"
            @click="intensity = opt.key"
          >
            {{ opt.label }}
          </button>
        </div>
        <p class="pv2-cust__caption pv2-cust__caption--pad">
          Higher intensity fades the photo behind a lighter veil, keeping dates and events easy to read.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useV2AppearanceStore, type PhotoIntensity } from '@/stores/v2-appearance-store'

const emit = defineEmits<{
  back: []
}>()

const INTENSITY: Array<{ key: PhotoIntensity; label: string }> = [
  { key: 'none', label: 'None' },
  { key: 'soft', label: 'Soft' },
  { key: 'strong', label: 'Strong' }
]

// 接 v2 外觀 store（月曆頁讀同一份，即時反映）
const appearance = useV2AppearanceStore()
const { backgroundImage: bgPreview, photoIntensity: intensity } = storeToRefs(appearance)
const fileInput = ref<HTMLInputElement | null>(null)

function onUploadClick(): void {
  fileInput.value?.click()
}

function onFileChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    bgPreview.value = reader.result as string
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.pv2-cust {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  /* Same as Pv2SettingsRoot: inherit the frame's paper so the safe-area band above
     the header matches the content, no lighter stripe. */
  background: transparent;
}

.pv2-cust__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px 16px;
  border-bottom: 1px solid #e2e2e2;
}

.pv2-cust__back {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #d6d6d0;
  background: #fff;
  cursor: pointer;
}

.pv2-cust__title {
  margin: 0;
  font: 400 30px var(--cd-font-serif);
  line-height: 1;
  color: #1b1b1b;
}

.pv2-cust__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px 24px;
}

.pv2-cust__group-label {
  margin: 0 0 10px 4px;
  font: 600 10px var(--cd-font-mono);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #9c9c9c;
}

.pv2-cust__group-label:not(:first-child) {
  margin-top: 24px;
}

/* 卡片：邊框無陰影，照設計稿 */
.pv2-cust__card {
  border: 1px solid #e2e2e2;
  border-radius: 16px;
  background: #fff;
  padding: 16px;
}

/* 背景圖預覽：固定 190px 高，照設計稿 */
.pv2-cust__preview {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 190px;
  border: 1px solid #e2e2e2;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
}

/* 預覽框內的白紗遮罩：opacity 綁 scrimOpacity，切 intensity 即時反映 */
.pv2-cust__preview-scrim {
  position: absolute;
  inset: 0;
  background: #fff;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  .pv2-cust__preview-scrim {
    transition: none;
  }
}

.pv2-cust__preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pv2-cust__preview-empty {
  font: 400 13px var(--cd-font-ui);
  color: #b0b0aa;
}

.pv2-cust__upload {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: #1b1b1b;
  color: #fff;
  font: 600 12px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.pv2-cust__caption {
  margin: 10px 0 0;
  text-align: center;
  font: 400 11px var(--cd-font-ui);
  color: #9c9c9c;
  line-height: 1.5;
}

.pv2-cust__caption--pad {
  text-align: left;
  margin-top: 12px;
}

/* 三段式 */
.pv2-cust__segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: #efefef;
}

.pv2-cust__seg {
  padding: 10px 0;
  border: none;
  border-radius: 9px;
  background: transparent;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6e6e6e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pv2-cust__seg--on {
  background: #1b1b1b;
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .pv2-cust__seg {
    transition: none;
  }
}
</style>
