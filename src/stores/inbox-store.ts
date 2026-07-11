import { defineStore } from 'pinia'
import { ref } from 'vue'
import { iso } from '@/utils/convert-date-time'

export interface ScheduledTag {
  type: 'task' | 'event'
  color: string
  tag: string
}

export interface InboxItem {
  id: string
  text: string
  createdAt: string // ISO date (YYYY-MM-DD), drives Today/Yesterday/Previous 7 Days grouping
  done: boolean
  scheduled: ScheduledTag | null
}

export const useInboxStore = defineStore('inbox', () => {
  const inboxItems = ref<InboxItem[]>([])
  const inboxDraft = ref('')

  // Not returned: promotion is an internal invariant, not public state. A non-null value
  // exists if and only if a promotion-initiated editing session is currently open.
  const promotionSourceItemId = ref<string | null>(null)

  function addItem(text: string): void {
    inboxItems.value.unshift({ id: crypto.randomUUID(), text, createdAt: iso(new Date()), done: false, scheduled: null })
  }

  function removeItem(id: string): void {
    inboxItems.value = inboxItems.value.filter((item) => item.id !== id)
  }

  function toggleDone(id: string): void {
    const item = inboxItems.value.find((i) => i.id === id)
    if (item) item.done = !item.done
  }

  function promoteItem(id: string): InboxItem | undefined {
    const item = inboxItems.value.find((i) => i.id === id)
    if (!item) return undefined
    promotionSourceItemId.value = id
    return item
  }

  // inbox-capture spec "Schedule conversion previews availability before promoting": a promoted
  // draft is marked done and tagged rather than removed, so it stays visible (struck through, with
  // its scheduled tag) in the grouped list — matching CdDraftDrawer's presentational contract.
  function completePromotion(scheduled: ScheduledTag): void {
    if (promotionSourceItemId.value !== null) {
      const item = inboxItems.value.find((i) => i.id === promotionSourceItemId.value)
      if (item) {
        item.done = true
        item.scheduled = scheduled
      }
      promotionSourceItemId.value = null
    }
  }

  function cancelPromotion(): void {
    promotionSourceItemId.value = null
  }

  return {
    inboxItems,
    inboxDraft,
    addItem,
    removeItem,
    toggleDone,
    promoteItem,
    completePromotion,
    cancelPromotion
  }
})
