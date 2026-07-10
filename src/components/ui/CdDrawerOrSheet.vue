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
  <CdSheet v-else v-bind="scrimColorAttr" :duration="sheetDuration" @scrim-click="emit('scrimClick')">
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
  }>(),
  {
    width: 'min(440px, 46%)',
    teleport: false,
    nonModal: false,
    side: 'right',
    sheetDuration: '.3s'
  }
)

const emit = defineEmits<{
  scrimClick: []
}>()

// `exactOptionalPropertyTypes` rejects forwarding `scrimColor` directly when it's undefined (the
// child's own prop type is `string`, not `string | undefined`) — v-bind-ing an object that omits the
// key entirely when unset lets each child's own default (heavy for drawer, mid for sheet) apply.
const scrimColorAttr = computed(() => (props.scrimColor === undefined ? {} : { scrimColor: props.scrimColor }))
</script>
