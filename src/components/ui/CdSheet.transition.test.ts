import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'

/**
 * Guards the CdSheet exit transition and, just as importantly, the fence that
 * keeps it away from legacy.
 *
 * CdSheet has 13 render sites. Only three are reachable from the v2 routes
 * (Quick Add, the event composer, the event preview); eight are reachable only
 * via /legacy and one only via /dev/gallery. Those eight are deliberately left
 * on the original `cd-sheetUp` keyframe — they can't be reached from the app in
 * daily use, so converting them would be a change nobody could verify.
 *
 * That makes two mechanisms coexist on purpose, and the risk moves to the
 * boundary between them: QuickAddPopover and EventComposerOverlay are single
 * files shared by BOTH legacy and v2, told apart only by the `variant` prop. An
 * ungated <Transition> in either file changes legacy too — on a path we
 * deliberately don't test by hand. These assertions are the fence.
 *
 * vitest is `environment: 'node'` with no @vue/test-utils, so none of the motion
 * is observable here; what's pinned is the wiring whose breakage is silent.
 */

const V2_SHEET_CONSUMERS = [
  { name: 'QuickAddPopover', url: new URL('../shell/QuickAddPopover.vue', import.meta.url), shared: true },
  { name: 'EventComposerOverlay', url: new URL('../shell/EventComposerOverlay.vue', import.meta.url), shared: true },
  { name: 'EventPreviewPopoverV2', url: new URL('../v2/event/EventPreviewPopoverV2.vue', import.meta.url), shared: false }
] as const

let cdSheet = ''
let indexPage = ''
let tokens = ''
const consumers = new Map<string, string>()

/** `--cd-duration-sheet` in milliseconds — the single source the JS timers track. */
function sheetDurationMs(): number {
  const token = tokens.match(/--cd-duration-sheet:\s*([\d.]+)s;/)?.[1]
  expect(token, '--cd-duration-sheet must be declared in seconds').toBeDefined()
  return parseFloat(token as string) * 1000
}

/**
 * The real opening <Transition> tag, with its attributes.
 *
 * Requires whitespace after the tag name so the word "<Transition>" inside the
 * explanatory comments above each mount site can't be mistaken for the tag.
 */
function openingTransitionTag(src: string): string {
  return src.match(/<Transition\s[\s\S]*?>/)?.[0] ?? ''
}

beforeAll(async () => {
  cdSheet = await readFile(new URL('./CdSheet.vue', import.meta.url), 'utf8')
  indexPage = await readFile(new URL('../../pages/IndexPage.vue', import.meta.url), 'utf8')
  tokens = await readFile(new URL('../../css/cadence-tokens.css', import.meta.url), 'utf8')
  for (const c of V2_SHEET_CONSUMERS) consumers.set(c.name, await readFile(c.url, 'utf8'))
})

