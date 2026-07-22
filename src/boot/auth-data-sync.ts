import { defineBoot } from '#q-app'
import { watch } from 'vue'
import { useAuthStore } from '@/stores/auth-store'
import { useTasksStore } from '@/stores/tasks-store'
import { useCalendarsStore } from '@/stores/calendars-store'
import { ensureDefaultCalendar } from '@/services/calendars-service'
import { onAuthUserChange } from './auth-data-sync-core'

// Data lifecycle lives in a boot file, not in a page component: signing out
// navigates to /login and unmounts the data pages, so a page-level watcher
// would never observe the sign-out transition. Runs after the auth boot file
// (quasar.config.ts boot order), so the initial session is already resolved.
//
// See auth-data-sync-core.ts for the stale-session guard this delegates to.
export default defineBoot(({ store }) => {
  const auth = useAuthStore(store)
  const tasksStore = useTasksStore(store)
  const calendarsStore = useCalendarsStore(store)

  watch(
    () => auth.user?.id ?? null,
    (userId) => {
      void onAuthUserChange(userId, {
        ensureDefaultCalendar,
        tasksStore,
        calendarsStore,
        getCurrentUserId: () => auth.user?.id ?? null
      })
    },
    { immediate: true }
  )
})
