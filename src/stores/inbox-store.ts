import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface InboxItem {
  id: string
  text: string
}

export const useInboxStore = defineStore('inbox', () => {
  const inboxItems = ref<InboxItem[]>([])
  const inboxDraft = ref('')

  // Not returned: promotion is an internal invariant, not public state. A non-null value
  // exists if and only if a promotion-initiated editing session is currently open.
  const promotionSourceItemId = ref<string | null>(null)

  function addItem(text: string): void {
    inboxItems.value.unshift({ id: crypto.randomUUID(), text })
  }

  function removeItem(id: string): void {
    inboxItems.value = inboxItems.value.filter((item) => item.id !== id)
  }

  function promoteItem(id: string): InboxItem | undefined {
    const item = inboxItems.value.find((i) => i.id === id)
    if (!item) return undefined
    promotionSourceItemId.value = id
    return item
  }

  function completePromotion(): void {
    if (promotionSourceItemId.value !== null) {
      removeItem(promotionSourceItemId.value)
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
    promoteItem,
    completePromotion,
    cancelPromotion
  }
})
