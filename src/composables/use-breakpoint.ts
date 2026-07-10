import { ref } from 'vue'

// Module-level singleton: one matchMedia listener shared by every consumer, mirroring
// use-current-time.ts's pattern. Threshold matches --cd-bp-desktop / $cd-bp-desktop (900px) —
// CdDrawerOrSheet consumers (task 3.2 onward) read `isDesktop` to pick 'drawer' vs 'sheet'.
const QUERY = '(min-width: 900px)'
const isDesktop = ref(typeof window === 'undefined' ? true : window.matchMedia(QUERY).matches)
let initialized = false

export function useBreakpoint() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    const mql = window.matchMedia(QUERY)
    mql.addEventListener('change', (e) => {
      isDesktop.value = e.matches
    })
  }
  return { isDesktop }
}
