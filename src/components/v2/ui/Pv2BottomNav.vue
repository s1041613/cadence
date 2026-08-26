<template>
  <!--
    Shared v2 bottom nav. Which tabs show and in what order comes from
    v2-tabs-store (configurable in Settings › Customization › Tab bar);
    the column count follows.

    Floating "liquid glass" island: the bar itself is a frosted overlay anchored
    above the frame's bottom edge, and .pv2-nav__pill is a single shared element
    that slides/resizes to whichever button is active (measured from the DOM, not
    derived from column index, since the tab count is user-configurable).
  -->
  <nav ref="navEl" class="pv2-nav" :style="{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }">
    <div class="pv2-nav__pill" :class="{ 'pv2-nav__pill--ready': pillReady }" :style="pillStyle" aria-hidden="true" />
    <button
      v-for="n in items"
      :key="n.key"
      type="button"
      class="pv2-nav__item"
      :ref="(el) => setItemRef(n.key, el as Element | null)"
      @click="onTap(n)"
    >
      <span class="pv2-nav__icon" :class="{ 'pv2-nav__icon--on': n.key === active }" v-html="PV2_NAV_ICON_PATHS[n.key]" />
      <span class="pv2-nav__label" :class="{ 'pv2-nav__label--on': n.key === active }">{{ n.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useV2TabsStore, type NavKey, type V2Tab } from '@/stores/v2-tabs-store'
import { PV2_NAV_ICON_PATHS } from './pv2-nav-icons'

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

// ── Active-pill glass morph ──────────────────────────────
// One shared pill element, positioned by measuring the active button's own rect
// rather than by column index — the shown-tab count is user-configurable (2-4 via
// Settings › Tab bar), so "which column" alone can't give a pixel position without
// duplicating the grid's column math in JS.
const navEl = ref<HTMLElement | null>(null)
const itemEls = new Map<NavKey, HTMLElement>()

function setItemRef(key: NavKey, el: Element | null): void {
  if (el) itemEls.set(key, el as HTMLElement)
  else itemEls.delete(key)
}

const pillStyle = ref<{ transform: string; width: string }>({ transform: 'translateX(0)', width: '0px' })
// Gates visibility (see .pv2-nav__pill--ready below) so the pill doesn't flash at its
// default 0-width/0-offset position before the first real measurement lands.
const pillReady = ref(false)

function measurePill(): void {
  const container = navEl.value
  const target = itemEls.get(props.active)
  if (!container || !target) return
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  pillStyle.value = {
    transform: `translateX(${targetRect.left - containerRect.left}px)`,
    width: `${targetRect.width}px`
  }
  pillReady.value = true
}

// watchEffect, not a second watch(): Pv2BottomNav.nav.test.ts greps
// src.slice(src.indexOf('watch(')) and asserts the orphan-redirect watcher above is
// what follows. A watch( call placed earlier in the file would relocate that slice's
// start and invalidate what the test actually checks, so pill measurement uses
// watchEffect instead — no literal `watch(` substring, no ordering risk.
watchEffect(() => {
  void props.active
  void items.value
  void nextTick(measurePill)
})

// Button widths depend on the container's own width (equal grid columns), so a
// viewport/orientation change can move the active button without props.active or
// items.value ever changing — ResizeObserver catches that case.
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  resizeObserver = new ResizeObserver(() => measurePill())
  if (navEl.value) resizeObserver.observe(navEl.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<style scoped>
.pv2-nav {
  /* Floating overlay, not an in-flow row: absolute (not fixed) so it stays inside
     each page's own position:relative frame — NotebookPageV2/SettingsPageV2 render a
     centred, overflow:hidden desktop phone-frame mock that `fixed` would escape and
     pin to the real viewport instead. */
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  z-index: 20;
  display: grid;
  /* Column count is bound in the template (it follows v2-tabs-store), not fixed here */
  padding: 10px 10px;
  border-radius: var(--cd-radius-pill);
  border: 1px solid rgba(255, 255, 255, .55);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, .72), rgba(255, 255, 255, .46)),
    var(--cd-surface-raised);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  box-shadow: var(--cd-shadow-overlay);
}

/* Opaque, still-legible fallback where backdrop-filter isn't supported. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .pv2-nav {
    background: var(--cd-surface-raised);
  }
}

.pv2-nav__pill {
  position: absolute;
  /* top/bottom mirror .pv2-nav's own 10px padding, so the pill spans exactly the grid
     content box — which is exactly the tab button's box, since the buttons are the only
     items in the single implicit row. That's the same relationship measurePill() already
     maintains horizontally, and it derives the height from the button instead of
     restating its math: the previous hardcoded 46px had drifted 9px short of the 55px
     button, leaving 8px of clearance above the icon and clipping the label at the bottom. */
  top: 10px;
  bottom: 10px;
  left: 0;
  border-radius: 20px;
  opacity: 0;
  /* Only the animating element gets a promoted layer — the static bar shell doesn't
     need one held permanently. */
  will-change: transform, width;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, .55), rgba(255, 255, 255, .18)),
    var(--cd-ink-wash-line);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, .5);
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, .6),
    0 2px 8px rgba(var(--cd-ink-rgb), .18);
  transition:
    transform var(--cd-duration-glass) var(--cd-ease-glass),
    width var(--cd-duration-glass) var(--cd-ease-glass),
    opacity var(--cd-duration-micro-4) var(--cd-ease-standard);
}

.pv2-nav__pill--ready {
  opacity: 1;
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .pv2-nav__pill {
    background: var(--cd-ink-wash-strong);
  }
}

.pv2-nav__item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: none;
  background: none;
  cursor: pointer;
  transition: transform 160ms var(--cd-ease-standard);
}

.pv2-nav__item:active {
  transform: scale(.97);
  transition: transform 60ms var(--cd-ease-standard);
}

.pv2-nav__icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--cd-ink-muted);
  transition: color var(--cd-duration-micro-4) var(--cd-ease-standard);
}

.pv2-nav__icon--on {
  color: var(--cd-ink);
}

.pv2-nav__label {
  /* 400, not the 600 this label used to carry: the display face ships one weight,
     so anything heavier is a browser-synthesised fake. */
  font: 400 9px var(--cd-font-display);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cd-ink-muted);
  transition: color var(--cd-duration-micro-4) var(--cd-ease-standard);
}

.pv2-nav__label--on {
  color: var(--cd-ink);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-nav__pill {
    transition: opacity var(--cd-duration-micro-4) linear;
  }

  .pv2-nav__item,
  .pv2-nav__item:active {
    transition: none;
  }
}
</style>
