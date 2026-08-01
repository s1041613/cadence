<template>
  <button type="button" class="cd-create-btn" @click="emit('click', $event)">
    <CdIcon name="plus" :size="18" color="var(--cd-accent-strong)" />
    <span>Create</span>
  </button>
</template>

<script setup lang="ts">
// CdCreateButton — topbar "Create" pill. design-research-report.md §2.2.
import CdIcon from './CdIcon.vue'

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.cd-create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(var(--cd-accent-rgb), 0.5);
  background: rgba(var(--cd-accent-rgb), 0.16);
  color: var(--cd-accent-strong);
  border-radius: var(--cd-radius-pill);
  padding: 8px 16px 8px 13px;
  font: 700 14px var(--cd-font-title);
  cursor: pointer;
  transition: background var(--cd-duration-micro-3);
}

.cd-create-btn:hover {
  background: rgba(var(--cd-accent-rgb), 0.26);
}
</style>
