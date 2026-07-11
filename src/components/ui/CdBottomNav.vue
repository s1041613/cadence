<template>
  <nav class="cd-bottom-nav">
    <!-- <button type="button" class="cd-bottom-nav__btn" aria-label="Day view" @click="emit('update:activeView', 'day')">
      <CdIcon name="view-day" :size="24" />
    </button> -->
    <button type="button" class="cd-bottom-nav__btn" aria-label="Month view" @click="emit('update:activeView', 'month')">
      <CdIcon name="view-month" :size="24" />
    </button>
    <button type="button" class="cd-bottom-nav__btn" aria-label="Week view" @click="emit('update:activeView', 'week')">
      <CdIcon name="view-week" :size="24" />
    </button>
    <!-- <button type="button" class="cd-bottom-nav__ai" aria-label="Assistant" @click="emit('openAssistant')">
      <CdIcon name="spark" :size="24" />
    </button> -->
    <button type="button" class="cd-bottom-nav__btn" aria-label="Journal" @click="emit('openJournal')">
      <CdIcon name="journal" :size="26" />
    </button>
    <button type="button" class="cd-bottom-nav__avatar-btn" aria-label="Settings" @click="emit('openSettings')">
      <span class="cd-bottom-nav__avatar">
        <img v-if="avatarSrc" :src="avatarSrc" alt="" class="cd-bottom-nav__avatar-img" />
        <span v-else class="cd-bottom-nav__avatar-fallback">{{ initials }}</span>
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
// props/emits. Nav glyphs are mode:'img' two-tone brand files rendered at their fixed design
// colors regardless of active view — no active/inactive recolor or dimming (Zoe 2026-07-11).
import { computed } from 'vue'
import CdIcon from './CdIcon.vue'

const props = withDefaults(
  defineProps<{
    activeView: string
    avatarSrc?: string | null
    avatarName?: string
  }>(),
  { avatarSrc: null, avatarName: 'chloe.rivera' }
)

const emit = defineEmits<{
  'update:activeView': [value: string]
  openAssistant: []
  openJournal: []
  openSettings: []
}>()

const initials = computed(() =>
  props.avatarName
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
)
</script>

<style scoped>
.cd-bottom-nav {
  display: flex;
  align-items: center;
  background: var(--cd-topbar);
  border-top: 1px solid var(--cd-line);
  padding: 6px 8px 35px;
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
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--cd-topbar);
  border: 1px solid var(--cd-line);
  font: 700 12px var(--cd-font-ui);
  color: var(--cd-ink);
}

</style>
