import type { DayTodo } from '@/types/day-todo'

/**
 * A pasted or typed block, one todo per line. Lines are trimmed and blank ones dropped, so a
 * paste from Notes with a trailing newline or a gap between groups does not become empty rows.
 * A leading list marker ("- ", "• ", "* ", "1. ", "[ ] ") is stripped too: pasting a list
 * from elsewhere should not carry its bullets into every title.
 */
export function splitTodoLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^(?:[-•*·]|\d+[.)]|\[\s?[xX]?\s?\])\s+/, '')
        .trim()
    )
    .filter((line) => line !== '')
}

/** A day's list in display order. */
export function todosOn(todos: DayTodo[], date: string): DayTodo[] {
  return todos.filter((t) => t.date === date).sort((a, b) => a.position - b.position)
}

/**
 * The open todos left on a day that is over, re-dated onto `today`.
 *
 * Only open ones move: a ticked todo stays on the day it was ticked, so a past day's list keeps
 * what got done on it. Future days are left alone — a todo written ahead for Friday is not
 * overdue on Wednesday.
 *
 * Carried rows go after whatever today already holds, in the order they had, so carrying two
 * days at once (opened after a weekend) does not interleave them by accident of position.
 *
 * Idempotent: once re-dated a todo is no longer before today, so a second run returns nothing.
 */
export function carriedOver(todos: DayTodo[], today: string): DayTodo[] {
  const stale = todos
    .filter((t) => !t.done && t.date < today)
    .sort((a, b) => (a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1))
  if (stale.length === 0) return []

  const next = nextPosition(todos, today)
  return stale.map((t, i) => ({ ...t, date: today, position: next + i }))
}

/** One past the highest position on `date`, so an append can never collide with a row there. */
export function nextPosition(todos: DayTodo[], date: string): number {
  return todos.reduce((max, t) => (t.date === date ? Math.max(max, t.position) : max), -1) + 1
}
