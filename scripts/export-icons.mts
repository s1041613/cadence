// export-icons.mts — regenerate the registry-exported SVG files in public/icons/utility/.
//
// The design team's icon batch (public/icons/brand/, public/icons/utility/) doesn't cover every
// glyph the app uses. This script serializes the not-covered glyphs from the icons.ts registry into
// standalone SVG files so CdIcon can load every glyph from public/icons/. Rerun after editing a
// registry glyph or adding a new uncovered one:
//
//   node scripts/export-icons.mts
//
// Output matches CdIcon.vue's render exactly (round caps/joins, per-path fill/stroke/stroke-width
// on every element) and the design batch's file conventions (128px intrinsic size, 24-unit viewBox,
// ink #56585E / olive #B3AC91 baked in). All exported glyphs are consumed via CSS mask, so only the
// alpha channel matters at runtime — the baked colors keep the files previewable in Finder/editors.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICONS, ICON_COLOR, type IconName, type IconSpec } from './icon-glyph-registry.ts'

const INK = '#56585E'
const OLIVE = '#B3AC91'

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/icons/utility')

// Registry glyphs the design batch doesn't cover, plus stroke-weight variants for the call sites
// that pass a custom strokeWidth (CdCheckCircle 3.4, CdDropdownField/CdSettingsDrawer theme-check
// 2.4, CdDraftDrawer empty-state search 1.6 — external files freeze stroke width, so each weight
// in use gets its own file and the icons.ts manifest maps (name, strokeWidth) to it).
const REGISTRY_EXPORTS: { name: IconName; file: string; strokeWidth?: number }[] = [
  { name: 'close', file: 'close.svg' },
  { name: 'plus', file: 'plus.svg' },
  { name: 'check', file: 'check.svg' },
  { name: 'check', file: 'check-bold.svg', strokeWidth: 2.4 },
  { name: 'check', file: 'check-heavy.svg', strokeWidth: 3.4 },
  { name: 'search', file: 'search-thin.svg', strokeWidth: 1.6 },
  { name: 'x-small', file: 'x-small.svg' },
  { name: 'target', file: 'target.svg' },
  { name: 'arrow-up', file: 'arrow-up.svg' },
  { name: 'repeat', file: 'repeat.svg' },
  { name: 'notes', file: 'notes.svg' },
  { name: 'spark-mono', file: 'spark-mono.svg' },
  { name: 'brush', file: 'brush.svg' },
  { name: 'location', file: 'location.svg' },
  { name: 'mail', file: 'mail.svg' },
  { name: 'sync', file: 'sync.svg' },
  { name: 'star', file: 'star.svg' },
  { name: 'layers', file: 'layers.svg' },
  { name: 'home', file: 'home.svg' },
  { name: 'heart', file: 'heart.svg' },
  { name: 'work', file: 'work.svg' },
  { name: 'school', file: 'school.svg' },
  { name: 'bulb', file: 'bulb.svg' },
  { name: 'journal-plain', file: 'journal-plain.svg' },
  { name: 'pencil-small', file: 'pencil-small.svg' },
  { name: 'calendar-alt', file: 'calendar-alt.svg' }
]

// Direction variants of the design batch's single right-pointing utility/14-chevron.svg
// (points 9,5 → 16,12 → 9,19). Rotated at export time instead of via a runtime CSS transform,
// because several call sites (CdCalStrip, CdDropdownField, CdTimeDropdown, …) already animate
// `transform: rotate()` on the icon element for expand/collapse — an inline rotation would fight
// those. left = 180°, down = 90° clockwise, both about the 24-grid center.
const DESIGN_DERIVED_EXPORTS: { file: string; strokeWidth: number; body: string }[] = [
  { file: 'chevron-left.svg', strokeWidth: 2, body: '<polyline points="15 19 8 12 15 5"></polyline>' },
  { file: 'chevron-down.svg', strokeWidth: 2, body: '<polyline points="19 9 12 16 5 9"></polyline>' }
]

// CdEventChip's quadrant mini-icons (previously inline v-html strings). Masked with the quadrant
// color at runtime, same as the registry exports.
const QUAD_EXPORTS: { file: string; strokeWidth: number; body: string }[] = [
  { file: 'quad-do.svg', strokeWidth: 2.4, body: '<polyline points="20 6 9 17 4 12"></polyline>' },
  { file: 'quad-plan.svg', strokeWidth: 2.4, body: '<path d="M4 22V3a1 1 0 011-1h13l-2 5 2 5H6"></path>' },
  { file: 'quad-quick.svg', strokeWidth: 2.4, body: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>' },
  { file: 'quad-later.svg', strokeWidth: 2.4, body: '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"></path>' },
  { file: 'quad-event.svg', strokeWidth: 2.4, body: '<polygon points="12 2 15 9 22 9.3 16.7 14 18.5 21 12 17.1 5.5 21 7.3 14 2 9.3 9 9 12 2"></polygon>' }
]

function resolvePaint(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  if (value === ICON_COLOR) return INK
  if (value === 'var(--cd-olive)') return OLIVE
  return value
}

function attrString(attrs: Record<string, string | number>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
}

function svgRoot(strokeWidth: number, body: string): string {
  return (
    `<svg width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="${INK}" ` +
    `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ` +
    `xmlns="http://www.w3.org/2000/svg">${body}</svg>`
  )
}

function serialize(spec: IconSpec, strokeWidthOverride?: number): string {
  const sw = strokeWidthOverride ?? spec.strokeWidth
  const body = spec.paths
    .map((p) => {
      const fill = resolvePaint(p.fill) ?? 'none'
      const stroke = resolvePaint(p.stroke) ?? INK
      const pieces = [attrString(p.attrs), `fill="${fill}"`, `stroke="${stroke}"`, `stroke-width="${p.strokeWidth ?? sw}"`]
      if (p.fillOpacity !== undefined) pieces.push(`fill-opacity="${p.fillOpacity}"`)
      return `<${p.tag} ${pieces.join(' ')}></${p.tag}>`
    })
    .join('')
  return svgRoot(sw, body)
}

await mkdir(OUT_DIR, { recursive: true })

for (const { name, file, strokeWidth } of REGISTRY_EXPORTS) {
  await writeFile(path.join(OUT_DIR, file), serialize(ICONS[name], strokeWidth) + '\n')
}
for (const { file, strokeWidth, body } of [...DESIGN_DERIVED_EXPORTS, ...QUAD_EXPORTS]) {
  await writeFile(path.join(OUT_DIR, file), svgRoot(strokeWidth, body) + '\n')
}

const total = REGISTRY_EXPORTS.length + DESIGN_DERIVED_EXPORTS.length + QUAD_EXPORTS.length
console.log(`Exported ${total} files to ${OUT_DIR}`)
