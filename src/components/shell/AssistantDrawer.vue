<template>
  <CdDrawerOrSheet
    v-if="ui.assistantOpen"
    :presentation="isDesktop ? 'drawer' : 'sheet'"
    width="min(440px, 46%)"
    scrim-color="var(--cd-scrim-strong)"
    sheet-fullscreen
    @scrim-click="close"
  >
    <CdAssistantDrawer :input-value="inputValue" @close="close" @chip-click="onChipClick" @update:input-value="(v) => (inputValue = v)" @send="onSend" />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdAssistantDrawer from '@/components/ui/CdAssistantDrawer.vue'
import { useUiStore } from '@/stores/ui-store'
import { useBreakpoint } from '@/composables/use-breakpoint'

// AssistantDrawer — feature-layer composition for the Assistant overlay (design.md "7.4 Ship the
// static shells... the Assistant drawer"). No backend per the proposal's Non-Goals ("AI Assistant
// backend... ship as static shells") — chip clicks and send are inert, matching
// CdAssistantDrawer's own header comment ("this component still emits so a consumer *could* wire
// them up, but the reference design leaves them inert"). CdDrawer's `nonModal` desktop treatment
// (no scrim, pointer-events pass-through) applies only above the breakpoint; phone keeps the modal
// bottom sheet with a scrim, since a non-modal sheet would leave the rest of the phone screen
// unusably layered beneath it.
const ui = useUiStore()
const { isDesktop } = useBreakpoint()

const inputValue = ref('')

function close(): void {
  ui.assistantOpen = false
}

function onChipClick(_chip: string): void {
  // Static shell — no backend to route the suggestion to.
}

function onSend(): void {
  inputValue.value = ''
}
</script>
