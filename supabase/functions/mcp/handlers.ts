// What each tool does, against a Supabase client that is ALREADY scoped to the caller.
//
// The client handed in here is the one withSupabase({ auth: 'user' }) builds from the caller's
// own access token, so every query below runs under that user's RLS policies — the same rules
// as the app. Never pass the context's supabaseAdmin (service role) in here: it would turn every
// filter below into the only thing standing between one user and another's data.
//
// No imports from npm: or jsr:, so handlers.test.ts can drive these with a fake client.

import {
  DEFAULT_REMINDER,
  ToolInputError,
  buildEventUpdate,
  buildNewEventRow,
  buildNewTodoRows,
  cleanTodoTitle,
  compareEntries,
  entryOverlaps,
  isDate,
  parseRange,
  rangeQueryBounds,
  reminderToMinutes,
  rowToEntry,
  todayIn,
  todosForRange,
  type DayTodoRow,
  type EventFields,
  type EventPatch,
  type FetchedEventRow,
  type Reminder,
  type ScheduleEntry
} from './core.ts'

// deno-lint-ignore no-explicit-any
export type Db = { from(table: string): any; rpc(fn: string, args?: Record<string, unknown>): any }

export interface ToolContext {
  db: Db
  userId: string
  timeZone: string
  now: () => Date
  newId: () => string
}

const EVENT_COLUMNS =
  'id, calendar_id, owner_id, type, title, quadrant, color, icon, all_day, starts_at, ends_at, show_in_month, location, notes, repeat_mode, done, estimated_pomodoros, completed_pomodoros, time_edited_at, event_reminders(minutes_before)'

function fail(error: { message?: string } | null | undefined, what: string): never {
  throw new Error(`${what}: ${error?.message ?? 'unknown error'}`)
}

// --- shared reads ------------------------------------------------------------------------------

interface CalendarInfo {
  id: string
  name: string
  role: 'owner' | 'member'
  /** True for the calendar new events go to when no calendar_id is given. */
  default: boolean
}

export async function listCalendars(ctx: ToolContext): Promise<CalendarInfo[]> {
  const { data, error } = await ctx.db
    .from('calendar_members')
    .select('position, role, calendars(id, name)')
    .eq('user_id', ctx.userId)
    .order('position', { ascending: true })
  if (error) fail(error, 'Could not load calendars')

  const rows = (data ?? []) as Array<{ position: number; role: 'owner' | 'member'; calendars: { id: string; name: string } | null }>
  // calendars-service ensureDefaultCalendar: the owner-role membership with the lowest position.
  const defaultId = rows.find((r) => r.role === 'owner' && r.calendars)?.calendars?.id ?? null
  return rows
    .filter((r) => r.calendars !== null)
    .map((r) => ({ id: r.calendars!.id, name: r.calendars!.name, role: r.role, default: r.calendars!.id === defaultId }))
}

function calendarNames(calendars: CalendarInfo[]): Map<string, string> {
  return new Map(calendars.map((c) => [c.id, c.name]))
}

async function resolveCalendar(ctx: ToolContext, calendars: CalendarInfo[], calendarId: string | undefined): Promise<CalendarInfo> {
  if (calendarId === undefined) {
    const def = calendars.find((c) => c.default)
    if (!def) {
      throw new ToolInputError('This account has no calendar of its own yet. Open Cadence once to create it, then try again.')
    }
    return def
  }
  const found = calendars.find((c) => c.id === calendarId)
  if (!found) throw new ToolInputError(`No calendar with id ${calendarId} is available to you. Call list_calendars for the ids.`)
  return found
}

async function fetchEvent(ctx: ToolContext, id: string): Promise<FetchedEventRow> {
  const { data, error } = await ctx.db.from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle()
  if (error) fail(error, 'Could not load the event')
  if (!data) throw new ToolInputError(`No event with id ${id} is visible to you.`)
  return data as FetchedEventRow
}

// --- get_schedule ------------------------------------------------------------------------------

export interface ScheduleResult {
  time_zone: string
  today: string
  from: string
  to: string
  calendars: Array<{ id: string; name: string }>
  events: ScheduleEntry[]
  tasks: ScheduleEntry[]
  todos: ReturnType<typeof todosForRange>
}

