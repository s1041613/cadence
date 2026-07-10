<template>
  <div class="cd-sheet-root">
    <CdScrim :color="scrimColor" @click="emit('scrimClick')" />
    <div class="cd-sheet" :style="{ animationDuration: duration }">
      <div class="cd-sheet__handle" />
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// CdSheet — bottom sheet container (month calendar picker, draft schedule sheet, invite sheet).
// design-research-report.md §3.17 / §4.11: radius 22px 22px 0 0, animation sheetUp (.3s for calendar/invite,
// .28s for draftConv), handle 40x4 #DDD9CF, shadow 0 -18px 42px -20px rgba(40,38,30,.4), max-height 92%.
import CdScrim from './CdScrim.vue'

withDefaults(
  defineProps<{
    scrimColor?: string
    duration?: string
  }>(),
  { scrimColor: 'var(--cd-scrim-mid)', duration: '.3s' }
)

const emit = defineEmits<{
  scrimClick: []
}>()
</script>

<style scoped>
.cd-sheet-root {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.cd-sheet {
  position: relative;
  width: 100%;
  max-height: 92%;
  background: #fff;
  border-radius: 22px 22px 0 0;
  box-shadow: var(--cd-shadow-sheet);
  animation-name: cd-sheetUp;
  animation-timing-function: var(--cd-ease-standard);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cd-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #ddd9cf;
  margin: 10px auto 4px;
  flex: none;
}
</style>
