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

export interface TitleDismissalsStoreLike {
  loadFromRemote: () => Promise<void>
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
  // Title-suggestion dismissals. Scoped to the user with no calendar or default-id dependency, and
  // a failed load only means dismissed rows reappear until the next sign-in — so it loads alongside
  // tasks rather than gating anything.
  titleDismissalsStore: TitleDismissalsStoreLike
  // Notebook notes. Same user-scoped shape as titleDismissals (hence the shared interface), so it
  // loads in the same second phase. It differs in one respect worth knowing: its loadFromRemote
  // surfaces its own toast on failure, because an empty notebook is indistinguishable from having
  // lost every note. That handler is also why it never rejects — see the Promise.all note below.
  notebookStore: TitleDismissalsStoreLike
  // v2 background photo + scrim opacity, and the v2 bottom-nav tab list. Two stores sharing one
  // user_settings row (see stores/user-settings-sync.ts). Same user-scoped shape as titleDismissals,
  // and both fail silently: falling back to the bundled wallpaper and the default nav is cosmetic,
  // and every tab stays reachable through Settings regardless.
  v2AppearanceStore: TitleDismissalsStoreLike
  v2TabsStore: TitleDismissalsStoreLike
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
  const {
    ensureDefaultCalendar,
    tasksStore,
    calendarsStore,
    inboxStore,
    titleDismissalsStore,
    notebookStore,
    v2AppearanceStore,
    v2TabsStore,
    getCurrentUserId,
    getMemberCalendarIds
  } = deps

  if (userId === null) {
    tasksStore.resetLocal()
    calendarsStore.resetLocal()
    inboxStore.resetLocal()
    titleDismissalsStore.resetLocal()
    notebookStore.resetLocal()
    // Also cancels the appearance store's pending slider debounce, so a write armed
    // just before sign-out cannot stamp this user's opacity onto the next session.
    v2AppearanceStore.resetLocal()
    v2TabsStore.resetLocal()
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
  // has no calendar dependency, but must not race ahead of the calendars load either. Notebook is
  // in the same position as inbox: it could load first, but a failed ensureDefaultCalendar should
  // leave every store unloaded rather than a partial mix.
  //
  // Every load in this Promise.all must resolve rather than reject. onAuthUserChange is invoked
  // with `void`, so one rejection here would throw past the boot wiring and abandon its siblings.
  await calendarsStore.loadFromRemote(userId, defaultId)
  await Promise.all([
    tasksStore.loadFromRemote(userId, defaultId, getMemberCalendarIds()),
    inboxStore.loadFromRemote(userId, defaultId),
    titleDismissalsStore.loadFromRemote(),
    notebookStore.loadFromRemote(),
    // Both read the same user_settings row, so this is two round trips for one row.
    // Left as-is rather than merged: sharing a fetch would couple two stores that
    // otherwise know nothing about each other, to save one request on sign-in only.
    v2AppearanceStore.loadFromRemote(),
    v2TabsStore.loadFromRemote()
  ])
}
