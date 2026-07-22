import { Notify } from 'quasar'

// Sync-failure toast with a retry action. Requires the Notify plugin to be
// registered in quasar.config.ts.
export function notifySyncError(message: string, retry: () => void): void {
  Notify.create({
    type: 'negative',
    message,
    actions: [{ label: 'retry', color: 'white', handler: retry }]
  })
}
