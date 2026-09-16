/**
 * Line icons for the Settings root menu rows.
 *
 * Every path is stroked in `currentColor`, not in a token: the row owns the colour, so the
 * Log out row tints its icon and its label with one declaration and the spec's "icon and text
 * share the accent" holds by construction rather than by two values kept in step by hand.
 *
 * 22px is the spec's drawn size and matches the 24-unit viewBox at ~0.92 — the strokes stay on
 * the same rhythm as the nav's icons (see pv2-nav-icons.ts) inside the 40px container.
 */
const ATTRS =
  'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'

export const PV2_SETTINGS_ICONS = {
  calendars: `<svg ${ATTRS}><rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 9.5 H20 M8 3 V6 M16 3 V6"/></svg>`,
  time: `<svg ${ATTRS}><circle cx="12" cy="12" r="8.5"/><path d="M12 7 V12 L15.5 14"/></svg>`,
  customization: `<svg ${ATTRS}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="8.5" cy="9" r="1.6"/><path d="M20 15 L15 10 L5 20"/></svg>`,
  notifications: `<svg ${ATTRS}><path d="M6 9 a6 6 0 0 1 12 0 c0 5 2 6 2 6 H4 s2-1 2-6"/><path d="M10 20 a2 2 0 0 0 4 0"/></svg>`,
  privacy: `<svg ${ATTRS}><path d="M12 3 L19 6 V11 c0 5-3 8-7 10 c-4-2-7-5-7-10 V6 Z"/></svg>`,
  logout: `<svg ${ATTRS}><path d="M9 5 H5 a2 2 0 0 0-2 2 v10 a2 2 0 0 0 2 2 h4 M15 8 l4 4-4 4 M19 12 H9"/></svg>`
} as const

export type Pv2SettingsIconKey = keyof typeof PV2_SETTINGS_ICONS

/**
 * The chevron every settings row and the profile card ends with. 18px, the top of the spec's
 * 16–18 range, so it still reads at the low contrast the spec asks of it.
 */
export const PV2_SETTINGS_CHEVRON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5 L16 12 L9 19"/></svg>'
