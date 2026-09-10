import { describe, expect, it } from 'vitest'
import { EVENT_COLORS, eventColorNameOf, tintOf } from './event-colors'

describe('eventColorNameOf', () => {
  it('names a palette colour regardless of hex case', () => {
    expect(eventColorNameOf('#d65179')).toBe('French rose')
    expect(eventColorNameOf('#D65179')).toBe('French rose')
  })

  it('returns null for a colour outside the palette', () => {
    expect(eventColorNameOf('#123456')).toBeNull()
    expect(eventColorNameOf(undefined)).toBeNull()
  })
})

describe('tintOf', () => {
  it('mixes towards white by the given weight', () => {
    // 16% of #000000 over white → 0*0.16 + 255*0.84 = 214 = 0xd6 on every channel.
    expect(tintOf('#000000', 0.16)).toBe('#d6d6d6')
  })

  it('keeps the colour at weight 1 and returns white at weight 0', () => {
    expect(tintOf('#dd6183', 1)).toBe('#dd6183')
    expect(tintOf('#dd6183', 0)).toBe('#ffffff')
  })

  it('expands the three-digit form', () => {
    expect(tintOf('#f00', 1)).toBe('#ff0000')
  })

  it('pads a channel that mixes down to a single hex digit', () => {
    // Guards the .padStart: without it #0f0f0f would come back as '#fff', a different colour.
    expect(tintOf('#0f0f0f', 1)).toBe('#0f0f0f')
  })

  it('returns null for anything that is not a hex colour', () => {
    expect(tintOf('rgb(1,2,3)', 0.2)).toBeNull()
    expect(tintOf('', 0.2)).toBeNull()
    expect(tintOf('#12345', 0.2)).toBeNull()
  })

  it('tints every palette colour to something a browser can parse', () => {
    for (const c of EVENT_COLORS) {
      expect(tintOf(c.hex, 0.16)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
