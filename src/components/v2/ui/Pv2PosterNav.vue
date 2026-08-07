<template>
  <!--
    Month header row: previous month · poster title · next month.
    The arrows sit apart rather than fused into one pill (unlike Week/Day's Pv2HeaderNav).
    That pill exists to bind heterogeneous things — relative movement (the arrows) and
    absolute positioning (TODAY) — into a single control. Month has only two homogeneous
    arrows, so the container earns nothing, and splitting them lets spatial position itself
    carry direction. Sharing the poster's row also costs no extra vertical space, leaving
    the calendar cell height unchanged.
  -->
  <div class="pv2-pn">
    <button type="button" class="pv2-pn__arrow" :aria-label="prevLabel" @click="emit('prev')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 6 L8 12 L14 18" />
      </svg>
    </button>

    <!-- The poster stays tappable: the month/year wheel is the only way to jump across years,
         so the arrows supplement it rather than replace it. -->
    <Pv2Poster class="pv2-pn__poster" :month-name="monthName" :year="year" @open-sheet="emit('openSheet')" />

    <button type="button" class="pv2-pn__arrow" :aria-label="nextLabel" @click="emit('next')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1b1b1b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 6 L16 12 L10 18" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import Pv2Poster from '@/components/v2/ui/Pv2Poster.vue'

defineProps<{
  monthName: string
  year: string
  prevLabel: string
  nextLabel: string
}>()

const emit = defineEmits<{
  prev: []
  next: []
  openSheet: []
}>()
</script>

<style scoped>
.pv2-pn {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* The poster takes all remaining width, which pushes each arrow flush to its edge while the
   month word still lands on the row's centre axis (both arrows are the same width). */
.pv2-pn__poster {
  flex: 1;
  min-width: 0;
}

/* White circular buttons reuse the surface vocabulary of Week/Day's pill (same white fill and
   soft shadow) — a different shape, but the same material. The fill is also the only thing that
   keeps the arrows legible once a custom background image is on: v2 lets the scrim be dialled
   down, and a bare stroke would smear into the photo. */
.pv2-pn__arrow {
  position: relative;
  width: 34px;
  height: 34px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--cd-radius-pill);
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

/* Expand the hit area to the 44px touch guideline without growing the button itself —
   enlarging the visual size would squeeze the poster between them. */
.pv2-pn__arrow::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
}

.pv2-pn__arrow:active {
  background: #f0efec;
}
</style>
