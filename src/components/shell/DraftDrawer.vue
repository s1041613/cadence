<template>
  <CdDrawerOrSheet v-if="ui.draftDrawer" :presentation="isDesktop ? 'drawer' : 'sheet'" width="min(440px, 46%)" scrim-color="var(--cd-scrim-strong)" sheet-fullscreen @scrim-click="close">
    <CdDraftDrawer
      :groups="groups"
      :composer-text="inbox.inboxDraft"
      :search-query="searchQuery"
      :swipe-enabled="!isDesktop"
      @close="close"
      @update:composer-text="(v) => (inbox.inboxDraft = v)"
      @submit-composer="onSubmitComposer"
      @update:search-query="(v) => (searchQuery = v)"
      @remove-item="(id) => inbox.removeItem(id)"
      @toggle-done="(id) => inbox.toggleDone(id)"
      @open-schedule="openSchedule"
      @accept-ai-suggestion="openSchedule"
    />
  </CdDrawerOrSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CdDrawerOrSheet from '@/components/ui/CdDrawerOrSheet.vue'
import CdDraftDrawer, { type DraftItem } from '@/components/ui/CdDraftDrawer.vue'
import { useUiStore } from '@/stores/ui-store'
import { useInboxStore } from '@/stores/inbox-store'
import { useBreakpoint } from '@/composables/use-breakpoint'
import { useCurrentTime } from '@/composables/use-current-time'
import { groupByRecency } from '@/utils/group-by-recency'
import { parseISO } from '@/utils/convert-date-time'

// DraftDrawer — feature-layer composition for the Draft drawer (design.md "6.1 Replace the Inbox
// overlay with the Draft drawer"). Groups inbox-store items by recency (Today/Yesterday/Previous 7
// Days) via the pure groupByRecency util and renders the salvaged CdDraftDrawer content inside the same
// CdDrawerOrSheet convention every other overlay uses. Search (6.2) filters/highlights via
// `searchQuery`. Desktop draft scheduling opens EventComposerOverlay on top of the Draft window,
// matching the handoff's eventPreview/edit/fromDraft path.
const ui = useUiStore()
const inbox = useInboxStore()
const { isDesktop } = useBreakpoint()
const now = useCurrentTime()

const searchQuery = ref('')

const groups = computed(() => {
  const items = inbox.inboxItems.map((item): DraftItem & { createdAt: string } => ({
    id: item.id,
    text: item.text,
    done: item.done,
    createdAt: item.createdAt,
    ...(item.scheduled ? { scheduled: item.scheduled } : {})
  }))
  return groupByRecency(items, now.value)
})

function onSubmitComposer(): void {
  const text = inbox.inboxDraft.trim()
  if (!text) return
  inbox.addItem(text)
  inbox.inboxDraft = ''
}

function close(): void {
  closeSchedule()
  ui.draftDrawer = false
}

const scheduleDate = ref(ui.selectedDate)

function whenLabelFor(date: string): string {
  return date === ui.selectedDate ? 'Today' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseISO(date))
}

function openSchedule(id: string): void {
  const item = inbox.promoteItem(id)
  if (!item) return
  ui.draftConv = id
  scheduleDate.value = ui.selectedDate
  ui.eventComposerInitialValues = {
    date: scheduleDate.value,
    title: item.text,
    type: 'quadrant',
    allDay: false,
    start: '09:00',
    end: '10:00'
  }
}

function closeSchedule(): void {
  const wasPromotion = ui.draftConv !== null
  inbox.cancelPromotion()
  if (wasPromotion) ui.eventComposerInitialValues = null
  ui.draftConv = null
}
</script>
