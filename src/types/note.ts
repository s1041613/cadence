/** A plain-text note on the Notebook page. Deliberately three fields: no title,
 *  no tags, no checklist items, no updatedAt — the surface only ever adds and
 *  deletes, and the card renders the body verbatim. Adding an edit affordance
 *  means changing the table too (see supabase/migrations/*_notes.sql). */
export interface Note {
  id: string
  /** Verbatim text as typed. Trimmed by the store before it is ever constructed. */
  body: string
  /** ISO 8601 instant (toISOString), not a YYYY-MM-DD day: the feed sorts strictly
   *  newest-first, including several notes captured on the same day. */
  createdAt: string
}
