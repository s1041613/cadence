<template>
  <span v-if="source.mode === 'mask'" class="cd-icon cd-icon--mask" :style="maskStyle" aria-hidden="true" />
  <img v-else class="cd-icon" :src="src" :width="size" :height="size" alt="" />
</template>

<script setup lang="ts">
// CdIcon — single glyph-rendering component backing every icon used across the Cd* component set.
// Glyphs are standalone SVG files under public/icons/ (see icons.ts, the manifest, for the file
// map and the mask-vs-img mode rationale). This component resolves display props (size/color/tier)
// and renders either a CSS-masked span (monochrome files, dynamic color) or a plain <img>
// (two-tone brand files at their fixed design colors — `color` is ignored there by design).
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Pixel size (both width and height). Defaults to 20, the most common size across Cd* usages. */
    size?: number
    /** Explicit mask color. Wins over `tier` when set. Defaults to currentColor so the glyph
     *  inherits the surrounding text color unless a tier or explicit color is given. No effect on
     *  mode:'img' glyphs, which render their baked design colors. */
    color?: string
    /** Brand/hero vs utility tier — only affects the default mask color when `color` is not
     *  passed (both resolve to --cd-ink; see the old registry audit notes). */
    tier?: 'hero' | 'utility'
    /** Selects a stroke-weight variant file (icons.ts `weights`). External files freeze stroke
     *  width, so only the weights with an exported variant have any effect — currently check
     *  2.4/3.4 and search 1.6, matching every call site that passes this prop. */
    strokeWidth?: number
  }>(),
  { size: 20 }
)

const source = computed(() => ICONS[props.name])

const src = computed(() => {
  const variant = props.strokeWidth !== undefined ? source.value.weights?.[String(props.strokeWidth)] : undefined
  return variant ?? source.value.src
})

const resolvedColor = computed(() => {
  if (props.color) return props.color
  if (props.tier === 'hero' || props.tier === 'utility') return 'var(--cd-ink)'
  return 'currentColor'
})

const maskStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  backgroundColor: resolvedColor.value,
  maskImage: `url(${src.value})`,
  WebkitMaskImage: `url(${src.value})`
}))
</script>

<style scoped>
.cd-icon {
  display: block;
  flex: none;
}

.cd-icon--mask {
  mask-repeat: no-repeat;
  mask-size: 100% 100%;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-position: center;
}
</style>
