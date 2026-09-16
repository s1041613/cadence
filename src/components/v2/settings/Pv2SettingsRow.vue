<template>
  <!--
    One menu row inside a settings card. Every row on the page is this component, which is what
    keeps the spec's two "must be identical" numbers (64px row height, 40x40 icon container)
    true by construction instead of by six copies agreeing.

    tone="danger" colours the row — label AND icon, since the icon strokes in currentColor —
    with the coral accent. Nothing else changes: the spec asks for an accent, not an alarm.
  -->
  <button
    type="button"
    class="pv2-set-row"
    :class="{
      'pv2-set-row--divided': divided,
      'pv2-set-row--danger': tone === 'danger',
      'pv2-set-row--enabled': !disabled
    }"
    :disabled="disabled"
    @click="emit('click')"
  >
    <span class="pv2-set-row__icon" aria-hidden="true" v-html="PV2_SETTINGS_ICONS[icon]" />
    <span class="pv2-set-row__label">{{ label }}</span>
    <span v-if="chevron" class="pv2-set-row__chev" aria-hidden="true" v-html="PV2_SETTINGS_CHEVRON" />
  </button>
</template>

<script setup lang="ts">
import { PV2_SETTINGS_CHEVRON, PV2_SETTINGS_ICONS, type Pv2SettingsIconKey } from './pv2-settings-icons'

withDefaults(
  defineProps<{
    icon: Pv2SettingsIconKey
    label: string
    /** Hairline above the row. The card's first row doesn't take one. */
    divided?: boolean
    disabled?: boolean
    tone?: 'default' | 'danger'
    /** Log out goes nowhere, so it ends without one. */
    chevron?: boolean
  }>(),
  { divided: false, disabled: false, tone: 'default', chevron: true }
)

const emit = defineEmits<{
  click: []
}>()
</script>

<style scoped>
.pv2-set-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  /* Fixed, not min-height: the spec's acceptance check is that every row is the same height,
     and box-sizing lets the 1px divider live inside that number rather than growing the row. */
  height: 64px;
  box-sizing: border-box;
  padding: 0 16px;
  border: none;
  background: none;
  cursor: default;
  text-align: left;
  color: var(--pv2-set-ink);
}

.pv2-set-row--enabled {
  cursor: pointer;
}

/* Drawn with ::before rather than border-top so it can start at the text (spec §4: the rule
   never crosses the icon). 70px = 16 padding + 40 icon container + 14 gap — the same three
   numbers the flex row above is built from. */
.pv2-set-row--divided::before {
  content: '';
  position: absolute;
  top: 0;
  left: 70px;
  right: 0;
  height: 1px;
  background: var(--pv2-set-line);
}

/* The pale pink disc. Composed from the accent's own channels rather than a sampled pink, so
   a palette that re-tints --pv2-accent re-tints these with it. */
.pv2-set-row__icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(var(--pv2-accent-rgb), 0.1);
  color: var(--pv2-set-ink);
}

/* Title Case at reading size — the row labels are options, not headings, and the uppercase
   mono they used to wear read as a section label sitting where an option should be. */
.pv2-set-row__label {
  flex: 1;
  min-width: 0;
  font: 500 16px var(--cd-font-ui);
  letter-spacing: 0;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv2-set-row__chev {
  flex: none;
  display: grid;
  place-items: center;
  color: var(--pv2-set-chev);
}

/* Label and icon both inherit this, which is the whole of what "danger" means here. */
.pv2-set-row--danger {
  color: var(--pv2-set-danger);
}

.pv2-set-row--danger .pv2-set-row__icon {
  color: var(--pv2-set-danger);
}

/* Press feedback only where there is somewhere to go. */
.pv2-set-row--enabled:active {
  background: rgba(var(--pv2-ink-rgb), 0.03);
}

@media (prefers-reduced-motion: reduce) {
  .pv2-set-row--enabled:active {
    background: none;
  }
}
</style>
