<template>
  <!--
    One scroll-snap wheel column. Presentational and domain-agnostic: it renders whatever
    items it is given (months, years, hours, minutes) and reports the one snapped to centre.
    The highlight band and edge fades belong to the container, since they span all columns
    and their colour depends on the surface the wheel sits on.
  -->
  <div
    ref="el"
    class="pv2-wheel-col"
    :style="{
      '--pv2-wheel-ih': `${itemHeight}px`,
      '--pv2-wheel-pad': `${padHeight}px`,
      '--pv2-wheel-frame': `${frameHeight}px`
    }"
    role="listbox"
    :aria-label="ariaLabel"
    :aria-activedescendant="items[selected] ? `${uid}-${selected}` : undefined"
    tabindex="0"
    @scroll="onScroll"
    @keydown="onKeydown"
    @pointerdown="onUserTakeover"
    @wheel="onUserTakeover"
    @touchstart="onUserTakeover"
  >
    <div class="pv2-wheel-col__pad" />
    <div
      v-for="(item, i) in items"
      :id="`${uid}-${i}`"
      :key="item.value"
      class="pv2-wheel-col__item"
      :class="`pv2-wheel-col__item--${variant}`"
      role="option"
      :aria-selected="i === selected"
      :style="itemStyle(i - selected)"
    >
      {{ item.label }}
    </div>
    <div class="pv2-wheel-col__pad" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

export type WheelItem = { value: string | number; label: string }

