<template>
  <Teleport v-if="teleport" to="body">
    <div class="cd-drawer-root" :class="{ 'cd-drawer-root--non-modal': nonModal }">
      <CdScrim v-if="!nonModal" :color="scrimColor" @click="emit('scrimClick')" />
      <div
        class="cd-drawer"
        :class="{ 'cd-drawer--non-modal': nonModal, 'cd-drawer--left': side === 'left' }"
        :style="{ width }"
      >
        <slot />
      </div>
    </div>
  </Teleport>
  <div v-else class="cd-drawer-root" :class="{ 'cd-drawer-root--non-modal': nonModal }">
    <CdScrim v-if="!nonModal" :color="scrimColor" @click="emit('scrimClick')" />
    <div
      class="cd-drawer"
      :class="{ 'cd-drawer--non-modal': nonModal, 'cd-drawer--left': side === 'left' }"
      :style="{ width }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// CdDrawer — right-side drawer container used by Task Editor, Draft, and Assistant.
// design-research-report.md §3.11-§3.13, §4.11: top/right/bottom 14px, radius 22px,
// shadow -22px 0 52px -22px rgba(40,38,30,.42), animation drawerIn .34s cubic-bezier(.22,1,.36,1).
// Widths differ by consumer: Task Editor min(600px,60%), Draft/Assistant min(440px,46%).
//
// v2 update (Assistant drawer only): desktop `_assistantDrawer` became non-modal — no scrim, the
// outer overlay wrapper gets `pointer-events:none` (so clicks pass through to the calendar beneath),
// and the drawer panel itself gets `pointer-events:auto` + `border:1px solid #E9E6DD` (Gmail/Notion
// side-panel pattern). `nonModal` opts a consumer into this variant; default false preserves the
// modal (scrim + pointer-events default) behavior for Task Editor / Draft.
//
// CADENCE Handoff §_settingsDrawer (full file): `side="left"` opts a consumer into the left-anchored
// desk variant (Settings drawer) — panel anchors `left: 14px` instead of `right: 14px`, the shadow
// mirrors to `22px 0 52px -22px rgba(40,38,30,.42)`, and the entrance animation becomes
// `cd-drawerInLeft` (slide in from the left) instead of `cd-drawerIn`. Right-side behavior is
// unchanged and remains the default.
import CdScrim from './CdScrim.vue'

withDefaults(
  defineProps<{
    width?: string
    scrimColor?: string
    teleport?: boolean
    nonModal?: boolean
    side?: 'right' | 'left'
  }>(),
  { width: 'min(440px, 46%)', scrimColor: 'var(--cd-scrim-heavy)', teleport: false, nonModal: false, side: 'right' }
)

const emit = defineEmits<{
  scrimClick: []
}>()
</script>

<style scoped>
.cd-drawer-root {
  position: absolute;
  inset: 0;
  z-index: 70;
}

.cd-drawer-root--non-modal {
  pointer-events: none;
}

.cd-drawer {
  position: absolute;
  top: 14px;
  right: 14px;
  bottom: 14px;
  background: var(--cd-editor-card);
  border-radius: var(--cd-radius-drawer);
  box-shadow: var(--cd-shadow-drawer);
  animation: cd-drawerIn var(--cd-duration-drawer) var(--cd-ease-standard);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cd-drawer--non-modal {
  border: 1px solid var(--cd-line-4);
  pointer-events: auto;
}

.cd-drawer--left {
  right: auto;
  left: 14px;
  box-shadow: 22px 0 52px -22px rgba(40, 38, 30, 0.42);
  animation-name: cd-drawerInLeft;
}
</style>
