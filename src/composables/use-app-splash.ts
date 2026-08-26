import { watch } from 'vue'
import { useAuthStore } from '@/stores/auth-store'
import { useTasksStore } from '@/stores/tasks-store'

/*
 * Teardown for the launch animation. The animation itself lives in index.html as
 * pure CSS (the page CSP is script-src 'self', so no inline script can run there);
 * this only decides when it may be dismissed and removes the element.
 *
 * Dismiss conditions:
 *   1. Auth has resolved, and either the user is signed out (going straight to the
 *      sign-in page) or the tasks store has finished loading.
 *   2. Shown for at least MIN_MS, so the brand beat is never cut off mid-play.
 *   3. At most MAX_MS — a slow network must never trap the user behind the splash.
 *
 * Once dismissed, the per-page "loading" states no longer appear on the cold-start
 * path: the data is already there.
 */

// MIN_MS matches the end of the animation's last beat (CADENCE settles at 2.28s),
// so the brand moment is never cut off mid-play.
const MIN_MS = 2_300
const MAX_MS = 6_000
const FADE_MS = 400

let scheduled = false

function removeSplash(): void {
  const el = document.getElementById('cd-splash')
  if (!el) return
  el.classList.add('is-out')
  window.setTimeout(() => el.remove(), FADE_MS)
}

/** Idempotent: repeated calls schedule the teardown only once. */
export function dismissAppSplash(): void {
  if (scheduled) return
  scheduled = true

  // performance.now() is time since page load, so this is how long the splash has
  // already been visible — subtract it so MIN_MS is a floor on total visible time,
  // not an extra delay tacked onto however long the data took.
  const shownFor = performance.now()
  window.setTimeout(removeSplash, Math.max(0, MIN_MS - shownFor))
}

/** Call once, from App.vue. */
export function useAppSplash(): void {
  if (!document.getElementById('cd-splash')) return

  // Fuse: dismiss after MAX_MS no matter what the data is doing.
  window.setTimeout(dismissAppSplash, MAX_MS)

  const auth = useAuthStore()
  const tasks = useTasksStore()

  watch(
    () => auth.isReady && (!auth.isSignedIn || !tasks.isLoading),
    (ready) => {
      if (ready) dismissAppSplash()
    },
    { immediate: true },
  )
}
