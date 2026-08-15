<template>
  <!--
    v2 notebook page shell. Built on SettingsPageV2, the leanest of the v2 shells: no
    background image, no scrim, no v2-appearance-store, no overlays. Desktop centres the
    393px phone frame.
    The bottom nav sits outside the v-if/v-else so it is present while loading too —
    otherwise the loading state strands the user on a screen with no way out.
  -->
  <div class="nb2" :class="{ 'nb2--desktop': isDesktop }">
    <div class="nb2__frame">
      <div class="nb2__content">
        <div class="nb2__dots" aria-hidden="true" />
        <div v-if="!store.isLoaded" class="nb2__loading">載入中…</div>
        <NotebookViewV2 v-else />
      </div>
      <Pv2BottomNav active="notes" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBreakpoint } from '@/composables/use-breakpoint'
import { useNotebookStore } from '@/stores/notebook-store'
import NotebookViewV2 from '@/components/v2/notebook/NotebookViewV2.vue'
import Pv2BottomNav from '@/components/v2/ui/Pv2BottomNav.vue'

const { isDesktop } = useBreakpoint()
const store = useNotebookStore()
</script>

<style scoped>
.nb2 {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.nb2__frame {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafaf9;
}

.nb2__content {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/*
  Dotted-paper backdrop. Anchored to __content rather than __frame: the desktop frame carries
  padding-top: 44px for the notch, and inset:0 resolves against the padding box, which would
  put the dot grid 44px out of phase between desktop and phone. On the content box both agree.
  The dots are paper texture and must not scroll with the feed, so they live on the static
  container rather than the scroller.
*/
.nb2__dots {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: radial-gradient(#c7c7c2 1.1px, transparent 1.1px);
  background-size: 20px 20px;
  background-position: 14px 14px;
}

.nb2__loading {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--cd-ink-muted);
  font: 500 14px var(--cd-font-ui);
}

/* Desktop: centre the 393px phone frame, matching SettingsPageV2. */
.nb2--desktop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 26px 18px;
  background: #d9d9d9;
  box-sizing: border-box;
}

.nb2--desktop .nb2__frame {
  width: 393px;
  height: 852px;
  flex: none;
  border-radius: 44px;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
  isolation: isolate;
  padding-top: 44px;
}
</style>
