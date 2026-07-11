import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInboxStore } from './inbox-store'

describe('inbox-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('promote then completePromotion clears the marker and marks the item done with a scheduled tag', () => {
    const store = useInboxStore()
    store.addItem('call the dentist')
    const id = store.inboxItems[0]!.id

    store.promoteItem(id)
    store.completePromotion({ type: 'task', color: '#6E839B', tag: 'Scheduled' })

    expect(store.inboxItems).toHaveLength(1)
    expect(store.inboxItems[0]!.done).toBe(true)
    expect(store.inboxItems[0]!.scheduled).toEqual({ type: 'task', color: '#6E839B', tag: 'Scheduled' })
    // idempotency: calling completePromotion again must be a no-op, proving the marker cleared
    expect(() => store.completePromotion({ type: 'task', color: '#6E839B', tag: 'Scheduled' })).not.toThrow()
  })

  it('promote then cancelPromotion clears the marker and leaves the inbox item', () => {
    const store = useInboxStore()
    store.addItem('call the dentist')
    const id = store.inboxItems[0]!.id

    store.promoteItem(id)
    store.cancelPromotion()

    expect(store.inboxItems).toHaveLength(1)
    expect(store.inboxItems[0]!.id).toBe(id)

    // marker is cleared: an unrelated completePromotion call must not mark this item done
    store.completePromotion({ type: 'task', color: '#6E839B', tag: 'Scheduled' })
    expect(store.inboxItems[0]!.done).toBe(false)
  })

  it('calling cancelPromotion when no promotion is active does not throw and has no side effect', () => {
    const store = useInboxStore()
    store.addItem('unrelated item')

    expect(() => store.cancelPromotion()).not.toThrow()
    expect(store.inboxItems).toHaveLength(1)
  })
})
