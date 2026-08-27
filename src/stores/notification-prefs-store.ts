import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { notifySyncError } from '@/lib/notify'
import { fetchUserSettings } from '@/services/user-settings-service'
import { persistSettings, registerSettingsSlice } from './user-settings-sync'
import { useAuthStore } from './auth-store'

// Account-level notification preferences. Today that is one switch: whether to
// receive a push when another member adds an event to a shared calendar
// (Settings › Notifications › Shared calendar activity).
//
// WHY a store at all, when the "Event reminders" switch on the same screen has
// none: that switch's truth is the browser's own push subscription, which is
// PER DEVICE — a stored boolean could not express "on for the phone, off for the
// laptop". This one is the opposite: the server decides whether to enqueue a
// notification for this user at all, so the preference is per ACCOUNT and has to
// cross devices. Two different questions, deliberately two different sources of
// truth.
//
// The column lives in the shared user_settings row; see user-settings-sync.ts for
// how several stores own different columns of one row without importing each
// other.

// Matches the column default in the migration. Someone who joins a shared
// calendar and never opens Settings should still hear about it.
const DEFAULT_NOTIFY_ON_MEMBER_EVENTS = true

export const useNotificationPrefsStore = defineStore('notification-prefs', () => {
  const notifyOnMemberEventsRef = ref(DEFAULT_NOTIFY_ON_MEMBER_EVENTS)

  const notifyOnMemberEvents = computed(() => notifyOnMemberEventsRef.value)

  // Bumped on load and reset, mirroring the tabs and appearance stores: a write
  // still in flight at sign-out must not roll back into the next session.
  let generation = 0

  // This store owns one column of the shared user_settings row.
  registerSettingsSlice('notification-prefs', () => ({
    notifyOnMemberEvents: notifyOnMemberEventsRef.value
  }))

  /**
   * Loads the saved preference. Never rejects: it is awaited inside a Promise.all
   * that the boot file invokes with `void`.
   *
   * A failure keeps the default. Erring towards "on" is the safe direction — the
   * user can always turn it off, whereas a silent "off" looks like the feature is
   * broken.
   */
  async function loadFromRemote(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    generation += 1
    const version = generation

    try {
      const remote = await fetchUserSettings(ownerId)
      if (version !== generation) return
      // No row at all means the user has never saved any setting — keep the
      // default rather than inventing one.
      if (!remote) return

      notifyOnMemberEventsRef.value = remote.notifyOnMemberEvents
    } catch {
      // Keep the default; see the doc comment.
    }
  }

  function resetLocal(): void {
    generation += 1
    notifyOnMemberEventsRef.value = DEFAULT_NOTIFY_ON_MEMBER_EVENTS
  }

  /** The only write path. Applies optimistically, then rolls back on failure. */
  function setNotifyOnMemberEvents(next: boolean): void {
    const previous = notifyOnMemberEventsRef.value
    if (next === previous) return
    notifyOnMemberEventsRef.value = next
    void persist(previous)
  }

  async function persist(rollbackTo: boolean): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    const version = generation
    // The value being saved, captured before the rollback. persistSettings()
    // assembles the row from current store state, so the retry has to restore the
    // user's intent first — otherwise it would re-save the rolled-back value and
    // silently discard the change it was offered to recover.
    const intended = notifyOnMemberEventsRef.value

    try {
      await persistSettings(ownerId)
    } catch {
      if (version !== generation) return
      notifyOnMemberEventsRef.value = rollbackTo
      notifySyncError('Could not save the notification setting.', () => {
        notifyOnMemberEventsRef.value = intended
        void persist(rollbackTo)
      })
    }
  }

  return {
    notifyOnMemberEvents,
    setNotifyOnMemberEvents,
    loadFromRemote,
    resetLocal
  }
})
