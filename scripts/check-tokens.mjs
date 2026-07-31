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
  'src/layouts',
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
    id: 'accent-rgba',
    pattern: /rgba\(\s*179\s*,\s*172\s*,\s*145\s*,/gi,
    hint: 'use rgba(var(--cd-olive-rgb), <alpha>)',
  },
  {
    id: 'scrim-rgba',
    pattern: /rgba\(\s*40\s*,\s*38\s*,\s*30\s*,/gi,
    hint: 'use rgba(var(--cd-scrim-rgb), <alpha>) or a --cd-shadow-* token',
  },
  {
    id: 'accent-hex',
    pattern: /#(?:B3AC91|8F8A6E|6E6A52|6E6A54|3f4136)\b/gi,
    hint: 'use --cd-olive, --cd-olive-mix-1, --cd-olive-mix-2 or --cd-olive-ink',
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
 */
function isCommentLine(line) {
  const t = line.trim()
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')
}

function findViolations() {
  const files = [...new Set(SCAN_TARGETS.flatMap(collectFiles))]
  const found = []

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return
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
