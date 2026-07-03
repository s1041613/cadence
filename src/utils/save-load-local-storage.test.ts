import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadStore, saveStore } from './save-load-local-storage'

const KEY = 'test.key'

// vitest's default node environment has no localStorage global; stub a minimal in-memory version.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size
    }
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage())
})

describe('saveStore / loadStore', () => {
  it('round-trips a saved value', () => {
    saveStore(KEY, { a: 1, b: 'two' })
    expect(loadStore(KEY)).toEqual({ a: 1, b: 'two' })
  })

  it('returns undefined when the key is missing', () => {
    expect(loadStore('missing.key')).toBeUndefined()
  })
})
