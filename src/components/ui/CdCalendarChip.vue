<template>
  <button type="button" class="cd-cal-chip" :class="{ 'cd-cal-chip--on': on }" @click="emit('toggle')">
    <span class="cd-cal-chip__icon" :class="{ 'cd-cal-chip__icon--on': on }">
      <img v-if="cover" :src="cover" alt="" class="cd-cal-chip__cover" :class="{ 'cd-cal-chip__cover--off': !on }" />
      <slot v-else name="icon" />
    </span>
    <span class="cd-cal-chip__label">{{ name }}</span>
  </button>
</template>

<script setup lang="ts">
// CdCalendarChip — calendar filter strip chip, on/off state. design-research-report.md §3.4.
// v2: icon container is circular (border-radius 50%) — was 7px rounded-square in v1.
defineProps<{
  name: string
  on: boolean
  cover?: string | null
}>()

const emit = defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
.cd-cal-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  border: 1px solid #e4e1d8;
  background: #eeede7;
  border-radius: var(--cd-radius-pill);
  padding: 5px 13px 5px 6px;
  cursor: pointer;
  transition: all var(--cd-duration-micro-3);
}

.cd-cal-chip--on {
  border-color: #d2ccbb;
  background: rgba(179, 172, 145, 0.11);
}

.cd-cal-chip__icon {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  background: #cfcdc4;
  display: grid;
  place-items: center;
  transition: background var(--cd-duration-micro-3);
  color: #fff;
}

.cd-cal-chip__icon--on {
  background: linear-gradient(150deg, #cfc9b4, #bab397);
}

.cd-cal-chip__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: none;
  opacity: 1;
  transition: filter var(--cd-duration-micro-3), opacity var(--cd-duration-micro-3);
}

.cd-cal-chip__cover--off {
  filter: grayscale(1);
  opacity: 0.5;
}

.cd-cal-chip__label {
  font: 700 13px var(--cd-font-title);
  color: #6e6a54;
  white-space: nowrap;
  transition: color var(--cd-duration-micro-3);
}

.cd-cal-chip:not(.cd-cal-chip--on) .cd-cal-chip__label {
  font-weight: 500;
  color: #a6a499;
}
</style>
