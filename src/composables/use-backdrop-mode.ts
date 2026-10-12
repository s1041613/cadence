import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { useV2AppearanceStore } from '@/stores/v2-appearance-store'

/**
 * The two ways a page with a wallpaper can be read.
 *
 * - cute (the default): the photo shows, and the page's own ink turns light to sit on it. The
 *   month grid trades its chips for dots, so the photo is not buried under labels.
 * - clear (the eye button): the photo is dropped and the page falls back to its plain-canvas
 *   look, which is what it has always looked like with no wallpaper set.
 *
 * Deliberately not stored: every page opens cute. The state lives in the page component that
 * provides it, so leaving the page — or reloading — resets it.
 */
export interface BackdropMode {
  /** The user asked for the plain page. Meaningless without a wallpaper. */
  clear: Ref<boolean>
  /** There is a wallpaper AND it is being shown with the light-ink treatment. */
  cute: ComputedRef<boolean>
  /** A wallpaper is set, so the toggle has something to toggle. */
  available: ComputedRef<boolean>
  toggle: () => void
}

const KEY: InjectionKey<BackdropMode> = Symbol('backdrop-mode')

/** Exported for tests; pages go through provideBackdropMode. */
export function createBackdropMode(optIn: boolean): BackdropMode {
  const appearance = useV2AppearanceStore()
  const clear = ref(false)
  const available = computed(() => optIn && appearance.backgroundImage !== null)
  const cute = computed(() => available.value && !clear.value)
  return {
    clear,
    cute,
    available,
    toggle: () => {
      clear.value = !clear.value
    }
  }
}

/** Called by a page shell that takes part in cute/clear (Month, Day). */
export function provideBackdropMode(): BackdropMode {
  const mode = createBackdropMode(true)
  provide(KEY, mode)
  return mode
}

/**
 * Read by the backdrop and by the components that restyle for cute. A page that never provided a
 * mode (Week) gets one that is never cute and never clear, so it keeps the wallpaper exactly as
 * it was before this mode existed.
 */
export function useBackdropMode(): BackdropMode {
  return inject(KEY, null) ?? createBackdropMode(false)
}
