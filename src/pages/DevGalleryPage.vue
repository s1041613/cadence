<template>
  <div class="gallery">
    <h1 class="gallery__title">Cadence UI Gallery</h1>
    <p class="gallery__note">Dev-only visual verification surface — replaces Storybook (see design.md).</p>

    <section class="gallery__section">
      <h2>Icons</h2>
      <div class="gallery__icon-grid">
        <div v-for="name in iconNames" :key="name" class="gallery__icon-cell">
          <CdIcon :name="name" :size="24" />
          <span class="gallery__icon-label">{{ name }}</span>
        </div>
      </div>
    </section>

    <section class="gallery__section">
      <h2>Quadrant themes</h2>
      <div class="gallery__row">
        <div v-for="q in QUADRANTS" :key="q.key" class="gallery__swatch" :style="{ background: q.backgroundColor, color: q.textColor }">
          {{ q.name }}
        </div>
      </div>
    </section>

    <section class="gallery__section">
      <h2>CdSegmented</h2>
      <CdSegmented v-model="segmentValue" :options="segmentOptions" />
    </section>

    <section class="gallery__section">
      <h2>CdIconButton</h2>
      <div class="gallery__row">
        <CdIconButton ariaLabel="Default">
          <CdIcon name="close" />
        </CdIconButton>
        <CdIconButton ariaLabel="Danger" danger>
          <CdIcon name="trash" />
        </CdIconButton>
        <CdIconButton ariaLabel="Small" :size="30">
          <CdIcon name="chevron-left" />
        </CdIconButton>
      </div>
    </section>

    <section class="gallery__section">
      <h2>CdEventChip</h2>
      <div class="gallery__row">
        <CdEventChip
          v-for="fmt in (['time', 'name', 'dot'] as const)"
          :key="fmt"
          title="Deep work"
          color="#6E839B"
          quad="plan"
          time="14:00"
          :all-day="false"
          :done="false"
          :fmt="fmt"
        />
        <CdEventChip title="All-day trip" color="#C56A5E" quad="do" :time="null" all-day :done="false" fmt="name" />
        <CdEventChip title="Done task" color="#BFA86A" quad="quick" time="09:00" :all-day="false" done fmt="name" />
      </div>
    </section>

    <section class="gallery__section">
      <h2>CdSwitch</h2>
      <div class="gallery__row">
        <CdSwitch v-model="switchOn" size="30x17" />
        <CdSwitch v-model="switchOn" size="34x19" />
        <CdSwitch v-model="switchOn" size="46x28" />
      </div>
    </section>

    <section class="gallery__section">
      <h2>AppShellChrome (tasks 2.1/2.2)</h2>
      <p class="gallery__note">
        Resize this browser window past the 900px breakpoint to see the desktop topbar+cal-strip swap with the phone
        bottom-nav+FAB — same component, CSS media query drives which chrome shows. Not mounted in IndexPage.vue yet
        (see AppShellChrome.vue's top comment for why).
      </p>
      <div class="gallery__shell-frame">
        <AppShellChrome />
      </div>
    </section>

    <section class="gallery__section">
      <h2>CdDrawerOrSheet (task 2.4)</h2>
      <p class="gallery__note">
        Both presentations of the same overlay, side by side — verify scrim-click and the close button dismiss each.
      </p>
      <div class="gallery__row">
        <button type="button" class="gallery__demo-btn" @click="drawerOpen = true">Open as drawer</button>
        <button type="button" class="gallery__demo-btn" @click="sheetOpen = true">Open as sheet</button>
      </div>
      <div v-if="drawerOpen || sheetOpen" class="gallery__shell-frame gallery__overlay-frame">
        <CdDrawerOrSheet :presentation="drawerOpen ? 'drawer' : 'sheet'" @scrim-click="closeOverlayDemo">
          <div class="gallery__overlay-demo">
            <button type="button" class="gallery__demo-btn" @click="closeOverlayDemo">Close</button>
            <p>{{ drawerOpen ? 'Drawer presentation' : 'Sheet presentation' }}</p>
          </div>
        </CdDrawerOrSheet>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CdIcon from '@/components/ui/CdIcon.vue'
import CdSegmented from '@/components/ui/CdSegmented.vue'
import CdIconButton from '@/components/ui/CdIconButton.vue'
import CdEventChip from '@/components/ui/CdEventChip.vue'
import CdSwitch from '@/components/ui/CdSwitch.vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import AppShellChrome from '@/components/shell/AppShellChrome.vue'
import { ICONS, type IconName } from '@/components/ui/icons'
import { QUADRANTS } from '@/composables/use-theme'

const iconNames = Object.keys(ICONS) as IconName[]

const segmentValue = ref('name')
const segmentOptions = [
  { value: 'name', label: 'Name' },
  { value: 'time', label: 'Time' },
  { value: 'dots', label: 'Dots' }
]

const switchOn = ref(true)

const drawerOpen = ref(false)
const sheetOpen = ref(false)
function closeOverlayDemo(): void {
  drawerOpen.value = false
  sheetOpen.value = false
}
</script>

<style scoped>
.gallery {
  padding: 32px;
  font-family: var(--cd-font-ui, sans-serif);
  color: var(--cd-ink, #56585e);
}

.gallery__title {
  font-family: var(--cd-font-title, sans-serif);
  margin: 0 0 4px;
}

.gallery__note {
  color: var(--cd-muted, #9c9e94);
  margin: 0 0 32px;
}

.gallery__section {
  margin-bottom: 40px;
}

.gallery__section h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--cd-ink-2, #6e7176);
  margin: 0 0 16px;
}

.gallery__row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.gallery__icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 16px;
}

.gallery__icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--cd-line, #e5e3db);
  border-radius: var(--cd-radius-sm, 9px);
}

.gallery__icon-label {
  font-size: 10px;
  color: var(--cd-muted, #9c9e94);
  text-align: center;
  word-break: break-word;
}

.gallery__swatch {
  padding: 12px 20px;
  border-radius: var(--cd-radius-chip, 7px);
  font-weight: 600;
}

.gallery__shell-frame {
  position: relative;
  min-height: 140px;
  border: 1px dashed var(--cd-line, #e5e3db);
  border-radius: var(--cd-radius-sm, 9px);
  overflow: hidden;
}

.gallery__overlay-frame {
  min-height: 320px;
}

.gallery__overlay-demo {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.gallery__demo-btn {
  border: 1px solid var(--cd-line, #e5e3db);
  background: var(--cd-surface, #fbfaf7);
  border-radius: var(--cd-radius-chip, 7px);
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
}
</style>
