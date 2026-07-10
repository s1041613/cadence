<template>
  <nav class="cd-bottom-nav">
    <button type="button" class="cd-bottom-nav__btn" aria-label="Day view" @click="emit('update:activeView', 'day')">
      <CdIcon name="view-day" :size="24" :color="activeView === 'day' ? '#56585E' : '#9C9E94'" />
    </button>
    <button type="button" class="cd-bottom-nav__btn" aria-label="Month view" @click="emit('update:activeView', 'month')">
      <CdIcon name="view-month" :size="24" :color="activeView === 'month' ? '#56585E' : '#9C9E94'" />
    </button>
    <button type="button" class="cd-bottom-nav__btn" aria-label="Week view" @click="emit('update:activeView', 'week')">
      <CdIcon name="view-week" :size="24" :color="activeView === 'week' ? '#56585E' : '#9C9E94'" />
    </button>
    <button type="button" class="cd-bottom-nav__ai" aria-label="Assistant" @click="emit('openAssistant')">
      <CdIcon name="spark" :size="24" color="#3A6EA5" />
    </button>
    <button type="button" class="cd-bottom-nav__btn" aria-label="Journal" @click="emit('openJournal')">
      <CdIcon name="journal" :size="24" color="#9C9E94" />
    </button>
    <button type="button" class="cd-bottom-nav__avatar-btn" aria-label="Settings" @click="emit('openSettings')">
      <span class="cd-bottom-nav__avatar">
        <img v-if="avatarSrc" :src="avatarSrc" alt="" class="cd-bottom-nav__avatar-img" />
        <span v-else class="cd-bottom-nav__avatar-fallback" />
        <span v-if="notify" class="cd-bottom-nav__avatar-dot" />
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
// CdBottomNav — phone-only bottom navigation. Ported from the handoff's `_bottomNav` method plus
// its `_navAI`/`_navJournal`/`_navAvatar` helpers (CADENCE Handoff.dc.html ~line 1460), phone branch
// only (the pad/rail branches are out of scope — tablet is a non-goal per design.md).
//
// Deviates from the handoff's own `_bottomNav` button row on purpose: that function only builds
// Month/Week buttons for phone (skipping Day), even though its own `_navSel` selection handler
// supports 'day'/'week'/'month' uniformly. The app-shell spec's parent requirement is explicit —
// "The system SHALL NOT hide the view switcher at any viewport size without an equivalent
// replacement control" — so this component adds a Day button the handoff's phone layout omitted,
// resolving the handoff-vs-spec conflict in the spec's favor rather than reproducing the gap.
//
// Item order: Day, Month, Week, AI (raised center button), Journal, Avatar. AI opens the assistant,
// Journal opens the draft drawer (CdTopbar treats journal -> openJournal identically), and the
// avatar slot opens Settings (CdTopbar treats avatar -> openSettings identically).
//
// Kept a pure presentational component per design.md's ui-layer contract: no store imports, only
// props/emits. The active/selected color logic (#56585E ink vs #9C9E94 muted) is ported verbatim
// from the handoff's `items` array construction in `_bottomNav`.
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
  openAssistant: []
  openJournal: []
  openSettings: []
}>()
</script>

<style scoped>
.cd-bottom-nav {
  display: flex;
  align-items: center;
  background: var(--cd-topbar);
  border-top: 1px solid var(--cd-line);
  padding: 6px 8px 20px;
}

.cd-bottom-nav__btn {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 10px 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

/* Raised circular AI button — handoff `_navAI`: 50x50 circle, translateY(-10px) lift above the bar. */
.cd-bottom-nav__ai {
  flex: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  margin: 0 10px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--cd-surface);
  border: 1.6px solid var(--cd-line-4);
  box-shadow: 0 4px 12px -6px rgba(40, 38, 30, 0.22);
  transform: translateY(-10px);
}

.cd-bottom-nav__avatar-btn {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 6px 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.cd-bottom-nav__avatar {
  position: relative;
  display: block;
  width: 30px;
  height: 30px;
}

.cd-bottom-nav__avatar-img {
  display: block;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--cd-line);
}

.cd-bottom-nav__avatar-fallback {
  display: block;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--cd-line-3);
  border: 1px solid var(--cd-line);
}

.cd-bottom-nav__avatar-dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c0564b;
  border: 2px solid var(--cd-topbar);
}
</style>
