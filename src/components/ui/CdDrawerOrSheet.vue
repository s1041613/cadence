<template>
  <CdDrawer
    v-if="presentation === 'drawer'"
    v-bind="scrimColorAttr"
    :width="width"
    :teleport="teleport"
    :non-modal="nonModal"
    :side="side"
    @scrim-click="emit('scrimClick')"
  >
    <slot />
  </CdDrawer>
  <CdSheet v-else v-bind="{ ...scrimColorAttr, ...sheetSurfaceAttr }" :duration="sheetDuration" :fullscreen="sheetFullscreen" :raised="raised" @scrim-click="emit('scrimClick')" @dismiss="emit('dismiss')">
    <slot />
  </CdSheet>
</template>

<script setup lang="ts">
// CdDrawerOrSheet — the drawer-or-sheet convention in one place: at/above the desktop breakpoint an
// overlay is a CdDrawer (side drawer), below it a CdSheet (bottom sheet). design.md "Overlays follow
// the drawer-or-sheet convention with scrim dismissal" / app-shell spec "Same overlay adapts to
// viewport" — same content, same scrim-click dismissal, different container per viewport.
//
// `presentation` is a required prop rather than a CSS media query because CdDrawer and CdSheet are
// structurally different components (absolute-positioned side panel vs. bottom-anchored sheet with a
// drag handle) — unlike CdTopbar/CdBottomNav, which are visually swapped via CSS `display` because
// they're peers of the same DOM shape, these two need a real v-if. Callers derive `presentation` from
// the shared breakpoint (e.g. a `matchMedia($cd-bp-desktop)` composable) so every consumer reads the
// same breakpoint token rather than each drawer re-deriving it. `scrimColor` has no default here (each
// child's own default — heavy for drawer, mid for sheet — applies when the caller doesn't override it).
//
// `sheetFullscreen` (Zoe's 2026-07-11 correction): Draft/Settings/Assistant opt into CdSheet's
// edge-to-edge phone presentation; event composer and the month-calendar picker leave it off and keep
// the card-style bottom sheet.
//
// `raised` (Zoe's 2026-07-11 correction): when the event composer opens from within the Draft drawer
// (draft-conversion), the Draft sheet stays mounted and open underneath it — the composer needs a
// higher stacking tier so it isn't hidden behind Draft's own `sheetFullscreen` tier, but must keep its
// card-style bottom-sheet look (not go edge-to-edge like `sheetFullscreen`), matching the handoff's
// "new-event card floats above the still-visible Draft list" composition.
import { computed } from 'vue'
import CdDrawer from './CdDrawer.vue'
import CdSheet from './CdSheet.vue'

const props = withDefaults(
  defineProps<{
    presentation: 'drawer' | 'sheet'
    /** CdDrawer-only: forwarded when presentation === 'drawer'. */
    width?: string
    scrimColor?: string
    teleport?: boolean
    nonModal?: boolean
    side?: 'right' | 'left'
    /** CdSheet-only: forwarded when presentation === 'sheet'. */
    sheetDuration?: string
    sheetFullscreen?: boolean
    raised?: boolean
    /** CdSheet-only: overrides the sheet's default white surface (e.g. Draft's paper token). */
    sheetSurface?: string
  }>(),
  {
    width: 'min(440px, 46%)',
    teleport: false,
    nonModal: false,
    side: 'right',
    sheetDuration: '.3s',
    sheetFullscreen: false,
    raised: false
  }
)

const emit = defineEmits<{
  scrimClick: []
  /** Sheet-only: handle swipe-down; drawers have no handle so this never fires in drawer mode. */
  dismiss: []
}>()

// `exactOptionalPropertyTypes` rejects forwarding `scrimColor` directly when it's undefined (the
// child's own prop type is `string`, not `string | undefined`) — v-bind-ing an object that omits the
// key entirely when unset lets each child's own default (heavy for drawer, mid for sheet) apply.
const scrimColorAttr = computed(() => (props.scrimColor === undefined ? {} : { scrimColor: props.scrimColor }))

// Same `exactOptionalPropertyTypes` workaround as scrimColor: CdSheet's `surface` prop is `string`,
// not `string | undefined`, so omit the key entirely when unset rather than forwarding `undefined`.
const sheetSurfaceAttr = computed(() => (props.sheetSurface === undefined ? {} : { surface: props.sheetSurface }))
</script>
