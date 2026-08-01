/**
 * check-tokens — fails when a palette value is hardcoded instead of referencing a token.
 *
 * Why this exists: a hardcoded `#B3AC91` and a `var(--cd-olive)` render identically
 * while the app ships a single palette, so the divergence is invisible until a second
 * palette is applied. The `rgba(179, 172, 145, a)` form is worse still: it shares no
 * text with the token name, so grepping for the token reports success while the value
 * stays frozen on swap. This check is the seam that makes both categories visible.
 *
 * Scope is the legacy layout only. The v2 generation is being retired and is expected
 * to hold hardcoded values, so including it would produce permanent noise.
 *
 * Run: npm run check:tokens
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname

/** Directories and files that make up the legacy layout. */
const SCAN_TARGETS = [
  'src/components/ui',
  'src/components/shell',
  'src/components/month',
  'src/components/week',
  'src/components/day',
  'src/components/focus',
  'src/layouts',
  'src/css/app.css',
  'src/pages/IndexPage.vue',
  'src/pages/LoginPage.vue',
  'src/pages/JoinCalendarPage.vue',
  'src/pages/AuthCallbackPage.vue',
  'src/pages/DevGalleryPage.vue',
  'src/pages/ErrorNotFound.vue',
]

/**
 * Each rule targets one palette value that must not appear literally.
 * Patterns tolerate arbitrary internal whitespace because both `rgba(179,172,145,.5)`
 * and `rgba(179, 172, 145, 0.5)` occur in the codebase.
 */
const RULES = [
  {
    // Matches rgb() and rgba(), comma- or space-separated (CSS Color 4), with or
    // without an alpha channel. Anchoring on the channel triple alone rather than
    // requiring a trailing comma is what catches the alpha-less rgb() form.
    id: 'accent-rgb',
    pattern: /rgba?\(\s*179\s*[,\s]\s*172\s*[,\s]\s*145\s*[,)/\s]/gi,
    hint: 'use rgba(var(--cd-accent-rgb), <alpha>)',
  },
  {
    id: 'scrim-rgb',
    pattern: /rgba?\(\s*40\s*[,\s]\s*38\s*[,\s]\s*30\s*[,)/\s]/gi,
    hint: 'use rgba(var(--cd-scrim-rgb), <alpha>) or a --cd-shadow-* token',
  },
  {
    // The ink triple. This was hand-written at 34 sites before --cd-ink-rgb existed,
    // and it is the most-used colour in the app, so it is the costliest leak of the
    // three: a rename reports success while every wash stays on the old palette.
    id: 'ink-rgb',
    pattern: /rgba?\(\s*86\s*[,\s]\s*88\s*[,\s]\s*94\s*[,)/\s]/gi,
    hint: 'use rgba(var(--cd-ink-rgb), <alpha>)',
  },
  {
    // The optional trailing pair catches 8-digit hex (#B3AC9188), the modern way to
    // write a translucent accent, which a \b-anchored 6-digit pattern misses.
    id: 'accent-hex',
    pattern: /#(?:B3AC91|8F8A6E|6E6A52|6E6A54|3F4136|E7E4D6)(?:[0-9a-f]{2})?\b/gi,
    hint: 'use --cd-accent, --cd-accent-mid, --cd-accent-strong, --cd-on-accent or --cd-accent-subtle',
  },
  {
    // Surface and ink roles. Added once each had exactly one token to point at —
    // before the convergence these values were spread across near-duplicate tokens,
    // so a rule here would have had no single correct fix to suggest.
    id: 'surface-hex',
    pattern: /#(?:F2F1EC|FBFAF7|F1EFE8|EEEBE1|E5E3DB|D7D4CB)(?:[0-9a-f]{2})?\b/gi,
    hint: 'use --cd-surface-page, --cd-surface-raised, --cd-surface-inset, --cd-surface-textured, --cd-line or --cd-control-off',
  },
  {
    id: 'ink-hex',
    pattern: /#(?:56585E|6E7176|9C9E94)(?:[0-9a-f]{2})?\b/gi,
    hint: 'use --cd-ink, --cd-ink-secondary or --cd-ink-muted',
  },
  {
    // Semantic family. Added after an audit found five sites holding these exact values
    // as literals — the rules above covered accent, surface and ink, so a #C0564B could
    // sit next to a correctly-tokenised sibling and the check still passed.
    id: 'semantic-hex',
    pattern: /#(?:3A6EA5|C0564B|B4655C|C98A2E)(?:[0-9a-f]{2})?\b/gi,
    hint: 'use --cd-weekday-saturday, --cd-weekday-sunday, --cd-danger, --cd-danger-hover or --cd-warn',
  },
  {
    // Values whose tokens were deleted during the role convergence. Without a rule they
    // are indistinguishable from any other unknown colour, so the orphans left behind by
    // that convergence would never surface.
    id: 'retired-hex',
    pattern: /#(?:F4F2EC|EEECE4|E9E6DD|E4E1D6|F7F5EF|F1F2EC)(?:[0-9a-f]{2})?\b/gi,
    hint: 'these were merged: #F4F2EC → --cd-surface-inset, #F7F5EF → --cd-surface-raised, the rest → --cd-line',
  },
]

