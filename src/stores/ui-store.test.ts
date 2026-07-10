import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from './ui-store'

describe('ui-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('preserves the selected date across a view switch', () => {
    const store = useUiStore()
    store.selectedDate = '2026-07-08'
    store.activeView = 'day'

    store.activeView = 'week'

    expect(store.selectedDate).toBe('2026-07-08')
  })

  it('starts with every overlay closed', () => {
    const store = useUiStore()
    expect(store.qaPop).toBeNull()
    expect(store.eventPreview).toBeNull()
    expect(store.createOpen).toBe(false)
    expect(store.dayList).toBeNull()
    expect(store.monthSheet).toBe(false)
    expect(store.draftDrawer).toBe(false)
    expect(store.draftConv).toBeNull()
    expect(store.assistantOpen).toBe(false)
    expect(store.settingsOpen).toBe(false)
    expect(store.settingsPane).toBe('root')
  })
})
