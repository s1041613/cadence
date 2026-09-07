import { readFileSync, writeFileSync } from 'node:fs'
const files = ['TypeInter.dc.html', 'TypeFredoka.dc.html', 'TypeBaloo.dc.html', 'TypeNunito.dc.html']
const heads = [], frames = []
for (const f of files) {
  const s = readFileSync(f, 'utf8')
  const h = s.slice(s.indexOf('<helmet>') + 8, s.indexOf('</helmet>'))
  heads.push(h.match(/<link[^>]*>/g).join('') + (h.match(/<style>@font-face[\s\S]*?<\/style>/) || [''])[0])
  frames.push(s.slice(s.indexOf('</helmet>') + 9, s.indexOf('</x-dc>')))
}
writeFileSync('preview-type.html', `<!doctype html><meta charset="utf-8">${[...new Set(heads.join('').match(/<link[^>]*>/g))].join('')}${heads.join('').match(/<style>@font-face[\s\S]*?<\/style>/g).join('')}<body style="margin:0;padding:20px;display:grid;grid-template-columns:repeat(2,max-content);gap:20px;background:#d9d9d9">${frames.join('')}</body>`)