describe('CdSheet · transition classes', () => {
  it('defines all four enter/leave class groups', () => {
    // A missing -leave-to is the whole original bug: the sheet vanishes instead
    // of sliding out.
    for (const cls of ['enter-active', 'leave-active', 'enter-from', 'leave-to']) {
      expect(cdSheet, `missing .cd-sheet-${cls}`).toContain(`.cd-sheet-${cls}`)
    }
  })

  it('suppresses the keyframe while the transition drives the panel', () => {
    // cd-sheetUp still applies to .cd-sheet by default (legacy depends on it).
    // Without an explicit animation reset the keyframe and the transition fight
    // over transform, and the result is only visible on a device.
    const active = cdSheet.slice(cdSheet.indexOf('.cd-sheet-root.cd-sheet-enter-active'))
    expect(active).toMatch(/animation:\s*none/)
  })

  it('scopes the rules through the root so they outrank the base declaration', () => {
    // `.cd-sheet-root.cd-sheet-enter-active .cd-sheet` compiles to (0,3,0) with
    // the scope attribute, beating `.cd-sheet[data-v-x]` (0,2,0). Written as a
    // bare `.cd-sheet-enter-active .cd-sheet` in app.css it would tie at (0,2,0)
    // and resolve by stylesheet order — a silent, build-order-dependent failure.
    expect(cdSheet).toMatch(/\.cd-sheet-root\.cd-sheet-enter-active/)
    expect(cdSheet).toMatch(/\.cd-sheet-root\.cd-sheet-leave-active/)
  })

  it('travels the panel and fades the scrim from the same start state', () => {
    const from = cdSheet.slice(cdSheet.indexOf('.cd-sheet-root.cd-sheet-enter-from'))
    expect(from).toMatch(/transform:\s*translateY\(100%\)/)
    expect(from).toMatch(/opacity:\s*0/)
  })

  it('drops the travel but keeps the scrim fade under reduced motion', () => {
    // "Fewer and gentler, not none" — the fade still explains that a layer
    // opened, which is the part that carries meaning.
    const start = cdSheet.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(start, 'CdSheet needs a prefers-reduced-motion block').toBeGreaterThan(-1)
    const rm = cdSheet.slice(start)
    expect(rm).toMatch(/transform:\s*none/)

    // The fade survives by NOT being overridden in here, which a test asserting
    // only the block's contents can't see: adding a `.cd-scrim { transition:
    // none }` would silently kill it while every other assertion still passed.
    expect(rm, 'reduced motion must not disable the scrim fade').not.toMatch(
      /\.cd-scrim[\s\S]*?transition:\s*none/
    )
  })
})

describe('CdSheet · legacy keeps the original keyframe', () => {
  it('still declares cd-sheetUp for the eight unconverted mount sites', () => {
    // Deleting this is the tempting "cleanup" that would silently strip the
    // enter animation from every legacy sheet.
    expect(cdSheet).toMatch(/animation-name:\s*cd-sheetUp/)
  })

  it('still opts fullscreen sheets out of the keyframe', () => {
    expect(cdSheet).toMatch(/animation-name:\s*none/)
  })
})

describe('CdSheet · the legacy/v2 gate on shared files', () => {
  const shared = V2_SHEET_CONSUMERS.filter((c) => c.shared)

  it.each(shared)('$name binds its transition attrs from a variant-gated computed', ({ name }) => {
    // These files render for BOTH routes. An ungated transition gives legacy the
    // new animation on a path we never verify by hand.
    const src = consumers.get(name) as string
    const transition = openingTransitionTag(src)
    expect(transition, `${name} should wrap its sheet in <Transition>`).not.toBe('')
    expect(transition, `${name} must bind gated attrs, not literal ones`).toMatch(
      /v-bind="sheetTransitionAttrs"/
    )

    const gate = src.match(/const sheetTransitionAttrs = computed\([\s\S]*?\n\)/)?.[0] ?? ''
    expect(gate, `${name} needs a sheetTransitionAttrs computed`).not.toBe('')
    expect(gate, `${name} must gate on variant`).toMatch(/props\.variant === 'v2'/)
  })

  it.each(shared)('$name withholds name and duration together', ({ name }) => {
    // `duration` is a JS timer independent of whether any CSS matches, so an
    // empty `name` does NOT neutralise it — the leaving node would stay mounted
    // 300ms with its scrim still swallowing clicks. Passing one without the
    // other is the bug; the object literal keeps them inseparable.
    const src = consumers.get(name) as string
    const gate = src.match(/const sheetTransitionAttrs = computed\([\s\S]*?\n\)/)?.[0] ?? ''
    expect(gate).toMatch(/\{ name: 'cd-sheet', duration: 300 \}/)
    expect(gate, 'the legacy branch must pass no transition attrs at all').toMatch(/:\s*\{\}/)
    // exactOptionalPropertyTypes rejects `duration: undefined`, so the keys must
    // be absent rather than explicitly undefined.
    expect(gate, 'omit the keys instead of passing undefined').not.toMatch(/undefined/)
  })

  it('withholds the attrs on the drawer branch too', () => {
    // EventComposerOverlay's CdDrawerOrSheet renders a CdDrawer on the desktop
    // branch, and .cd-sheet-* never matches a drawer root — so the CSS half is
    // inert there either way. The JS half is not: Vue's whenTransitionEnds takes
    // `if (explicitTimeout != null) return setTimeout(...)` before it ever
    // inspects computed styles, so a duration passed on the drawer branch would
    // hold the drawer mounted for 300ms with nothing animating. With no attrs
    // at all it reaches `if (!type) return resolve()` and unmounts in the same
    // tick, exactly as before this change.
    //
    // The gate reads `usesDrawer`, the same computed the template's `v-if` and
    // `:presentation` branch on, rather than restating the breakpoint: v2 renders
    // a sheet on a tablet even though the tablet band sits above --cd-bp-desktop,
    // so a second copy of that condition here could disagree with the child that
    // actually mounted.
    const src = consumers.get('EventComposerOverlay') as string
    const gate = src.match(/const sheetTransitionAttrs = computed\([\s\S]*?\n\)/)?.[0] ?? ''
    expect(gate, 'the composer must also gate on !usesDrawer').toMatch(/!usesDrawer\.value/)
    expect(src, 'usesDrawer is what the template branches on').toMatch(
      /:presentation="usesDrawer \? 'drawer' : 'sheet'"/
    )
  })

  it('leaves the legacy mounts on the default variant', () => {
    // IndexPage is the /legacy route. If either mount ever gains variant="v2"
    // the gate above silently stops protecting anything.
    const legacyMounts = indexPage.match(/<(QuickAddPopover|EventComposerOverlay)[^>]*>/g) ?? []
    expect(legacyMounts.length, 'IndexPage should mount both shared overlays').toBe(2)
    for (const mount of legacyMounts) {
      expect(mount, 'legacy mounts must not pass variant').not.toMatch(/variant/)
    }
  })
})

