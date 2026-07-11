import { describe, expect, it } from 'vitest'
import { anchoredPosition } from './anchored-position'

describe('anchoredPosition', () => {
  const root = { width: 1280, height: 800 }
  const card = { width: 320, height: 200 }

  it('places the card below-left of the anchor by default', () => {
    const anchor = { x: 100, y: 100, width: 60, height: 30 }
    const pos = anchoredPosition(anchor, card, root)
    expect(pos).toEqual({ x: 100, y: 100 + 30 + 8 })
  })

  it('flips above the anchor when the card would overflow the bottom', () => {
    const anchor = { x: 100, y: 700, width: 60, height: 30 }
    const pos = anchoredPosition(anchor, card, root)
    // below would be 700+30+8=738, +200 height = 938 > 800 root height -> flip
    expect(pos.y).toBe(700 - 8 - 200)
  })

  it('stays below when flipping above would go negative and below still fits', () => {
    const anchor = { x: 100, y: 10, width: 60, height: 30 }
    const pos = anchoredPosition(anchor, card, root)
    expect(pos.y).toBe(10 + 30 + 8)
  })

  it('clamps horizontally into the root when the anchor is near the right edge', () => {
    const anchor = { x: 1200, y: 100, width: 60, height: 30 }
    const pos = anchoredPosition(anchor, card, root)
    expect(pos.x).toBe(root.width - card.width)
  })

  it('clamps horizontally into the root when the anchor is near the left edge', () => {
    const anchor = { x: -50, y: 100, width: 60, height: 30 }
    const pos = anchoredPosition(anchor, card, root)
    expect(pos.x).toBe(0)
  })

  it('respects a custom gap', () => {
    const anchor = { x: 100, y: 100, width: 60, height: 30 }
    const pos = anchoredPosition(anchor, card, root, 20)
    expect(pos.y).toBe(100 + 30 + 20)
  })

  it('clamps vertically when neither below nor flipped-above fully fits a short root', () => {
    // A root shorter than card.height + gap leaves no position where the card fits without
    // clamping — the anchor sits deep enough that flipping above would go negative too.
    const shortRoot = { width: 1280, height: 300 }
    const anchor = { x: 100, y: 200, width: 60, height: 20 }
    const pos = anchoredPosition(anchor, card, shortRoot)
    expect(pos.y).toBe(shortRoot.height - card.height)
  })
})
