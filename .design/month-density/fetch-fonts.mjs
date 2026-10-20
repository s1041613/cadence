// Pulls the latin woff2 subset for each candidate title face and writes an @font-face
// block with the file inlined, so the artboards render the same in the canvas, in a
// local browser, and in a PNG/PDF export (which cannot pull Google Fonts).
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const get = (url) => execFileSync('curl', ['-sS', '-A', UA, url], { maxBuffer: 1 << 26 })

const FACES = [
  { family: 'Fredoka', weight: 600, spec: 'Fredoka:wght@600' },
  { family: 'Baloo 2', weight: 800, spec: 'Baloo+2:wght@800' },
  { family: 'Nunito', weight: 900, spec: 'Nunito:wght@900' }
]

const out = {}
for (const f of FACES) {
  const css = get(`https://fonts.googleapis.com/css2?family=${f.spec}&display=swap`).toString()
  // The last block is /* latin */ — the only subset a month name needs.
  const blocks = css.split('@font-face').slice(1)
  const latin = blocks.find((b) => /unicode-range:\s*U\+0000-00FF/.test(b))
  if (!latin) throw new Error(`no latin subset for ${f.family}`)
  const url = latin.match(/url\((https:[^)]+\.woff2)\)/)[1]
  const buf = get(url)
  out[f.family] = `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`
  console.error(`${f.family} ${f.weight}: ${(buf.length / 1024).toFixed(1)} KB`)
}
writeFileSync('fonts.json', JSON.stringify(out, null, 1))