const props = withDefaults(
  defineProps<{
    items: WheelItem[]
    modelValue: string | number
    ariaLabel: string
    itemHeight?: number
    visibleCount?: number
    variant?: 'serif' | 'ui' | 'mono'
    /** Font size per distance from centre: [0, 1, 2, 3+]. */
    sizes?: [string, string, string, string]
  }>(),
  {
    itemHeight: 44,
    visibleCount: 5,
    variant: 'ui',
    sizes: () => ['21px', '18px', '16px', '15px']
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

const uid = useId()
const el = ref<HTMLElement | null>(null)

// Spacer above/below so the first and last items can still reach the centre.
//
// LOAD-BEARING INVARIANT: the column's height must equal `padHeight * 2 + itemHeight`, i.e.
// `visibleCount * itemHeight`. scrollToIndex writes `i * itemHeight` and onScroll inverts it
// with `round(scrollTop / itemHeight)`; both are only correct when the centred row sits
// exactly `padHeight` below the top. Sized to anything else, every selection shifts by the
// mismatch — reading a row off, and making the first row unselectable.
//
// The column therefore sets its own height from these two props rather than inheriting it
// from the container, so a container styled to a different height cannot silently break it.
const padHeight = computed(() => ((props.visibleCount - 1) / 2) * props.itemHeight)
const frameHeight = computed(() => props.visibleCount * props.itemHeight)

const indexOfValue = (v: string | number): number => {
  const i = props.items.findIndex((item) => item.value === v)
  return i === -1 ? 0 : i
}

const selected = ref(indexOfValue(props.modelValue))

// Guards the scroll handler while we drive scrollTop ourselves. Without it, writing the
// position to reflect an incoming modelValue fires `scroll`, which emits the value straight
// back out — a feedback loop. The month sheet hit the mirror image of this bug (see its
// onToday comment), so both directions are now handled here in one place.
let programmatic = false
let settleTimer = 0

// Smooth-scroll duration scales with distance and is not capped, so a fixed timeout would
// release the guard mid-animation on long jumps (the month sheet's TODAY can travel 11 rows)
// and let the remaining frames emit an intermediate row. Instead the guard is released once
// positions actually stop changing: every scroll event during a programmatic run restarts a
// short settle timer, so the flag clears one frame-gap after the last movement, whatever the
// distance.
function releaseOnSettle(): void {
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(() => { programmatic = false }, 120)
}

// Touching, dragging or wheeling the column ends the programmatic run immediately. Without
// this, a drag that interrupts an in-flight animation would keep restarting the settle timer
// with its own scroll events and stay guarded — the wheel would move under the finger but
// emit nothing. Direct input always outranks an animation it interrupts.
function onUserTakeover(): void {
  window.clearTimeout(settleTimer)
  programmatic = false
}

// An explicit `behavior` in scrollTo() overrides the CSS scroll-behavior property, so the
// reduced-motion preference has to be read here rather than left to the stylesheet.
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function scrollToIndex(i: number, smooth: boolean): void {
  const node = el.value
  if (!node) return
  programmatic = true
  node.scrollTo({ top: i * props.itemHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
  releaseOnSettle()
}

onMounted(async () => {
  await nextTick()
  scrollToIndex(selected.value, false)
})

onBeforeUnmount(() => window.clearTimeout(settleTimer))

// Follow the value when it changes from outside (a parent write, or the sibling column of a
// paired wheel). Equal values are ignored so this can never round-trip into an emit.
watch(
  () => props.modelValue,
  (v) => {
    const i = indexOfValue(v)
    if (i === selected.value) return
    selected.value = i
    scrollToIndex(i, true)
  }
)

function onScroll(e: Event): void {
  // Bail before touching `selected`: a smooth scroll reports every intermediate position, and
  // recording one of those would leave `selected` on a midpoint the wheel has already passed.
  // A later user scroll to the real target would then match it and return early, emitting
  // nothing. `selected` is set by whoever initiated the programmatic scroll instead.
  if (programmatic) {
    releaseOnSettle()
    return
  }
  const i = Math.max(0, Math.min(props.items.length - 1, Math.round((e.target as HTMLElement).scrollTop / props.itemHeight)))
  if (i === selected.value) return
  selected.value = i
  emit('update:modelValue', props.items[i]!.value)
}

function onKeydown(e: KeyboardEvent): void {
  const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
  if (!delta) return
  e.preventDefault()
  const i = Math.max(0, Math.min(props.items.length - 1, selected.value + delta))
  if (i === selected.value) return
  selected.value = i
  scrollToIndex(i, true)
  emit('update:modelValue', props.items[i]!.value)
}

// Further from centre: smaller and fainter. Mirrors the month sheet's original falloff.
function itemStyle(dist: number): Record<string, string> {
  const d = Math.abs(dist)
  const fontSize = props.sizes[Math.min(d, 3) as 0 | 1 | 2 | 3]
  if (d === 0) return { fontSize, color: 'var(--pv2-wheel-ink, #1b1b1b)', opacity: '1' }
  if (d === 1) return { fontSize, color: 'var(--pv2-wheel-ink-2, #6e6e6e)', opacity: '0.6' }
  if (d === 2) return { fontSize, color: 'var(--pv2-wheel-ink-3, #b2b2b2)', opacity: '0.4' }
  return { fontSize, color: 'var(--pv2-wheel-ink-4, #c4c4c4)', opacity: '0.22' }
}
</script>

<style scoped>
.pv2-wheel-col {
  flex: 1;
  /* Derived from itemHeight × visibleCount — see the invariant on padHeight. Not 100%: the
     container's height must not be able to drift from the scroll arithmetic. */
  height: var(--pv2-wheel-frame);
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  outline: none;
}

.pv2-wheel-col:focus-visible {
  border-radius: 8px;
  box-shadow: 0 0 0 2px var(--pv2-wheel-ink, #1b1b1b);
}

.pv2-wheel-col::-webkit-scrollbar {
  display: none;
}

.pv2-wheel-col__pad {
  height: var(--pv2-wheel-pad);
}

/* Height is driven from the itemHeight prop so the JS that maps scrollTop to an index and
   the CSS that lays the rows out cannot drift apart. */
.pv2-wheel-col__item {
  height: var(--pv2-wheel-ih);
  line-height: var(--pv2-wheel-ih);
  text-align: center;
  scroll-snap-align: center;
}

/* Font size comes from the inline itemStyle; only family/style/weight live here. */
.pv2-wheel-col__item--serif {
  font-family: var(--cd-font-serif);
  font-style: italic;
  font-weight: 400;
}

.pv2-wheel-col__item--mono {
  font-family: var(--cd-font-mono);
  font-weight: 500;
  letter-spacing: 0.08em;
}

.pv2-wheel-col__item--ui {
  font-family: var(--cd-font-ui);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Reduced motion is enforced in scrollToIndex, not here: an explicit `behavior` passed to
   scrollTo() takes precedence over this property, so a CSS-only rule would have no effect. */
</style>