function collectFiles(target) {
  const abs = join(ROOT, target)
  let stat
  try {
    stat = statSync(abs)
  } catch {
    return []
  }
  if (stat.isFile()) return [abs]

  return readdirSync(abs).flatMap((entry) => {
    const child = join(abs, entry)
    if (statSync(child).isDirectory()) return collectFiles(relative(ROOT, child))
    return /\.(vue|css|sass|scss|ts)$/.test(entry) ? [child] : []
  })
}

/**
 * Comments describe values rather than rendering them, so a literal inside one is a
 * reference, not a leak. Stripping them keeps documentation from failing the check.
 *
 * A bare `*` prefix means a JSDoc continuation line, but `*` is also a valid CSS
 * selector (`* { }`, `.a > * { }`), so requiring that nothing resembling a
 * declaration or block follows keeps real code from being skipped silently.
 */
function isCommentLine(line) {
  const t = line.trim()
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('<!--')) return true
  return t.startsWith('*') && !t.includes('{') && !/:\s*\S/.test(t)
}

/**
 * Tailwind's `@theme` block is compiled at build time and cannot read a runtime custom
 * property, so it has to restate palette values literally. Those lines are a documented
 * mirror rather than a leak; everything around them is still checked.
 *
 * The allowlist tracks the block's actual extent rather than matching `--color-*:` on any
 * line: a palette value assigned to a `--color-*` custom property OUTSIDE `@theme` would
 * be a real leak, and a line-shaped test cannot tell the two apart.
 */
function allowlistedLines(file, lines) {
  const allowed = new Set()
  if (!file.endsWith('app.css')) return allowed

  let depth = 0
  let inTheme = false
  lines.forEach((line, i) => {
    if (!inTheme && /^\s*@theme\b/.test(line)) {
      inTheme = true
      depth = 0
    }
    if (inTheme) {
      allowed.add(i)
      depth += (line.match(/\{/g) || []).length
      depth -= (line.match(/\}/g) || []).length
      if (depth <= 0 && line.includes('}')) inTheme = false
    }
  })
  return allowed
}

function findViolations() {
  const files = [...new Set(SCAN_TARGETS.flatMap(collectFiles))]
  const found = []

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    const allowed = allowlistedLines(file, lines)
    lines.forEach((line, i) => {
      if (isCommentLine(line) || allowed.has(i)) return
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0
        if (rule.pattern.test(line)) {
          found.push({
            file: relative(ROOT, file),
            line: i + 1,
            rule: rule.id,
            text: line.trim(),
            hint: rule.hint,
          })
        }
      }
    })
  }
  return found
}

const violations = findViolations()

if (violations.length === 0) {
  console.log('check-tokens: no hardcoded palette values in the legacy layout.')
  process.exit(0)
}

console.error(`check-tokens: ${violations.length} hardcoded palette value(s) found.\n`)
for (const rule of RULES) {
  const hits = violations.filter((v) => v.rule === rule.id)
  if (hits.length === 0) continue
  console.error(`  ${rule.id} (${hits.length}) — ${rule.hint}`)
  for (const h of hits) console.error(`    ${h.file}:${h.line}  ${h.text}`)
  console.error('')
}
process.exit(1)
