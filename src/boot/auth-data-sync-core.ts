// Extracted from boot/auth-data-sync.ts so the stale-session guard is unit-testable without mocking
// Quasar's boot machinery (#q-app isn't aliased in vitest.config.ts, and no other boot file in
// this codebase has test coverage for the same reason).

export interface CalendarsStoreLike {
  loadFromRemote: (userId: string, defaultId: string) => Promise<void>
  resetLocal: () => void
}

export interface TasksStoreLike {
  // memberCalendarIds scopes the events fetch to every calendar the user belongs to — resolved
  // from the calendars store after its own load completes (see ordering note below).
  loadFromRemote: (userId: string, defaultId: string, memberCalendarIds: string[]) => Promise<void>
  resetLocal: () => void
}

export interface OnAuthUserChangeDeps {
  ensureDefaultCalendar: (userId: string) => Promise<string>
  tasksStore: TasksStoreLike
  calendarsStore: CalendarsStoreLike
  // Inbox has no calendar concept, but it shares the same load/reset lifecycle. It loads in the
  // same second phase as tasks (after calendars), so a failed ensureDefaultCalendar also leaves
  // inbox un-loaded — acceptable since that failure makes the whole app unusable anyway.
  inboxStore: CalendarsStoreLike
  // Reads the *current* signed-in user id at the moment it's called (not the userId this change
  // event started with) — used only for the stale-session check below.
  getCurrentUserId: () => string | null
  // Reads the freshly loaded member calendar id list; only meaningful after calendarsStore's load.
  getMemberCalendarIds: () => string[]
}

// Single source of truth for "which calendar is default": ensureDefaultCalendar runs once here and
// feeds both stores, rather than each store re-deriving it (calendar_members.position has no
// uniqueness constraint, so "lowest position" is not a reliable per-store recomputation).
//
// Stale-session guard: ensureDefaultCalendar's RPC can still be in flight when the user signs out
// or switches accounts. Re-checking getCurrentUserId() after the await catches both cases and skips
// loading stores with another user's (or no user's) data. A failed ensureDefaultCalendar (thrown)
// also leaves both stores un-loaded rather than partially loaded.
export async function onAuthUserChange(userId: string | null, deps: OnAuthUserChangeDeps): Promise<void> {
  const { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId, getMemberCalendarIds } = deps

  if (userId === null) {
    tasksStore.resetLocal()
    calendarsStore.resetLocal()
    inboxStore.resetLocal()
    return
  }

  let defaultId: string
  try {
    defaultId = await ensureDefaultCalendar(userId)
  } catch {
    return
  }

  if (getCurrentUserId() !== userId) return

  // Calendars load first: the events fetch is scoped to the member calendar id list, which only
  // exists once the calendar list has been applied. Tasks and inbox then load in parallel — inbox
  // has no calendar dependency, but must not race ahead of the calendars load either.
  await calendarsStore.loadFromRemote(userId, defaultId)
  await Promise.all([
    tasksStore.loadFromRemote(userId, defaultId, getMemberCalendarIds()),
    inboxStore.loadFromRemote(userId, defaultId)
  ])
}
