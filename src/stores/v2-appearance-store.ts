import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { publicAssetPath } from '@/utils/public-assets'
import { notifySyncError } from '@/lib/notify'
import {
  fetchUserSettings,
  uploadBackground as uploadBackgroundObject,
  deleteBackground,
  publicBackgroundUrl
} from '@/services/user-settings-service'
import { downscaleImage } from '@/utils/image-downscale'
import { persistSettings, registerSettingsSlice } from './user-settings-sync'
import { useAuthStore } from './auth-store'

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

/**
 * How long the slider waits after the last movement before writing.
 *
 * The local value updates synchronously on every event so the scrim tracks the
 * thumb; only the network call is deferred. 500ms is short enough that a user
 * who drags and immediately leaves usually still lands the write (and
 * flushScrimOpacity covers the rest), and long enough that a whole drag is one
 * request rather than dozens.
 */
const SCRIM_WRITE_DEBOUNCE_MS = 500

export const useV2AppearanceStore = defineStore('v2-appearance', () => {
  // The user's uploaded photo, as a storage path. null means "no custom photo",
  // which renders the bundled default.
  const backgroundPath = ref<string | null>(null)
  // 柔紗遮罩不透明度，使用者以滑桿連續調整（0＝無遮罩、1＝全白）
  const scrimOpacityRaw = ref(DEFAULT_SCRIM_OPACITY)

  // Bumped on load and reset. An async result captured before the bump belongs
  // to a previous session and must not write back into the current one — a
  // rollback landing after sign-out would otherwise resurrect the last user's
  // wallpaper for whoever signs in next.
  let generation = 0
  let scrimTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * What the four calendar readers bind to. Kept a plain always-truthy string so
   * MonthPageV2, WeekPageV2, DayPageV2 and the Customization preview need no
   * change and no loading state: a public bucket URL works in `<img src>`
   * exactly like the bundled asset path did.
   */
  const backgroundImage = computed<string>(() =>
    backgroundPath.value ? publicBackgroundUrl(backgroundPath.value) : DEFAULT_BACKGROUND
  )

  /** Drives the Reset-to-default affordance, which only makes sense when there
   *  is something to reset. */
  const hasCustomBackground = computed(() => backgroundPath.value !== null)

  // 月曆頁的白紗 overlay 不透明度。讀取端一律走這個 computed，
  // 確保就算外部寫進超出範圍的值，套到畫面上的仍在 0–1 之間。
  const scrimOpacity = computed({
    get: () => clampScrimOpacity(scrimOpacityRaw.value),
    set: (value: number) => {
      setScrimOpacity(value)
    }
  })

  // This store owns two of the three columns in the shared user_settings row.
  registerSettingsSlice('v2-appearance', () => ({
    backgroundPath: backgroundPath.value,
    scrimOpacity: clampScrimOpacity(scrimOpacityRaw.value)
  }))

  /**
   * Loads the saved preferences. Never rejects: it is awaited inside a
   * Promise.all that the boot file invokes with `void`, so a rejection here
   * would take sibling stores down with it.
   *
   * A failure is deliberately silent. Falling back to the bundled wallpaper is
   * cosmetic and self-evident, not data loss, and a toast on every cold start
   * with flaky network would be noise (same call as title-dismissals-store).
   */
  async function loadFromRemote(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    generation += 1
    const version = generation

    try {
      const remote = await fetchUserSettings(ownerId)
      if (version !== generation) return
      if (!remote) return

      backgroundPath.value = remote.backgroundPath
      scrimOpacityRaw.value = clampScrimOpacity(remote.scrimOpacity)
    } catch {
      // Keep the defaults; see the doc comment.
    }
  }

  function resetLocal(): void {
    generation += 1
    // Cancel rather than flush: a write armed just before sign-out belongs to
    // the session that is ending.
    if (scrimTimer !== null) {
      clearTimeout(scrimTimer)
      scrimTimer = null
    }
    backgroundPath.value = null
    scrimOpacityRaw.value = DEFAULT_SCRIM_OPACITY
  }

  // The value to restore if the pending write fails: the one in force before the
  // current drag began, not the previous intermediate frame. A failed write
  // should undo the whole gesture, not one step of it.
  let pendingRollback = DEFAULT_SCRIM_OPACITY

  /** Sends the debounced write now, if one is pending. */
  function flushScrimOpacity(): void {
    if (scrimTimer === null) return
    clearTimeout(scrimTimer)
    scrimTimer = null
    void writeScrimOpacity(pendingRollback)
  }

  async function writeScrimOpacity(rollbackTo: number): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    const version = generation
    // The value being saved, captured before the rollback. persistSettings()
    // assembles the row from current store state, so the retry has to restore the
    // user's intent first — otherwise it would dutifully re-save the rolled-back
    // value and silently discard the change it was offered to recover.
    const intended = clampScrimOpacity(scrimOpacityRaw.value)

    try {
      await persistSettings(ownerId)
    } catch {
      if (version !== generation) return
      scrimOpacityRaw.value = rollbackTo
      notifySyncError('Could not save the display intensity.', () => {
        scrimOpacityRaw.value = intended
        void writeScrimOpacity(rollbackTo)
      })
    }
  }

  /**
   * Updates the scrim locally at once and schedules the write.
   *
   * The immediate local update is the point: the existing preview comment notes
   * that interpolation makes the scrim lag the thumb and ruins the feel, so
   * only the network call is allowed to wait.
   */
  function setScrimOpacity(value: number): void {
    // Capture the pre-drag value on the first move of a gesture only; subsequent
    // moves keep the original so a mid-drag failure rolls all the way back.
    if (scrimTimer === null) pendingRollback = clampScrimOpacity(scrimOpacityRaw.value)
    const rollbackTo = pendingRollback

    scrimOpacityRaw.value = clampScrimOpacity(value)

    if (scrimTimer !== null) clearTimeout(scrimTimer)
    scrimTimer = setTimeout(() => {
      scrimTimer = null
      void writeScrimOpacity(rollbackTo)
    }, SCRIM_WRITE_DEBOUNCE_MS)
  }

  /**
   * Cleanup that cannot fail the operation it follows.
   *
   * deleteBackground already reports rather than throws, so this is a belt on top
   * of braces — but both call sites sit inside a try that owns a rollback, and a
   * throw there would undo a photo that is already uploaded and saved. Making
   * that structurally impossible is worth three lines.
   */
  async function deleteBackgroundSafely(path: string): Promise<void> {
    try {
      await deleteBackground(path)
    } catch {
      // Orphaned object; invisible to the user.
    }
  }

  /**
   * Uploads a new background, then removes the one it replaced.
   *
   * Order is deliberate: upload, save the row, and only then delete the old
   * object. A crash between steps leaves an orphan nobody can see, whereas
   * deleting first would leave the row pointing at a deleted object — a broken
   * image on the main calendar.
   */
  async function uploadBackground(file: File): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) {
      notifySyncError('Not synced yet — try again in a moment.', () => {
        void uploadBackground(file)
      })
      return
    }

    const version = generation
    const previousPath = backgroundPath.value

    try {
      const compressed = await downscaleImage(file)
      // Downscaling is slow enough on a phone for the session to end inside it.
      // Checking here keeps the upload from writing an object into the previous
      // account's folder for a session that is already over.
      if (version !== generation) return

      const path = await uploadBackgroundObject(compressed, ownerId)
      if (version !== generation) return

      backgroundPath.value = path
      await persistSettings(ownerId)
      if (version !== generation) return

      if (previousPath) {
        // Best-effort by contract: deleteBackground reports success rather than
        // throwing, because the new photo is already live and saved and a failed
        // cleanup must not surface as a failed upload. The outcome is deliberately
        // ignored — an orphaned object is invisible and not worth a toast.
        //
        // Still guarded: this runs inside the try that owns the rollback, so if
        // cleanup ever did throw it would roll back a photo that is already saved
        // and live. Cleanup must not be able to undo the thing it comes after.
        await deleteBackgroundSafely(previousPath)
      }
    } catch {
      if (version !== generation) return
      backgroundPath.value = previousPath
      notifySyncError('Could not save that photo.', () => {
        void uploadBackground(file)
      })
    }
  }

  /**
   * Returns to the bundled default and removes the stored object.
   *
   * Without this the one-way Upload button becomes a trap once photos persist:
   * a user who uploads one they dislike can only cover it with another.
   */
  async function clearBackground(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) {
      notifySyncError('Not synced yet — try again in a moment.', () => {
        void clearBackground()
      })
      return
    }

    const previousPath = backgroundPath.value
    if (!previousPath) return

    const version = generation
    backgroundPath.value = null

    try {
      await persistSettings(ownerId)
      if (version !== generation) return
      // Same best-effort contract as the replace path above.
      await deleteBackgroundSafely(previousPath)
    } catch {
      if (version !== generation) return
      backgroundPath.value = previousPath
      notifySyncError('Could not reset the background.', () => {
        void clearBackground()
      })
    }
  }

  return {
    backgroundImage,
    hasCustomBackground,
    scrimOpacity,
    setScrimOpacity,
    flushScrimOpacity,
    loadFromRemote,
    resetLocal,
    uploadBackground,
    clearBackground
  }
})
