<template>
  <button type="button" class="cd-avatar" :style="{ width: `${size}px`, height: `${size}px` }" @click="emit('click', $event)">
    <img v-if="src" :src="src" alt="" class="cd-avatar__img" />
    <span v-else class="cd-avatar__fallback">{{ initials }}</span>
    <span v-if="notify" class="cd-avatar__dot" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CdAvatar — topbar avatar, 38x38 with 11x11 notification dot. design-research-report.md §2.2.
const props = withDefaults(
  defineProps<{
    src?: string | null
    name?: string
    size?: number
    notify?: boolean
  }>(),
  { src: null, name: '', size: 38, notify: false }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const initials = computed(() =>
  props.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
)
</script>

<style scoped>
.cd-avatar {
  position: relative;
  border-radius: 50%;
  border: 1px solid var(--cd-line);
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  background: var(--cd-topbar);
  overflow: visible;
}

.cd-avatar__img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.cd-avatar__fallback {
  font: 700 13px var(--cd-font-ui);
  color: var(--cd-ink);
}

.cd-avatar__dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #c0564b;
  border: 2px solid var(--cd-topbar);
}
</style>
