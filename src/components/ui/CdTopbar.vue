<template>
  <div class="cd-topbar">
    <CdAvatar :src="avatarSrc" :notify="notify" @click="emit('openSettings')" />
    <div class="cd-topbar__spacer" />
    <CdViewSwitcher :model-value="activeView" :options="['Day', 'Week', 'Month']" @update:model-value="(v) => emit('update:activeView', v)" />
    <span class="cd-topbar__divider" />
    <CdIconButton ariaLabel="Journal" @click="emit('openJournal')">
      <CdIcon name="journal" :size="23" color="#56585E" />
    </CdIconButton>
    <CdIconButton ariaLabel="Assistant" @click="emit('openAssistant')">
      <CdIcon name="spark" :size="21" color="#56585E" />
    </CdIconButton>
    <CdCreateButton @click="emit('createTask')" />
  </div>
</template>

<script setup lang="ts">
// CdTopbar — top chrome strip composed of avatar, view switcher, journal/assistant icon buttons,
// and Create pill. design-research-report.md §2.2. bg #F2F1EC, padding 14px 20px, border-bottom 1px #E5E3DB.
// Content order per CADENCE Handoff: avatar → spacer → Day/Week/Month pill → 1x24px divider (#E5E3DB)
// → journal icon button → assistant (AI) icon button → Create button.
//
// CADENCE Handoff: desktop always shows the Create button — there is no Month-view FAB substitution
// on desktop ("desktop: create lives in the top bar, not a FAB"). CdFab is pad/phone-only.
import CdAvatar from './CdAvatar.vue'
import CdViewSwitcher from './CdViewSwitcher.vue'
import CdIconButton from './CdIconButton.vue'
import CdCreateButton from './CdCreateButton.vue'
import CdIcon from './CdIcon.vue'

withDefaults(
  defineProps<{
    activeView: string
    avatarSrc?: string | null
    notify?: boolean
  }>(),
  { avatarSrc: null, notify: true }
)

const emit = defineEmits<{
  'update:activeView': [value: string]
  openSettings: []
  openJournal: []
  openAssistant: []
  createTask: []
}>()
</script>

<style scoped>
.cd-topbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 20px;
  background: var(--cd-topbar);
  border-bottom: 0.1px solid var(--cd-line);
}

.cd-topbar__spacer {
  flex: 1;
}

.cd-topbar__divider {
  width: 1px;
  height: 24px;
  background: var(--cd-line);
  margin: 0 8px;
}
</style>
