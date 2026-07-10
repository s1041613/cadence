<template>
  <div class="cd-member-stack">
    <img
      v-for="(m, i) in visible"
      :key="m.id"
      :src="m.avatar"
      :alt="m.name"
      class="cd-member-stack__avatar"
      :style="{ zIndex: visible.length - i }"
    />
    <span v-if="overflow > 0" class="cd-member-stack__more">+{{ overflow }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// CdMemberStack — overlapping 22px member avatars, used in Calendars pane & event preview guests.
// CADENCE Handoff §3.15: 22px circle, border 2px #F4F2EC, margin-left -8px; >max overflow renders as
// plain text "+N" (600 11px ui font, color #9C9E94) after the stack, not a filled circle badge.
const props = withDefaults(
  defineProps<{
    members: Array<{ id: string; name: string; avatar: string }>
    max?: number
  }>(),
  { max: 4 }
)

const visible = computed(() => props.members.slice(0, props.max))
const overflow = computed(() => Math.max(0, props.members.length - props.max))
</script>

<style scoped>
.cd-member-stack {
  display: flex;
  align-items: center;
}

.cd-member-stack__avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #f4f2ec;
  object-fit: cover;
  margin-left: -8px;
}

.cd-member-stack__avatar:first-child {
  margin-left: 0;
}

.cd-member-stack__more {
  margin-left: 4px;
  font: 600 11px var(--cd-font-ui);
  color: #9c9e94;
}
</style>
