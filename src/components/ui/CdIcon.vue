<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="spec.viewBox"
    fill="none"
    :stroke="resolvedColor"
    :stroke-width="strokeWidth ?? spec.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="cd-icon"
  >
    <component
      :is="p.tag"
      v-for="(p, i) in spec.paths"
      :key="i"
      v-bind="p.attrs"
      :fill="resolveFill(p.fill)"
      :fill-opacity="p.fillOpacity"
      :stroke="p.stroke ?? resolvedColor"
      :stroke-width="p.strokeWidth ?? strokeWidth ?? spec.strokeWidth"
    />
  </svg>
</template>

<script setup lang="ts">
// CdIcon — single glyph-rendering component backing every icon used across the Cd* component set.
// Glyph data (path/viewBox/stroke params) lives in icons.ts; this component only resolves display
// props (size/color/tier) and renders the SVG. See CADENCE-Icon.dc.html (audit) for the glyph
// consistency rules this registry follows, in particular the hero/utility stroke-color tiers
// (audit turn 20).
import { computed } from 'vue'
import { ICONS, ICON_COLOR, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Pixel size (both width and height). Defaults to 20, the most common size across Cd* usages. */
    size?: number
    /** Explicit stroke color. Wins over `tier` when set. Defaults to currentColor so the glyph
     *  inherits the surrounding text color unless a tier or explicit color is given. */
    color?: string
    /** Brand/hero (olive-accented personality glyphs — nav, AI, key actions) vs utility (quiet
     *  slate line — settings, forms, menus). See audit turn 20. Only affects the default stroke
     *  color when `color` is not passed. */
    tier?: 'hero' | 'utility'
    /** Override the glyph's default stroke width (registered per-icon in icons.ts). Rarely needed —
     *  only a few call sites (e.g. CdCheckCircle's bold 3.4px checkmark) draw a glyph at a
     *  non-default weight for emphasis at small size. */
    strokeWidth?: number
  }>(),
  { size: 20 }
)

const spec = computed(() => ICONS[props.name])

// Per the audit (turn 20), both tiers share the same slate stroke (#56585E / --cd-ink) — the
// hero/utility distinction is about which glyphs carry an olive accent fill (baked into the glyph's
// own path specs in icons.ts, e.g. journal/spark) and how they're grouped in the gallery story, not
// a different base stroke color. `tier` still resolves to an explicit default here (rather than
// falling through to currentColor) so a bare `tier="hero"`/`tier="utility"` usage renders correctly
// standalone without relying on inherited text color.
const resolvedColor = computed(() => {
  if (props.color) return props.color
  if (props.tier === 'hero' || props.tier === 'utility') return 'var(--cd-ink)'
  return 'currentColor'
})

function resolveFill(fill: string | undefined): string {
  if (fill === ICON_COLOR) return resolvedColor.value
  return fill ?? 'none'
}
</script>

<style scoped>
.cd-icon {
  display: block;
  flex: none;
}
</style>
