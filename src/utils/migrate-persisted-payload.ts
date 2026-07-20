import { DEFAULT_CALENDAR_ID, defaultCalendar } from '@/stores/calendars-store'
import type { InboxItem } from '@/stores/inbox-store'
import type { FirstDay, MonthlyPhotos, MonthEventLabel, TimeFormat } from '@/stores/settings-store'
import { defaultMonthlyPhotos } from '@/stores/settings-store'
import type { Calendar } from '@/types/calendar'
import type { Task } from '@/types/task'
import { iso } from '@/utils/convert-date-time'

interface PersistedSettings {
  timeFormat: TimeFormat
  firstDay: FirstDay
  monthEventLabel: MonthEventLabel
  showPhoto: boolean
  monthlyPhotos: MonthlyPhotos
}

interface PersistedShape {
  tasks: Task[]
  inbox: InboxItem[]
  inboxDraft: string
  calendars: Calendar[]
  hiddenCalendarIds: string[]
  settings: PersistedSettings
}

const DEFAULT_SETTINGS: PersistedSettings = {
  timeFormat: '24-Hour',
  firstDay: 'Sunday',
  monthEventLabel: 'name',
  showPhoto: true,
  monthlyPhotos: defaultMonthlyPhotos()
}

interface LegacyShape {
  tasks: unknown[]
  inbox: unknown[]
  inboxDraft: string
}

function isLegacyShape(value: unknown): value is LegacyShape {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<LegacyShape>
  return Array.isArray(v.tasks) && Array.isArray(v.inbox) && typeof v.inboxDraft === 'string'
}

// task-persistence spec "Pre-migration payloads are filled forward losslessly": only ADDS
// calendarId/reminder when absent — every other field on the stored task object passes through
// untouched, matching the spec's fill-forward example exactly (no defaults injected beyond those two).
function fillForwardTask(task: unknown): unknown {
  if (!task || typeof task !== 'object') return task
  const t = task as Record<string, unknown>
  return {
    ...t,
    calendarId: t.calendarId ?? DEFAULT_CALENDAR_ID,
    reminder: t.reminder ?? null
  }
}

// Pre-migration inbox items are `{ id, text }` only — the Draft drawer's `createdAt`/`done`/
// `scheduled` fields didn't exist yet. Without filling these forward, `groupByRecency()` calls
// `parseISO(item.createdAt)` on `undefined` and throws the moment the drawer opens.
function fillForwardInboxItem(item: unknown): unknown {
  if (!item || typeof item !== 'object') return item
  const i = item as Record<string, unknown>
  return {
    ...i,
    createdAt: i.createdAt ?? iso(new Date()),
    done: i.done ?? false,
    scheduled: i.scheduled ?? null
  }
}

function normalizeMonthEventLabel(value: unknown): MonthEventLabel {
  return value === 'icon' || value === 'dot' || value === 'name' ? value : 'name'
}

// Pure fill-forward: reads whatever `loadStore` produced and returns the enriched in-memory shape.
// Never writes to storage — the boot module's normal $subscribe-driven persist() does that on the
// next state change, per design.md's "no destructive rewrite on load" rule.
export function migratePersistedPayload(raw: unknown): PersistedShape | undefined {
  if (!isLegacyShape(raw)) return undefined
  const v = raw as Partial<PersistedShape> & LegacyShape

  return {
    tasks: v.tasks.map(fillForwardTask) as PersistedShape['tasks'],
    inbox: v.inbox.map(fillForwardInboxItem) as PersistedShape['inbox'],
    inboxDraft: v.inboxDraft,
    calendars: Array.isArray(v.calendars) && v.calendars.length > 0 ? v.calendars : [defaultCalendar()],
    hiddenCalendarIds: Array.isArray(v.hiddenCalendarIds) ? v.hiddenCalendarIds : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(v.settings ?? {}),
      timeFormat: '24-Hour',
      monthEventLabel: normalizeMonthEventLabel(v.settings?.monthEventLabel),
      monthlyPhotos: v.settings?.monthlyPhotos ?? defaultMonthlyPhotos()
    }
  }
}
