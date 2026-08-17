/** A plain-text note on the Notebook page. Deliberately minimal: no title, no tags,
 *  no checklist items — the card renders the body verbatim. Beyond the text it carries only
 *  the two things the card lets you set: which quadrant it belongs to and how long it should
 *  take. */
export interface Note {
  id: string
  /** Verbatim text as typed. Trimmed by the store before it is ever constructed. */
  body: string
  /** Eisenhower axes, always read as a pair via use-theme.ts quadrantOf(). Stored as two
   *  booleans rather than a quadrant key because that is how this codebase has always encoded
   *  the matrix (Task.important / Task.urgent, events.important / events.urgent) — a second
   *  spelling would be one more thing every reader has to disambiguate. false/false is the
   *  `later` quadrant, which is both the default and the fallback. */
  important: boolean
  urgent: boolean
  /** Planned length in minutes. Always within 15..480 and on the 15-minute grid; see
   *  utils/note-duration.ts, whose clamp the store applies before any value is stored. */
  durationMin: number
  /** ISO 8601 instant (toISOString), not a YYYY-MM-DD day: the feed sorts strictly
   *  newest-first, including several notes captured on the same day. Editing does not
   *  change it — a note keeps the position it was written in. */
  createdAt: string
  /** ISO 8601 instant of the last body edit, or null for a note never edited. Not
   *  rendered on the card; kept so an edit is recorded rather than silent. */
  updatedAt: string | null
}