export async function getSchedule(ctx: ToolContext, input: { from?: string; to?: string }): Promise<ScheduleResult> {
  const today = todayIn(ctx.timeZone, ctx.now())
  const range = parseRange(input.from ?? today, input.to ?? input.from ?? today)
  const calendars = await listCalendars(ctx)
  const names = calendarNames(calendars)

  let events: ScheduleEntry[] = []
  if (calendars.length > 0) {
    const bounds = rangeQueryBounds(range)
    // Explicit calendar filter, as events-service fetchTasks does: shared calendars' events
    // come along with the user's own. RLS still decides what is actually returned.
    const { data, error } = await ctx.db
      .from('events')
      .select(EVENT_COLUMNS)
      .in('calendar_id', calendars.map((c) => c.id))
      .lt('starts_at', bounds.startsBefore)
      .gte('ends_at', bounds.endsAfter)
      .order('starts_at', { ascending: true })
      .limit(500)
    if (error) fail(error, 'Could not load events')
    events = ((data ?? []) as FetchedEventRow[])
      .map((row) => rowToEntry(row, ctx.timeZone, ctx.userId, names))
      .filter((e) => entryOverlaps(e, range))
      .sort(compareEntries)
  }

  // Only todos that can land in the range: open ones from any earlier day (they show on today
  // when the range includes it) and anything dated inside it.
  const includesToday = range.from <= today && today <= range.to
  let todoQuery = ctx.db.from('day_todos').select('id, user_id, date, origin_date, title, done, position').eq('user_id', ctx.userId)
  todoQuery = includesToday
    ? todoQuery.or(`and(date.gte.${range.from},date.lte.${range.to}),and(done.eq.false,date.lt.${today})`)
    : todoQuery.gte('date', range.from).lte('date', range.to)
  const { data: todoRows, error: todoError } = await todoQuery.limit(500)
  if (todoError) fail(todoError, 'Could not load todos')

  return {
    time_zone: ctx.timeZone,
    today,
    from: range.from,
    to: range.to,
    calendars: calendars.map((c) => ({ id: c.id, name: c.name })),
    events: events.filter((e) => e.kind === 'event'),
    tasks: events.filter((e) => e.kind === 'task'),
    todos: todosForRange((todoRows ?? []) as DayTodoRow[], range, today)
  }
}

// --- search_schedule ---------------------------------------------------------------------------

export async function searchSchedule(
  ctx: ToolContext,
  input: { query: string; from?: string; to?: string }
): Promise<{ time_zone: string; today: string; matches: ScheduleEntry[] }> {
  const q = input.query.trim()
  if (q.length < 1) throw new ToolInputError('query must not be blank.')
  if (q.length > 100) throw new ToolInputError('query is longer than 100 characters.')
  const today = todayIn(ctx.timeZone, ctx.now())
  if (input.from !== undefined && !isDate(input.from)) throw new ToolInputError('from must be YYYY-MM-DD.')
  if (input.to !== undefined && !isDate(input.to)) throw new ToolInputError('to must be YYYY-MM-DD.')

  const calendars = await listCalendars(ctx)
  if (calendars.length === 0) return { time_zone: ctx.timeZone, today, matches: [] }

  // PostgREST's or() filter syntax treats , ( ) as structure; strip them, and escape the
  // LIKE wildcards so a search for "100%" means the text, not a pattern.
  const needle = q.replace(/[,()]/g, ' ').replace(/[\\%_]/g, (c) => `\\${c}`)
  let query = ctx.db
    .from('events')
    .select(EVENT_COLUMNS)
    .in('calendar_id', calendars.map((c) => c.id))
    .or(`title.ilike.*${needle}*,location.ilike.*${needle}*,notes.ilike.*${needle}*`)
  if (input.from !== undefined) query = query.gte('ends_at', `${input.from}T00:00:00.000Z`)
  if (input.to !== undefined) query = query.lt('starts_at', `${input.to}T23:59:59.999Z`)
  const { data, error } = await query.order('starts_at', { ascending: true }).limit(25)
  if (error) fail(error, 'Could not search events')

  const names = calendarNames(calendars)
  return {
    time_zone: ctx.timeZone,
    today,
    matches: ((data ?? []) as FetchedEventRow[]).map((row) => rowToEntry(row, ctx.timeZone, ctx.userId, names))
  }
}

// --- create_event ------------------------------------------------------------------------------

async function writeReminder(ctx: ToolContext, eventId: string, reminder: Reminder): Promise<void> {
  const minutes = reminderToMinutes(reminder)
  if (minutes === null) {
    const { error } = await ctx.db.from('event_reminders').delete().eq('event_id', eventId)
    if (error) fail(error, 'The event was saved but its reminder could not be cleared')
    return
  }
  // Same single-reminder upsert as events-service upsertTask; fired_at reset so a moved event
  // reminds again.
  const { error } = await ctx.db
    .from('event_reminders')
    .upsert({ event_id: eventId, minutes_before: minutes, fired_at: null }, { onConflict: 'event_id' })
  if (error) fail(error, 'The event was saved but its reminder could not be set')
}

export async function createEvent(
  ctx: ToolContext,
  input: EventFields & { calendar_id?: string; reminder?: Reminder }
): Promise<ScheduleEntry> {
  const calendars = await listCalendars(ctx)
  const calendar = await resolveCalendar(ctx, calendars, input.calendar_id)
  const row = buildNewEventRow(input, { id: ctx.newId(), ownerId: ctx.userId, calendarId: calendar.id }, ctx.timeZone)

  // The database has no updated_at trigger; the client stamps it (events-service upsertTask).
  const { error } = await ctx.db.from('events').insert({ ...row, updated_at: ctx.now().toISOString() })
  if (error) fail(error, 'Could not create the event')

  const reminder = input.reminder ?? DEFAULT_REMINDER
  if (reminder !== 'none') await writeReminder(ctx, row.id, reminder)

  return rowToEntry(
    { ...row, event_reminders: reminder === 'none' ? [] : [{ minutes_before: reminderToMinutes(reminder)! }] },
    ctx.timeZone,
    ctx.userId,
    calendarNames(calendars)
  )
}

