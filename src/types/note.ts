/** A user-created notebook tag. `All` is a virtual UI tab, not a row in this table. */
export interface NoteTag {
  id: string
  name: string
  position: number
  createdAt: string
  updatedAt: string | null
}

/** A plain-text note on the Notebook page. Deliberately minimal: no title,
 *  no checklist items — the card renders the body verbatim. */
export interface Note {
  id: string
  /** Verbatim text as typed. Trimmed by the store before it is ever constructed. */
  body: string
  /** ISO 8601 instant (toISOString), not a YYYY-MM-DD day: the feed sorts strictly
   *  newest-first, including several notes captured on the same day. Editing does not
   *  change it — a note keeps the position it was written in. */
  createdAt: string
  /** ISO 8601 instant of the last body edit, or null for a note never edited. Not
   *  rendered on the card; kept so an edit is recorded rather than silent. */
  updatedAt: string | null
  /** Optional owner tag. Null means untagged; the virtual All tab still includes it. */
  tagId: string | null
}
