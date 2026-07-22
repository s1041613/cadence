// Extracted from boot/auth-data-sync.ts so the stale-session guard is unit-testable without mocking
// Quasar's boot machinery (#q-app isn't aliased in vitest.config.ts, and no other boot file in
// this codebase has test coverage for the same reason).

export interface DataStoreLike {
  loadFromRemote: (userId: string, defaultId: string) => Promise<void>
  resetLocal: () => void
}

export interface OnAuthUserChangeDeps {
  ensureDefaultCalendar: (userId: string) => Promise<string>
  tasksStore: DataStoreLike
  calendarsStore: DataStoreLike
  // Inbox has no calendar concept, but it shares the same load/reset lifecycle. It's loaded in the
  // same Promise.all, so a failed ensureDefaultCalendar also leaves inbox un-loaded — acceptable
  // since that failure makes the whole app unusable anyway.
  inboxStore: DataStoreLike
  // Reads the *current* signed-in user id at the moment it's called (not the userId this change
  // event started with) — used only for the stale-session check below.
  getCurrentUserId: () => string | null
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
  const { ensureDefaultCalendar, tasksStore, calendarsStore, inboxStore, getCurrentUserId } = deps

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

  await Promise.all([
    tasksStore.loadFromRemote(userId, defaultId),
    calendarsStore.loadFromRemote(userId, defaultId),
    inboxStore.loadFromRemote(userId, defaultId)
  ])
}
