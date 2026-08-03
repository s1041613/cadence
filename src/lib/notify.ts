import { Notify } from 'quasar'

// Sync-failure toast with a retry action. Requires the Notify plugin to be
// registered in quasar.config.ts.
//
// The empty icon is deliberate. `type: 'negative'` otherwise supplies a
// material-icons glyph, and that icon set renders glyphs as ligatures — the
// literal text "warning" inside an <i>. No icon font is loaded (quasar.config.ts
// leaves `extras` empty and `iconSet` unset, because the app draws its own glyphs
// via CdIcon's SVG masks), so the word printed as text across the message.
// Quasar renders the icon slot only when `icon` is truthy, so '' suppresses it.
export function notifySyncError(message: string, retry: () => void): void {
  Notify.create({
    type: 'negative',
    icon: '',
    message,
    actions: [{ label: 'retry', color: 'white', handler: retry }]
  })
}