// --- update_event ------------------------------------------------------------------------------

export async function updateEvent(
  ctx: ToolContext,
  input: { id: string } & EventPatch & { reminder?: Reminder }
): Promise<ScheduleEntry> {
  const current = await fetchEvent(ctx, input.id)
  if (current.owner_id !== ctx.userId) {
    throw new ToolInputError('This event was created by another member of a shared calendar; only they can change it.')
  }
  const calendars = await listCalendars(ctx)
  if (input.calendar_id !== undefined) await resolveCalendar(ctx, calendars, input.calendar_id)

  const { id, reminder, ...patch } = input
  let update: Record<string, unknown> = {}
  const hasFieldChanges = Object.values(patch).some((v) => v !== undefined)
  if (hasFieldChanges) update = { ...buildEventUpdate(current, patch, ctx.timeZone, ctx.now()) }
  else if (reminder === undefined) throw new ToolInputError('Nothing to change: pass at least one field.')

  let saved: FetchedEventRow = current
  if (hasFieldChanges) {
    const { data, error } = await ctx.db
      .from('events')
      .update({ ...update, updated_at: ctx.now().toISOString() })
      .eq('id', id)
      .eq('owner_id', ctx.userId)
      .select(EVENT_COLUMNS)
      .maybeSingle()
    if (error) fail(error, 'Could not update the event')
    if (!data) throw new ToolInputError('The event could not be updated (it may have just been deleted).')
    saved = data as FetchedEventRow
  }

  // A moved event gets its reminder re-armed, as the app does on every save.
  const timeMoved = 'starts_at' in update
  const nextReminder = reminder ?? (timeMoved ? rowToEntry(current, ctx.timeZone, ctx.userId, new Map()).reminder : undefined)
  if (nextReminder !== undefined) {
    await writeReminder(ctx, id, nextReminder)
    const minutes = reminderToMinutes(nextReminder)
    saved = { ...saved, event_reminders: minutes === null ? [] : [{ minutes_before: minutes }] }
  }

  return rowToEntry(saved, ctx.timeZone, ctx.userId, calendarNames(calendars))
}

// --- add_todos / update_todo -------------------------------------------------------------------

export async function addTodos(
  ctx: ToolContext,
  input: { titles: string[]; date?: string }
): Promise<{ date: string; added: Array<{ id: string; title: string }> }> {
  const date = input.date ?? todayIn(ctx.timeZone, ctx.now())
  if (!isDate(date)) throw new ToolInputError('date must be YYYY-MM-DD.')

  const { data, error } = await ctx.db.from('day_todos').select('position').eq('user_id', ctx.userId).eq('date', date)
  if (error) fail(error, 'Could not load the day’s todos')

  const rows = buildNewTodoRows(input.titles, date, (data ?? []) as Array<{ position: number }>, {
    ownerId: ctx.userId,
    newId: ctx.newId
  })
  const stamp = ctx.now().toISOString()
  const { error: insertError } = await ctx.db.from('day_todos').insert(rows.map((r) => ({ ...r, updated_at: stamp })))
  if (insertError) fail(insertError, 'Could not add the todos')

  return { date, added: rows.map((r) => ({ id: r.id, title: r.title })) }
}

export async function updateTodo(
  ctx: ToolContext,
  input: { id: string; title?: string; done?: boolean }
): Promise<{ id: string; date: string; title: string; done: boolean }> {
  const update: Record<string, unknown> = {}
  if (input.title !== undefined) update.title = cleanTodoTitle(input.title)
  if (input.done !== undefined) update.done = input.done
  if (Object.keys(update).length === 0) throw new ToolInputError('Nothing to change: pass title or done.')

  const { data, error } = await ctx.db
    .from('day_todos')
    .update({ ...update, updated_at: ctx.now().toISOString() })
    .eq('id', input.id)
    .eq('user_id', ctx.userId)
    .select('id, date, title, done')
    .maybeSingle()
  if (error) fail(error, 'Could not update the todo')
  if (!data) throw new ToolInputError(`No todo with id ${input.id} is yours.`)
  return data as { id: string; date: string; title: string; done: boolean }
}

// --- access gate -------------------------------------------------------------------------------

/**
 * Whether this user may use the connection at all — the has_mcp_access() database function,
 * which the consent page also calls, so the two can never disagree. Called with the user's own
 * client; the function only ever answers for auth.uid().
 */
export async function hasAccess(ctx: ToolContext): Promise<boolean> {
  const { data, error } = await ctx.db.rpc('has_mcp_access')
  if (error) fail(error, 'Could not check access')
  return data === true
}

export const NO_ACCESS_MESSAGE =
  'Your Cadence account is not enabled for AI connections yet (this is a limited beta). Ask the Cadence admin to enable it.'
