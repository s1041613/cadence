import { requireSupabase } from '@/lib/supabase'
import type { Calendar, CalendarMember } from '@/types/calendar'

const REQUEST_TIMEOUT_MS = 10_000

// First-sign-in default calendar name/color. Only used by create_calendar's fallback path in
// ensureDefaultCalendar below — every other Calendar field comes from the DB via fetchCalendars.
const DEFAULT_CALENDAR_NAME = 'My Calendar'
const DEFAULT_CALENDAR_COLOR = '#6E839B'

// fetchCalendars result: Calendar plus the per-user visibility columns (calendar_members.enabled/
// selected) the store needs to derive hiddenCalendarIds. Kept off the core Calendar type since
// only the load path needs them — every other consumer works with plain Calendar.
export interface CalendarWithMembership extends Calendar {
  enabled: boolean
  selected: boolean
}

// Row shape returned by the calendar_members -> calendars join (fetchCalendars).
interface CalendarMembershipRow {
  position: number
  role: 'owner' | 'member'
  enabled: boolean
  selected: boolean
  calendars: {
    id: string
    name: string
    color: string | null
    icon: string | null
    cover_url: string | null
  }
}

// Row shape returned by the calendar_members -> profiles join (fetchMembers).
interface CalendarMemberRow {
  role: 'owner' | 'member'
  profiles: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  }
}

// Default calendar contract: the user's default calendar is their owner-role
// membership with the lowest position. When none exists (first sign-in), the
// create_calendar RPC creates the calendar and its owner membership atomically.
// Idempotent: subsequent calls return the same uuid.
export async function ensureDefaultCalendar(userId: string): Promise<string> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('calendar_members')
    .select('calendar_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .order('position', { ascending: true })
    .limit(1)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error

  const existing = (data as Array<{ calendar_id: string }> | null)?.[0]
  if (existing) return existing.calendar_id

  const { data: createdId, error: rpcError } = await supabase
    .rpc('create_calendar', { calendar_name: DEFAULT_CALENDAR_NAME, calendar_color: DEFAULT_CALENDAR_COLOR })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (rpcError) throw rpcError
  if (typeof createdId !== 'string') {
    throw new Error('create_calendar returned no calendar id')
  }
  return createdId
}

// Every calendar the user belongs to, joined with their per-membership role/position/visibility,
// ordered by the user's own position (Arrange). color falls back to DEFAULT_CALENDAR_COLOR in case
// a row predates that column being populated.
export async function fetchCalendars(userId: string): Promise<CalendarWithMembership[]> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('calendar_members')
    .select('position, role, enabled, selected, calendars(id, name, color, icon, cover_url)')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error

  return (data as unknown as CalendarMembershipRow[]).map((row) => ({
    id: row.calendars.id,
    name: row.calendars.name,
    color: row.calendars.color ?? DEFAULT_CALENDAR_COLOR,
    icon: row.calendars.icon,
    cover: row.calendars.cover_url,
    order: row.position,
    role: row.role,
    enabled: row.enabled,
    selected: row.selected
  }))
}

// User-editable calendar metadata. cover is intentionally absent: calendars.cover_url is a
// Storage-path contract and cover persistence is out of scope for this change.
export interface CalendarDraft {
  name: string
  color: string
  icon: string | null
}

export type CalendarPatch = Partial<CalendarDraft>

// Atomic create via RPC (calendar + owner membership + next position). Returns the new uuid;
// the caller builds the local Calendar from the draft since the RPC returns only the id.
export async function createCalendar(draft: CalendarDraft): Promise<string> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .rpc('create_calendar', {
      calendar_name: draft.name,
      calendar_color: draft.color,
      calendar_icon: draft.icon
    })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
  if (typeof data !== 'string') {
    throw new Error('create_calendar returned no calendar id')
  }
  return data
}

export async function updateCalendar(id: string, patch: CalendarPatch): Promise<void> {
  const supabase = requireSupabase()

  const row: Record<string, string | null> = {}
  if ('name' in patch && patch.name !== undefined) row.name = patch.name
  if ('color' in patch && patch.color !== undefined) row.color = patch.color
  if ('icon' in patch) row.icon = patch.icon ?? null

  const { error } = await supabase
    .from('calendars')
    .update(row)
    .eq('id', id)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
}

// Owner-only per RLS; events/members/invites rows go with the calendar via FK cascade.
export async function deleteCalendar(id: string): Promise<void> {
  const supabase = requireSupabase()

  const { error } = await supabase
    .from('calendars')
    .delete()
    .eq('id', id)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
}

// Self-removal from a shared calendar (RLS lets members delete their own membership row).
export async function leaveCalendar(calendarId: string, userId: string): Promise<void> {
  const supabase = requireSupabase()

  const { error } = await supabase
    .from('calendar_members')
    .delete()
    .eq('calendar_id', calendarId)
    .eq('user_id', userId)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
}

export async function reorderCalendars(orderedIds: string[]): Promise<void> {
  const supabase = requireSupabase()

  const { error } = await supabase
    .rpc('reorder_calendars', { ordered: orderedIds })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
}

export async function setCalendarEnabled(id: string, enabled: boolean): Promise<void> {
  const supabase = requireSupabase()

  const { error } = await supabase
    .rpc('set_calendar_enabled', { cal: id, en: enabled })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
}

export async function setCalendarSelected(id: string, selected: boolean): Promise<void> {
  const supabase = requireSupabase()

  const { error } = await supabase
    .rpc('set_calendar_selected', { cal: id, sel: selected })
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error
}

// Members of one calendar, joined with their profile (Google display name/avatar). Display name
// falls back to email, matching CdSettingsDrawer's own accountName fallback for the signed-in user.
export async function fetchMembers(calendarId: string): Promise<CalendarMember[]> {
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('calendar_members')
    .select('role, profiles(id, display_name, email, avatar_url)')
    .eq('calendar_id', calendarId)
    .abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS))
  if (error) throw error

  return (data as unknown as CalendarMemberRow[]).map((row) => ({
    id: row.profiles.id,
    name: row.profiles.display_name ?? row.profiles.email ?? row.profiles.id,
    avatarUrl: row.profiles.avatar_url,
    role: row.role
  }))
}
