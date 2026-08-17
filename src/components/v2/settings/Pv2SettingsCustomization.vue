<template>
  <!--
    v2 設定 · Customization 子頁。背景圖上傳 + 顯示強度滑桿。
    接 v2-appearance-store：backgroundImage + scrimOpacity。月曆頁讀同一份即時反映。
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
        <button type="button" class="pv2-cust__upload" :disabled="busy" @click="onUploadClick">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fafaf9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16 V4 M7 9 l5-5 5 5 M5 20 h14" />
          </svg>
          {{ uploading ? 'Uploading…' : 'Upload image' }}
        </button>
        <!-- Only the formats the public bucket will serve safely; see ACCEPTED_TYPES.
             The attribute is a picker hint, and the handler re-checks. -->
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          @change="onFileChange"
        />
        <!-- Shown only when there is something to reset. Without it the Upload button
             is one-way: a photo the user regrets can only be covered, never removed. -->
        <button
          v-if="hasCustomBackground"
          type="button"
          class="pv2-cust__reset"
          :disabled="busy"
          @click="onResetBackground"
        >
          Reset to default
        </button>
        <p class="pv2-cust__caption">Drop or tap the preview to replace · hover it to reframe</p>
      </div>

      <!-- Display intensity: a continuous slider; the preview above fades as it moves -->
      <p class="pv2-cust__group-label">Display Intensity</p>
      <div class="pv2-cust__card">
        <div class="pv2-cust__slider-row">
          <input
            v-model.number="intensityPercent"
            type="range"
            class="pv2-cust__slider"
            :min="0"
            :max="100"
            step="any"
            aria-label="Display intensity"
            :aria-valuetext="`${intensityLabel} percent`"
          />
          <span class="pv2-cust__slider-value">{{ intensityLabel }}%</span>
        </div>
        <p class="pv2-cust__caption pv2-cust__caption--pad">
          Higher intensity fades the photo behind a lighter veil, keeping dates and events easy to read.
        </p>
      </div>

      <!-- Navigation: opens the Tab bar sub-page for configuring the bottom tabs.
           Sits last because it navigates away, while the sections above edit in place. -->
      <p class="pv2-cust__group-label">Navigation</p>
      <div class="pv2-cust__card pv2-cust__card--rows">
        <button type="button" class="pv2-cust__row" @click="emit('openTabs')">
          <span class="pv2-cust__row-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.5" y="7" width="19" height="10" rx="3" />
              <path d="M8.5 7 V17 M15.5 7 V17" />
            </svg>
          </span>
          <span class="pv2-cust__row-text">
            <span class="pv2-cust__row-label">Tab bar</span>
            <span class="pv2-cust__row-sub">{{ tabSummary }}</span>
          </span>
          <span class="pv2-cust__chev" aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useV2AppearanceStore } from '@/stores/v2-appearance-store'
import { useV2TabsStore } from '@/stores/v2-tabs-store'
import { notifySyncError } from '@/lib/notify'

const emit = defineEmits<{
  back: []
  openTabs: []
}>()

// The summary shows the committed tab order, not the Tab bar pane's in-progress draft
const tabsStore = useV2TabsStore()
const tabSummary = computed(() => tabsStore.shownTabs.map((t) => t.title).join(' · '))

// 接 v2 外觀 store（月曆頁讀同一份，即時反映）
const appearance = useV2AppearanceStore()
// backgroundImage is a computed on the store now (path → public URL, or the bundled
// default), so it is read-only here; uploads and resets go through actions.
const { backgroundImage: bgPreview, scrimOpacity, hasCustomBackground } = storeToRefs(appearance)

// store 存 0–1 的 opacity，滑桿以 0–100 呈現：讀寫都在此換算，store 不需要知道 UI 單位。
const intensityPercent = computed({
  get: () => scrimOpacity.value * 100,
  set: (value: number) => {
    scrimOpacity.value = value / 100
  }
})

// step="any" 會給出小數，顯示時取整數避免數字跳動看起來雜亂。
const intensityLabel = computed(() => Math.round(intensityPercent.value))
const fileInput = ref<HTMLInputElement | null>(null)
// Which operation is running, not merely whether one is. Both buttons disable
// together — two concurrent writes to the same row would race — but only the
// upload button relabels, because "Uploading…" on a reset would be a lie.
const pending = ref<'upload' | 'reset' | null>(null)
const busy = computed(() => pending.value !== null)
const uploading = computed(() => pending.value === 'upload')

// The store debounces the slider's write by 500ms. Leaving the pane within that
// window would otherwise drop a deliberate adjustment, so flush on the way out.
// Best-effort only: it cannot cover a hard tab close.
onBeforeUnmount(() => {
  appearance.flushScrimOpacity()
})

