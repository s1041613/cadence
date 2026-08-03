/**
 * The event colour palette, as named data.
 *
 * These hexes were previously a bare `string[]` inside CdAppearancePicker, with human
 * names only as source comments — fine for a grid of swatches, useless for the v2 list,
 * which shows the name as the row's label. Promoted here so both pickers read from one
 * source and a colour can't gain a name in one place and lose it in the other.
 *
 * Order is load-bearing: it is the order both pickers render, and it is the historical
 * order of the original flat array (muted set first, saturated set second). Changing it
 * reshuffles v1's swatch grid.
 */
export type EventColor = {
  hex: string
  name: string
}

export const EVENT_COLORS: readonly EventColor[] = [
  // Original muted set
  { hex: '#4A8B85', name: 'Teal' },
  { hex: '#63996B', name: 'Sage green' },
  { hex: '#6863B0', name: 'Indigo' },
  { hex: '#8E6FB0', name: 'Lilac' },
  { hex: '#A56D91', name: 'Mauve' },
  { hex: '#4C4E57', name: 'Slate' },
  // Added set — warmer and more saturated, for events that need to read at a glance
  { hex: '#3EBD79', name: 'Emerald green' },
  { hex: '#3FADAD', name: 'Modern cyan' },
  { hex: '#3B8FD9', name: 'Deep sky blue' },
  { hex: '#9C8378', name: 'Pastel brown' },
  { hex: '#D6453C', name: 'Apple red' },
  { hex: '#D65179', name: 'French rose' },
  { hex: '#DE6A5A', name: 'Coral pink' },
  { hex: '#E8B435', name: 'Bright orange' },
  { hex: '#9B72D4', name: 'Soft violet' }
]

/** Flat hex list, for the v1 swatch grid which renders colour without a label. */
export const EVENT_COLOR_HEXES: readonly string[] = EVENT_COLORS.map((c) => c.hex)

/**
 * A stored colour need not be in the palette (older events, a calendar's own colour), so
 * this returns null rather than guessing — callers fall back to showing the swatch alone.
 * Compared case-insensitively because hexes reach us from both hand-written constants and
 * the database.
 */
export function eventColorNameOf(hex: string | undefined): string | null {
  if (!hex) return null
  const match = EVENT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())
  return match?.name ?? null
}
