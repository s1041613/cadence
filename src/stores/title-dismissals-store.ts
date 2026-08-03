import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notifySyncError } from '@/lib/notify'
import { fetchDismissedTitleKeys, insertDismissedTitleKey } from '@/services/title-dismissals-service'
import { useAuthStore } from './auth-store'

/** Suggestion keys the user has removed from the new-event title list. Held as a set because the
 * only read is a membership test while building suggestions. */
export const useTitleDismissalsStore = defineStore('title-dismissals', () => {
  const dismissedKeys = ref<ReadonlySet<string>>(new Set())

  // Bumped on load and reset, mirroring inbox-store's guard: a write still in flight at logout or
  // account switch must not write back into the next session — a rollback that lands after
  // resetLocal would otherwise resurrect the previous user's dismissals.
  let sessionVersion = 0

  async function loadFromRemote(): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) return

    sessionVersion += 1
    const version = sessionVersion

    try {
      const keys = await fetchDismissedTitleKeys(ownerId)
      if (version !== sessionVersion) return
      dismissedKeys.value = new Set(keys)
    } catch {
      // A failed load only means dismissed rows reappear until the next sign-in — mildly annoying,
      // not destructive, and not worth interrupting event creation with a toast.
    }
  }

  async function dismiss(key: string): Promise<void> {
    const ownerId = useAuthStore().user?.id
    if (!ownerId) {
      notifySyncError('Not synced yet — try again in a moment.', () => {
        void dismiss(key)
      })
      return
    }

    const version = sessionVersion
    const previous = dismissedKeys.value
    dismissedKeys.value = new Set(previous).add(key)

    try {
      await insertDismissedTitleKey(key, ownerId)
    } catch {
      if (version !== sessionVersion) return
      dismissedKeys.value = previous
      notifySyncError('Could not remove that suggestion.', () => {
        void dismiss(key)
      })
    }
  }

  function resetLocal(): void {
    sessionVersion += 1
    dismissedKeys.value = new Set()
  }

  return { dismissedKeys, loadFromRemote, dismiss, resetLocal }
})