// Accepted upload formats. SVG is deliberately excluded: backgrounds live in a
// public bucket, and a user-supplied SVG served from our own origin is a stored
// XSS vector if it is ever opened as a top-level document.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Ceiling on the *picked* file. The store downscales before upload, so this only
// exists to stop a pathological input from OOMing the decode on a phone.
const MAX_FILE_BYTES = 25 * 1024 * 1024

function onUploadClick(): void {
  if (busy.value) return
  fileInput.value?.click()
}

async function onFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // Clearing the value lets the same file be picked twice in a row; without it a
  // retry after a failed upload silently fires no change event at all.
  input.value = ''
  if (!file || busy.value) return

  if (!ACCEPTED_TYPES.includes(file.type)) {
    notifySyncError('That file type is not supported — use a JPEG, PNG or WebP.', () => {
      onUploadClick()
    })
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    notifySyncError('That image is too large — pick one under 25 MB.', () => {
      onUploadClick()
    })
    return
  }

  pending.value = 'upload'
  try {
    await appearance.uploadBackground(file)
  } finally {
    pending.value = null
  }
}

async function onResetBackground(): Promise<void> {
  if (busy.value) return
  pending.value = 'reset'
  try {
    await appearance.clearBackground()
  } finally {
    pending.value = null
  }
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

/* Same 22px column as Pv2SettingsRoot's title, so the header does not shift sideways when
   the pane switches. */
.pv2-cust__head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 22px 16px;
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

/* This card's rows are tappable edge to edge, so the card itself carries no padding */
.pv2-cust__card--rows {
  padding: 0;
  overflow: hidden;
}

.pv2-cust__row {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.pv2-cust__row-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
}

.pv2-cust__row-text {
  flex: 1;
  min-width: 0;
}

.pv2-cust__row-label {
  display: block;
  font: 600 13px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #1b1b1b;
}

.pv2-cust__row-sub {
  display: block;
  margin-top: 3px;
  font: 400 11px var(--cd-font-mono);
  color: #9c9c9c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pv2-cust__chev {
  flex: none;
  font-size: 18px;
  line-height: 1;
  color: #c4c4c4;
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

/* 預覽框內的白紗遮罩：opacity 綁 scrimOpacity，拖曳滑桿即時反映。
   刻意不加 transition —— 連續滑桿下補間會讓預覽落後拇指一拍，手感變鈍。 */
.pv2-cust__preview-scrim {
  position: absolute;
  inset: 0;
  background: #fff;
  pointer-events: none;
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

.pv2-cust__upload:disabled {
  opacity: 0.55;
  cursor: default;
}

/* Reset: deliberately the quietest thing in the card. It borrows the caption's grey
   rather than the upload button's fill, because resetting is a rare, recoverable
   action that should not compete with the primary one. */
.pv2-cust__reset {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 4px;
  border: none;
  background: none;
  color: #9c9c9c;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.pv2-cust__reset:disabled {
  opacity: 0.55;
  cursor: default;
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

/* 強度滑桿：滑軌與讀數同列，讀數等寬避免拖曳時左右抖動 */
.pv2-cust__slider-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 2px 2px 0;
}

.pv2-cust__slider-value {
  flex: none;
  min-width: 44px;
  text-align: right;
  font: 600 11px var(--cd-font-mono);
  letter-spacing: 0.08em;
  color: #6e6e6e;
  /* 數字寬度固定，0% → 100% 不會推擠滑軌 */
  font-variant-numeric: tabular-nums;
}

.pv2-cust__slider {
  flex: 1;
  min-width: 0;
  /* 觸控目標高於視覺滑軌，指頭好按 */
  height: 28px;
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.pv2-cust__slider::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: #e2e2e2;
}

.pv2-cust__slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: #e2e2e2;
}

/* Firefox 專用：已選區間著墨色，Chromium 端則靠 track 底色 + thumb 位置表達 */
.pv2-cust__slider::-moz-range-progress {
  height: 4px;
  border-radius: 2px;
  background: #1b1b1b;
}

.pv2-cust__slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #1b1b1b;
  /* 4px 軌道置中：(18 - 4) / 2 = 7 */
  margin-top: -7px;
}

.pv2-cust__slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #1b1b1b;
}

.pv2-cust__slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px rgb(27 27 27 / 0.2);
}

.pv2-cust__slider:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 3px rgb(27 27 27 / 0.2);
}

.pv2-cust__slider:focus {
  outline: none;
}
</style>
