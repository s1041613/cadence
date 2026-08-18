import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

// vitest runs `environment: 'node'` (vitest.config.ts) so this SFC cannot be mounted. What broke
// here was pure wiring — a watcher without `immediate` and a prop the template never passed —
// which no logic test can reach, so these assertions read the source and pin the three bindings.
// The values they produce are covered by src/utils/quick-add-seed.test.ts.

let src = ''

beforeAll(async () => {
  src = await readFile(new URL('./QuickAddPopover.vue', import.meta.url), 'utf8')
})

/** The `watch(() => ui.qaPop, ...)` call, from its head to the closing `)` at column 0. */
function seedWatcher(): string {
  const start = src.indexOf('watch(\n  () => ui.qaPop,')
  expect(start).toBeGreaterThan(-1)
  const end = src.indexOf('\n)\n', start)
  expect(end).toBeGreaterThan(start)
  return src.slice(start, end)
}

describe('QuickAddPopover wiring', () => {
  it('seeds immediately, since every host mounts it behind v-if="ui.qaPop"', () => {
    // Without this the callback never fires: setup runs after the click handler has already
    // written ui.qaPop, so the tapped date and time were dropped and the card fell back to
    // its raw ref defaults (no date -> CdDatePicker shows today, 09:00-09:30).
    expect(seedWatcher()).toContain('{ immediate: true }')
  })

  it('seeds every field the card reads for its date/time rows', () => {
    const watcher = seedWatcher()
    for (const assignment of ['date.value', 'endDate.value', 'start.value', 'end.value', 'allDay.value']) {
      expect(watcher).toContain(`${assignment} = seed.`)
    }
  })

  it('passes endDate to the v2 card in both presentations, and takes its updates', () => {
    // Pv2EventEditCard declares endDate as a required prop and renders the ENDS date picker
    // unconditionally; an undefined value throws inside CdDatePicker's setup and the picker
    // silently vanishes. Two blocks: the desktop popover and the sheet.
    const bindings = src.match(/v-bind="variant === 'v2' \? \{ endDate \} : \{\}"/g) ?? []
    expect(bindings).toHaveLength(2)
    const handlers = src.match(/@update:end-date=/g) ?? []
    expect(handlers).toHaveLength(2)
  })

  it('stores a span only when ENDS was moved past STARTS', () => {
    // Absence is how a single-day entry is encoded, so writing date === endDate would persist a
    // redundant field on nearly every event.
    expect(src).toContain('...(endDate.value > date.value ? { endDate: endDate.value } : {})')
  })
})
