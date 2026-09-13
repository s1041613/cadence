/**
 * The event colour palette, as named data.
 *
 * These hexes were previously a bare `string[]` inside CdAppearancePicker, with human
 * names only as source comments — fine for a grid of swatches, useless for the v2 list,
 * which shows the name as the row's label. Promoted here so both pickers read from one
 * source and a colour can't gain a name in one place and lose it in the other.
 *
 * Two sets live here. PINK_EVENT_COLORS is one family — pink through rose, coral and
 * orchid to plum — where events are told apart by INTENSITY rather than by hue, which is
 * what the reference design does. LEGACY_EVENT_COLORS is the spread of hues that came
 * before it, back because a calendar where work is blue and the gym is green is readable
 * at a glance in a way one family cannot be for everyone.
 *
 * EVENT_COLORS is both. eventColorsFor() narrows it per account.
 *
 * Every entry is chosen so both chip renderings stay legible: solid fill with
 * `readableInkOn` measures at least 4.5:1, and the tinted fill the timed chip uses
 * (`tintOf` + `shadeOf`) at least 4.9:1. Adding a colour means re-checking both — a
 * mid-tone that suits neither white nor the deep ink is the failure mode.
 *
 * Order is load-bearing: it is the order both pickers render.
 */
export type EventColor = {
  hex: string
  name: string
}

/** The pink family. One hue, told apart by intensity — see the note at the top of this file. */
export const PINK_EVENT_COLORS: readonly EventColor[] = [
  // Pinks, pale → deep
  { hex: '#F7C8D9', name: 'Blossom pink' },
  { hex: '#F7A8C4', name: 'Petal pink' },
  { hex: '#F58BB4', name: 'Bubblegum' },
  { hex: '#F26FA5', name: 'Flamingo' },
  { hex: '#EC5093', name: 'Hot pink' },
  { hex: '#D82E77', name: 'Fuchsia' },
  { hex: '#C92E6C', name: 'Raspberry' },
  { hex: '#A82A5C', name: 'Berry' },
  // Warm side of the family — the coral end
  { hex: '#F4A9A0', name: 'Peach' },
  { hex: '#EE7F86', name: 'Coral rose' },
  { hex: '#DC5A6E', name: 'Rose red' },
  // Cool side — violet-leaning pinks, for events that should sit back
  { hex: '#D98BC4', name: 'Orchid' },
  { hex: '#B96DB0', name: 'Lilac' },
  { hex: '#8E5A8A', name: 'Mulberry' },
  { hex: '#6E4E63', name: 'Plum' }
]

/**
 * The hues this palette shipped with before the pink family replaced them.
 *
 * Back because they are what most people reach for: a calendar where work is blue and the gym
 * is green is a calendar you can read without reading it, and one family cannot do that for
 * everyone. The hexes are the originals, untouched — events created while these were the
 * palette still carry them, and a value that moved would leave those events orphaned from
 * their own name.
 *
 * One label changed and no colour did: #8E6FB0 was 'Lilac', which the pink family now uses for
 * #B96DB0. The name is a row label; the hex is the data.
 *
 * Five of these measure between 4.0:1 and 4.5:1 as a solid fill (Teal, Lavender, Mauve, Apple
 * red, French rose) — see the test. They are grandfathered rather than corrected: they shipped
 * at these values, and nudging someone's colour to win a ratio is a worse trade than a title
 * that is a half-step under on the all-day bar.
 */
export const LEGACY_EVENT_COLORS: readonly EventColor[] = [
  { hex: '#4A8B85', name: 'Teal' },
  { hex: '#63996B', name: 'Sage green' },
  { hex: '#6863B0', name: 'Indigo' },
  { hex: '#8E6FB0', name: 'Lavender' },
  { hex: '#A56D91', name: 'Mauve' },
  { hex: '#4C4E57', name: 'Slate' },
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

/** Everything a picker can offer: the pink family first, then the hues. */
export const EVENT_COLORS: readonly EventColor[] = [...PINK_EVENT_COLORS, ...LEGACY_EVENT_COLORS]

/**
 * Accounts that see the pink family and nothing else.
 *
 * A preference, hard-coded as a rule, because that is what was asked for. Two things to know
 * before this list grows: it ships in the client bundle, so every address in it is readable by
 * anyone who opens devtools; and it cannot be changed without a deploy. The durable shape for
 * "which palette do I see" is a per-user setting — this constant is where that would plug in.
 */
const PINK_ONLY_EMAILS: readonly string[] = ['y10135124@gmail.com']

/**
 * The palette to offer this account. Unknown or signed-out gets everything: a picker that
 * silently shows fewer colours than the app has is a bug to everyone who is not on the list.
 */
export function eventColorsFor(email: string | null | undefined): readonly EventColor[] {
  const normalised = email?.trim().toLowerCase()
  return normalised && PINK_ONLY_EMAILS.includes(normalised) ? PINK_EVENT_COLORS : EVENT_COLORS
}

/** Flat hex list, for the v1 swatch grid which renders colour without a label. */
export const EVENT_COLOR_HEXES: readonly string[] = EVENT_COLORS.map((c) => c.hex)

/** The same, narrowed to one account's palette. */
export const eventColorHexesFor = (email: string | null | undefined): readonly string[] =>
  eventColorsFor(email).map((c) => c.hex)

/** The palette's default — the mid-tone that reads as "an event" with nothing chosen. */
export const DEFAULT_EVENT_COLOR = '#EC5093'

/**
 * The deep plum every light chip sets its text in.
 *
 * Not --pv2-ink: these three helpers run in JS and their results are written into inline
 * styles, so they cannot resolve a custom property. It is a shade darker than --pv2-ink
 * on purpose — the ink has to clear 4.5:1 against the palette's mid-tones, not just
 * against the page.
 */
const CHIP_INK = '#2A1420'

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex(rgb: number[]): string {
  return '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')
}

function mix(from: string, to: string, amount: number): string {
  const a = channels(from)
  const b = channels(to)
  return toHex(a.map((c, i) => c + (b[i]! - c) * amount))
}

/** WCAG relative luminance, for choosing between the two text colours. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Text colour for a solid fill of `hex` — whichever of white and the chip ink measures
 * better, not a fixed white.
 *
 * A fixed white was survivable while every palette entry was a saturated mid-tone. It is
 * not survivable now: white on Blossom pink is 1.5:1, i.e. an invisible title, and the
 * pale end of the family is the half the design leans on most.
 */
export function readableInkOn(hex: string): string {
  return contrast(hex, '#ffffff') >= contrast(hex, CHIP_INK) ? '#ffffff' : CHIP_INK
}

/**
 * The washed-out fill a chip uses when it wants the colour present but not shouting.
 *
 * How far towards white depends on the colour's own lightness, and that is the whole point: a
 * fixed 86% mix turned Blossom pink into #FEF5F8, which against the #fafaf9 page is a 1.03:1
 * difference — a chip with no visible fill at all, exactly the half of the palette this
 * rendering exists to serve. Scaling the mix by luminance keeps every tint at least 1.13:1
 * against the page while leaving the deep end as washed as before.
 */
export function tintOf(hex: string): string {
  const amount = Math.min(0.88, Math.max(0.52, 0.9 - 0.55 * luminance(hex)))
  return mix(hex, '#ffffff', amount)
}

/** The same colour taken deep enough to set text on `tintOf(hex)` — at least 4.9:1. */
export function shadeOf(hex: string): string {
  return mix(hex, CHIP_INK, 0.6)
}

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