describe('CdSheet · v2 consumers', () => {
  it.each(V2_SHEET_CONSUMERS)('$name moves the branch condition onto the Transition', ({ name }) => {
    // In all three files CdDrawerOrSheet is the `v-else-if` half of a pair whose
    // `v-if` is its immediate sibling. Inserting <Transition> between them
    // severs that chain and the template fails to compile, so the condition has
    // to move onto the Transition itself.
    const src = consumers.get(name) as string
    const tag = src.match(/<CdDrawerOrSheet[\s\S]*?>/)?.[0] ?? ''
    expect(tag, `${name} should still render CdDrawerOrSheet`).not.toBe('')
    expect(tag, `${name}: the v-else-if belongs on <Transition>, not CdDrawerOrSheet`).not.toMatch(/v-else-if/)
  })

  it.each(V2_SHEET_CONSUMERS)('$name runs at exactly --cd-duration-sheet', ({ name }) => {
    // The JS timer must equal the CSS duration: shorter cuts the motion off
    // partway, longer leaves the node mounted (scrim still eating clicks) after
    // it has visually settled. Parse the actual binding rather than searching
    // for "300" anywhere — a substring match also accepts 3000.
    const src = consumers.get(name) as string
    const transition = openingTransitionTag(src)
    expect(transition, `${name} should wrap its sheet in <Transition>`).not.toBe('')

    // v2-only file binds it on the tag; the shared files bind it in the gated
    // computed, so read whichever this file uses.
    const gate = src.match(/const sheetTransitionAttrs = computed\([\s\S]*?\n\)/)?.[0] ?? ''
    const bound =
      transition.match(/:duration="(\d+)"/)?.[1] ?? gate.match(/duration:\s*(\d+)/)?.[1]

    expect(bound, `${name} must bind an explicit numeric :duration`).toBeDefined()
    expect(Number(bound), `${name}: duration must equal --cd-duration-sheet`).toBe(
      sheetDurationMs()
    )
  })

  it.each(V2_SHEET_CONSUMERS)('$name leaves CdSheet on its default .3s duration prop', ({ name }) => {
    // The `.28s` draft-conversion duration is legacy-only. If a v2 consumer
    // started passing sheet-duration, the CSS (--cd-duration-sheet) and the JS
    // timer (:duration="300") would disagree and the motion would be truncated.
    const src = consumers.get(name) as string
    expect(src, `${name} must not pass sheet-duration`).not.toMatch(/sheet-duration|:sheetDuration/)
  })
})
