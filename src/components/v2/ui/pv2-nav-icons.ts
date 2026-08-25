import type { NavKey } from '@/stores/v2-tabs-store'

// currentColor line icons for Pv2BottomNav, keyed by NavKey — deliberately separate
// from V2Tab.glyph (that field stays the serif letter Pv2SettingsTabBar's circular
// avatar reads; this map has no other consumer). Follows the data-driven v-html icon
// pattern already used by Pv2SettingsRoot's ICON_* set, with currentColor (not a
// hardcoded stroke hex) so the wrapping span's CSS `color` drives the active/inactive
// tint the same way the label text already does.
export const PV2_NAV_ICON_PATHS: Record<NavKey, string> = {
  month:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5.5" width="16" height="15" rx="3"/><path d="M4 10H20M8.5 3v3.5M15.5 3v3.5"/></svg>',
  week:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="4.5" height="15" rx="1.6"/><rect x="9.75" y="4.5" width="4.5" height="15" rx="1.6"/><rect x="16" y="4.5" width="4.5" height="15" rx="1.6"/></svg>',
  draft:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="7" r="1.1" fill="currentColor" stroke="none"/><path d="M9 7H20"/><circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M9 12H20"/><circle cx="5" cy="17" r="1.1" fill="currentColor" stroke="none"/><path d="M9 17H20"/></svg>',
  notes:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  setting:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M4.5 12h-3M22.5 12h-3M6.3 6.3L4.2 4.2M19.8 19.8l-2.1-2.1M17.7 6.3l2.1-2.1M4.2 19.8l2.1-2.1"/></svg>'
}
