// Local look-only harness: unwraps the .dc.html body so a browser can render it plainly.
import { readFileSync, writeFileSync } from 'node:fs'
const files = ['Now.dc.html', 'Step1.dc.html', 'Step2.dc.html', 'Main.dc.html']
const frames = files.map((f) => {
  const s = readFileSync(f, 'utf8')
  const body = s.slice(s.indexOf('</helmet>') + 9, s.indexOf('</x-dc>'))
  return `<figure style="margin:0"><figcaption style="font:600 12px system-ui;padding:6px 0;color:#333">${f}</figcaption>${body}</figure>`
})
writeFileSync('preview.html', `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Sans+TC:wght@400;500;700&display=swap"><body style="margin:0;padding:20px;display:flex;gap:20px;background:#d9d9d9;font-family:Inter,sans-serif">${frames.join('')}</body>`)
