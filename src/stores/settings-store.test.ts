import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings-store'

describe('settings-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with the documented defaults', () => {
    const store = useSettingsStore()
    expect(store.timeFormat).toBe('24-Hour')
    expect(store.firstDay).toBe('Sunday')
    expect(store.monthEventLabel).toBe('name')
    expect(store.showPhoto).toBe(true)
  })

  it('each preference is independently settable', () => {
    const store = useSettingsStore()
    store.firstDay = 'Monday'
    store.monthEventLabel = 'dot'
    store.showPhoto = false
    expect(store).toMatchObject({ timeFormat: '24-Hour', firstDay: 'Monday', monthEventLabel: 'dot', showPhoto: false })
  })

  it('accepts the icon label mode (icon + name chips)', () => {
    const store = useSettingsStore()
    store.monthEventLabel = 'icon'
    expect(store.monthEventLabel).toBe('icon')
  })
})
