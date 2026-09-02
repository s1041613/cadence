import { computed, ref, type ComputedRef, type Ref } from 'vue'

// Module-level singleton: one matchMedia listener per query, shared by every consumer,
// mirroring use-current-time.ts's pattern.
//
// Two independent queries, not one three-way ladder, because they answer different
// questions and only one of them is load-bearing for the legacy layout:
//
//   isDesktop — the original phone/desktop split, threshold matched to --cd-bp-desktop /
//     $cd-bp-desktop (900px). The whole legacy generation reads this to pick 'drawer' vs
//     'sheet' and desktop vs phone month metrics, so its meaning must not move.
//
//   isTablet — carved out of that desktop half for the v2 shells. Above 900px they centre a
//     393x852 phone frame on grey, which is a preview of the design on a desktop browser,
//     not an app. A tablet landed in that branch got the mock: an iPad in landscape (1024
//     wide, 768 tall) showed a phone-sized card whose bottom — nav pill included — was
//     clipped by the shell's overflow. Tablets take the full-bleed branch instead, the same
//     one they already got in portrait, so the app fills the glass in both orientations.
//
// The pointer clause is what makes a landscape tablet a tablet. Width alone cannot separate
// an iPad in landscape (1024, and 1366 on the 12.9") from a desktop browser window narrowed
// to the same number, and the device frame is the right answer for one and not the other.
// `pointer: coarse` reports the PRIMARY input, so a trackpad laptop stays fine-pointered and
// keeps its frame, while an iPad reads coarse in both orientations and gets the app. The
// width-only first clause is kept so the tablet layout is still reachable by resizing a
// desktop browser, which is how it gets looked at during development.
const DESKTOP_QUERY = '(min-width: 900px)'
const TABLET_QUERY =
  '(min-width: 600px) and (max-width: 1023.98px), (min-width: 600px) and (max-width: 1366px) and (pointer: coarse)'

const isDesktop = ref(typeof window === 'undefined' ? true : window.matchMedia(DESKTOP_QUERY).matches)
const isTablet = ref(typeof window === 'undefined' ? false : window.matchMedia(TABLET_QUERY).matches)
let initialized = false

/**
 * Which shell a v2 page renders: 'phone' and 'tablet' are both full-bleed and differ only in
 * how much glass they fill, 'desktop' is the centred device-frame mock.
 *
 * Tablet wins over desktop where both match (a coarse 1024px viewport matches each) — that
 * precedence is the whole point of the band, so a tablet never falls into the mock.
 */
export type Layout = 'phone' | 'tablet' | 'desktop'

const layout = computed<Layout>(() =>
  isTablet.value ? 'tablet' : isDesktop.value ? 'desktop' : 'phone'
)

export function useBreakpoint(): {
  isDesktop: Ref<boolean>
  isTablet: Ref<boolean>
  layout: ComputedRef<Layout>
} {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    const desktopMql = window.matchMedia(DESKTOP_QUERY)
    desktopMql.addEventListener('change', (e) => {
      isDesktop.value = e.matches
    })
    const tabletMql = window.matchMedia(TABLET_QUERY)
    tabletMql.addEventListener('change', (e) => {
      isTablet.value = e.matches
    })
  }
  return { isDesktop, isTablet, layout }
}
