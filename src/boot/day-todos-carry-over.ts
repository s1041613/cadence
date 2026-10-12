import { defineBoot } from '#q-app'
import { watch } from 'vue'
import { useDayTodosStore } from '@/stores/day-todos-store'
import { iso } from '@/utils/convert-date-time'

// Carries open todos from days that are over onto today (day-todos-store.carryOver). A boot file
// rather than a page watcher for the same reason auth-data-sync is one: it has to happen
// whichever page is open, and without anyone opening the day the todos were left on.
//
// Three moments can end a day: the todos finishing their load, the app coming back from the
// background (a PWA left open overnight is resumed, not reloaded), and midnight passing while it
// sits in the foreground. The minute check covers the last. Each run is a filter over what is
// already in memory, so running when nothing changed costs nothing.
export default defineBoot(({ store }) => {
  const dayTodosStore = useDayTodosStore(store)
  const run = (): void => {
    dayTodosStore.carryOver(iso(new Date()))
  }

  watch(
    () => dayTodosStore.isLoaded,
    (loaded) => {
      if (loaded) run()
    },
    { immediate: true }
  )

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run()
  })

  let lastDay = iso(new Date())
  setInterval(() => {
    const day = iso(new Date())
    if (day === lastDay) return
    lastDay = day
    run()
  }, 60_000)
})
