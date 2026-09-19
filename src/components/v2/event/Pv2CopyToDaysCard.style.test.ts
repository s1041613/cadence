import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

// vitest runs `environment: 'node'` (vitest.config.ts), so the card can't be mounted and
// computed styles can't be read. These assertions pin the source-day contract instead: the
// day the event already sits on is a MARKER, not a lock, and it wears the same accent pill
// the month grid gives today. Both halves regressed before — the marker used to disable the
// cell, and the tone it used to wear was a grey that read as "you can't pick this".

let card = ''
let monthCell = ''

beforeAll(async () => {
  card = await readFile(new URL('./Pv2CopyToDaysCard.vue', import.meta.url), 'utf8')
  monthCell = await readFile(new URL('../ui/Pv2Cell.vue', import.meta.url), 'utf8')
})

describe('Pv2CopyToDaysCard · source day', () => {
  it('marks the source day without disabling it', () => {
    expect(card).toMatch(/'pv2-copy-card__cell--source': !!cell && cell\.date === sourceDate/)
    // The only things that may close a cell are the blank padding and the cell's own flag.
    expect(card).toMatch(/:disabled="!cell \|\| cell\.disabled"/)
    expect(card).not.toMatch(/:disabled="[^"]*sourceDate/)
  })

  it('wears the same accent pill the month grid gives today', () => {
    expect(card).toMatch(/\.pv2-copy-card__cell--source > span \{\s*background: var\(--pv2-accent\);/)
    expect(card).toMatch(/\.pv2-copy-card__cell--source \{\s*color: var\(--pv2-on-accent\);/)
    // Same two tokens Pv2Cell's today pill uses — if that pill is ever re-toned, this one
    // follows it rather than drifting into a second pink.
    expect(monthCell).toMatch(/\.pv2-cell__num--today \{\s*background: var\(--pv2-accent\);\s*color: var\(--pv2-on-accent\);/)
  })

  it('hands the cell over to the selected disc once the source day is picked', () => {
    // Equal specificity, so the later rule wins: --selected must be declared after --source.
    expect(card.indexOf('.pv2-copy-card__cell--source > span')).toBeLessThan(
      card.indexOf('.pv2-copy-card__cell--selected > span')
    )
    // ...and the source hover must bow out for a selected source day, or it would out-rank
    // the generic hover and repaint the picked cell pink.
    expect(card).toMatch(
      /\.pv2-copy-card__cell--source:not\(\.pv2-copy-card__cell--selected\):not\(:disabled\):hover > span/
    )
  })
})
