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

// Confirmation toast for a write that can be taken back — a task moved onto another day, a
// batch of them moved at once. Not `type: 'positive'` for the same reason notifySyncError
// blanks its icon: the type's glyph arrives as a material-icons ligature and prints as the
// literal word. A neutral toast with one action is the whole of what this needs.
export function notifyUndo(message: string, undo: () => void): void {
  Notify.create({
    icon: '',
    color: 'dark',
    message,
    timeout: 6000,
    actions: [{ label: '復原', color: 'white', handler: undo }]
  })
}
