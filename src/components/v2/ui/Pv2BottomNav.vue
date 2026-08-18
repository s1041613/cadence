<template>
  <!--
    Shared v2 bottom nav. Which tabs show and in what order comes from
    v2-tabs-store (configurable in Settings › Customization › Tab bar);
    the column count follows.
  -->
  <nav class="pv2-nav" :style="{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }">
    <button
      v-for="n in items"
      :key="n.key"
      type="button"
      class="pv2-nav__item"
      @click="onTap(n)"
    >
      <span class="pv2-nav__glyph" :class="{ 'pv2-nav__glyph--on': n.key === active }">{{ n.glyph }}</span>
      <span class="pv2-nav__label" :class="{ 'pv2-nav__label--on': n.key === active }">{{ n.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useV2TabsStore, type NavKey, type V2Tab } from '@/stores/v2-tabs-store'

const props = defineProps<{
  active: NavKey
}>()

const router = useRouter()
const tabs = useV2TabsStore()

const items = computed<V2Tab[]>(() => tabs.shownTabs)

function onTap(tab: V2Tab): void {
  void router.push(tab.to)
}

// If the current page isn't on the nav (the user hid it, or reached a hidden page
// straight from a URL), send them to the first tab — otherwise they sit on a screen
// where no cell is lit, which reads as broken.
//
// This lives here rather than in the Tab bar pane's commit: /v2/settings is a single
// route and the settings sub-pages are local pane switches, so at commit time
// route.path is always /v2/settings and the matching key is always 'setting' — which
// is mandatory and can never be hidden, making that condition a constant false.
//
// replace, not push: this is a corrective redirect, so the un-landable page must not
// stay on the history stack. With push, Back returns to the hidden page and the
// watcher bounces the user forward again — a trap.
watch(
  () => [props.active, items.value] as const,
  ([active, shown]) => {
    if (!shown.length) return
    if (shown.some((t) => t.key === active)) return
    const first = shown[0]
    if (first) void router.replace(first.to)
  },
  { immediate: true }
)
</script>

<style scoped>
.pv2-nav {
  /* Floating glass card, not a flow element: every view's frame ancestor (.mv2 / .wv2 /
     .dv2 / .nb2__frame / .sp2__frame) is `position: relative; overflow: hidden` and
     doubles as the desktop phone-frame box, so `position: fixed` would escape that box
     and anchor to the real browser viewport instead — `absolute` is the one that stays
     inside the frame on both mobile and the centred desktop mock. Content now extends
     the full frame height behind it and shows through the blur (LINE's floating tab
     bar is the reference), rather than stopping short the way a flow nav would.
     Changing the bottom gap or padding means changing --pv2-nav-h too (see
     cadence-tokens.css), or the FABs in each view will overlap the nav. */
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 24px;
  z-index: 5;
  display: grid;
  /* Column count is bound in the template (it follows v2-tabs-store), not fixed here */
  /* Four columns is now the hard ceiling (MAX_SHOWN_TABS), leaving ~89px per cell at
     393px — roomier than the old five-column case, so the horizontal padding that was
     trimmed for five can go back. */
  padding: 14px 18px;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  /* No design token for a glass surface yet — this is the only frosted material in the
     app so far, so it's a one-off rather than something worth generalising. */
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.pv2-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.pv2-nav__glyph {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: transparent;
  font: 400 20px var(--cd-font-display);
  line-height: 1;
  color: #6e6e6e;
}

.pv2-nav__glyph--on {
  background: #1b1b1b;
  color: #fafaf9;
}

.pv2-nav__label {
  /* 400, not the 600 this label used to carry: the display face ships one weight,
     so anything heavier is a browser-synthesised fake. */
  font: 400 9px var(--cd-font-display);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9c9c9c;
}

.pv2-nav__label--on {
  color: #1b1b1b;
}
</style>
