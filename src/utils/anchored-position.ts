// Anchored popover positioning for Quick-Add and Event Preview (CdPopover).
// Pure function + unit tests because this behavior was a truncated/reconstructed
// region of the design export and must be pinned by tests rather than eyeballing
// (see design.md "Anchored popover positioning as a pure function").
//
// Placement rule: default below-left of the anchor; flip above the anchor when the
// card would overflow the bottom of root; clamp horizontally so the card never
// extends past root's left/right edges.

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface AnchoredPoint {
  x: number
  y: number
}

const DEFAULT_GAP = 8

/**
 * Computes the top-left position for `card` anchored to `anchor`, clamped within `root`.
 * `root` is treated as starting at (0, 0) — callers pass anchor/root in the same coordinate space.
 */
export function anchoredPosition(anchor: Rect, card: Size, root: Size, gap: number = DEFAULT_GAP): AnchoredPoint {
  const belowY = anchor.y + anchor.height + gap
  const overflowsBottom = belowY + card.height > root.height
  const aboveY = anchor.y - gap - card.height
  const rawY = overflowsBottom && aboveY >= 0 ? aboveY : belowY

  // Neither "below" nor "flipped above" may fully fit when `card.height` is close to or exceeds
  // `root.height` (e.g. an approximate height budget larger than the card's real rendered size, on
  // a short viewport) — clamp vertically the same way `x` is clamped, so the card's bottom edge
  // never exceeds root regardless of which branch above was chosen.
  const y = clamp(rawY, 0, root.height - card.height)

  const x = clamp(anchor.x, 0, root.width - card.width)

  return { x, y }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}
