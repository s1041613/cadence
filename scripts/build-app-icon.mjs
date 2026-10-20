// build-app-icon.mjs — regenerate every shipped app-icon file from one master artwork.
//
//   node scripts/build-app-icon.mjs
//
// Writes public/icons/favicon-{16,32,96,128,512}.png, public/icons/apple-touch-icon-180x180.png,
// public/icons/maskable-512x512.png, public/favicon.ico, and the two comparison stills in
// docs/app-icon/. Rerun after touching the master artwork or any constant in the RECIPE block.
//
// Why this exists: the icons used to be hand-exported binaries with no recipe, and they drifted
// into three separate faults — a rounded plate baked into the bitmap (the platform masks the tile
// itself, so that plate double-rounds under iOS's superellipse), a scanned paper texture instead of
// a flat ground (which is what read as "a white sheet" on a dark home screen), and artwork sized to
// 81% of the canvas across but only 70% down, so the right-hand sparkle sat against the mask edge
// while the top and bottom stood empty. All three are geometry and colour decisions, so they belong
// in code where they can be read and changed, not frozen into a PNG.
//
// Zero dependencies on purpose — the repo installs no image library, and adding one for six small
// files is a poor trade. node:zlib does the compression; the PNG/ICO containers and the resampler
// are below. The master artwork is the only input, and it is already in the repo because the launch
// screen uses it.

import { Buffer } from 'node:buffer'
import { deflateSync, inflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------------------------------------------------------- RECIPE -- */

// The master: the mark alone on transparency, no ground and no plate. Shared with the launch
// screen (index.html), which is why it is already a shipped asset rather than a build input.
const MASTER = path.join(ROOT, 'public/splash-mark.png')

// Which ground the shipped icon wears. Flip this one line and rerun to swap the whole set; both
// grounds are rendered to docs/app-icon/ on every run, so they can be compared without a rebuild.
const SHIPPED = 'ink'

const GROUNDS = {
  // The complaint this set was built to answer: a near-white tile is a bright rectangle on a dark
  // home screen. Deep warm ink, one step darker than the artwork's own #524B48 stroke so the mark
  // still separates from it once inverted.
  ink: {
    ground: [0x3a, 0x35, 0x33],
    // Ink strokes become paper; the accent lifts, because #DE6E8C-family pink sits at about 3:1 on
    // this ground and the dots it colours are four pixels across.
    recolour: { ink: [0xfa, 0xfa, 0xf9], accent: [0xee, 0x96, 0xaf] }
  },
  // Brand-true: the exact --color-bg the app paints its pages on, and the manifest's
  // background_color, so the icon, the launch screen and the first painted frame are one colour.
  paper: {
    ground: [0xfa, 0xfa, 0xf9],
    recolour: null
  }
}

// Fraction of the canvas the mark spans across. The artwork is 765x660, so 0.78 across puts it at
// 0.67 down and leaves an 11% margin on the sides — clear of the corner arcs of both masks the
// platforms apply (iOS's superellipse, Android's adaptive shapes).
const MARK_WIDTH = 0.78

// Android's maskable safe zone is the centred circle of 80% diameter; anything outside it can be
// cropped by a launcher's shape. A mark 0.78 across would lose its sparkles, so the maskable render
// gets its own, smaller fraction: 0.78 * 0.8 ≈ 0.62 keeps the whole artwork inside that circle.
const MASKABLE_WIDTH = 0.62

// Rendered at this multiple of the target and box-filtered down. Lanczos alone is good, but this
// artwork is pixel art: supersampling keeps each art pixel's edge from landing on a half-sample and
// alternating hard/soft down a row of identical squares.
const SUPERSAMPLE = 4

const PNG_SIZES = [
  { file: 'public/icons/favicon-512x512.png', size: 512 },
  { file: 'public/icons/apple-touch-icon-180x180.png', size: 180 },
  { file: 'public/icons/favicon-128x128.png', size: 128 },
  { file: 'public/icons/favicon-96x96.png', size: 96 },
  { file: 'public/icons/favicon-32x32.png', size: 32 },
  { file: 'public/icons/favicon-16x16.png', size: 16 }
]

const ICO_SIZES = [48, 32, 16]

/* ------------------------------------------------------------- PNG DECODE -- */

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/** Decode an 8-bit non-interlaced RGB/RGBA PNG to { width, height, data: RGBA Uint8Array }. */
function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('not a PNG')

  let width = 0
  let height = 0
  let colorType = -1
  const idat = []

  for (let at = 8; at < buf.length; ) {
    const length = buf.readUInt32BE(at)
    const type = buf.toString('ascii', at + 4, at + 8)
    const body = buf.subarray(at + 8, at + 8 + length)
    at += 12 + length

    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      const bitDepth = body[8]
      colorType = body[9]
      if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`)
      if (colorType !== 2 && colorType !== 6) throw new Error(`unsupported colour type ${colorType}`)
      if (body[12] !== 0) throw new Error('interlaced PNGs are not supported')
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
  }

  const channels = colorType === 6 ? 4 : 3
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(idat))
  const out = new Uint8Array(width * height * 4)
  const line = new Uint8Array(stride)
  const prev = new Uint8Array(stride)

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0
      const b = prev[i]
      const c = i >= channels ? prev[i - channels] : 0
      let value = src[i]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) value += paeth(a, b, c)
      else if (filter !== 0) throw new Error(`unknown scanline filter ${filter}`)
      line[i] = value & 0xff
    }

    for (let x = 0; x < width; x++) {
      const to = (y * width + x) * 4
      out[to] = line[x * channels]
      out[to + 1] = line[x * channels + 1]
      out[to + 2] = line[x * channels + 2]
      out[to + 3] = channels === 4 ? line[x * channels + 3] : 0xff
    }

    prev.set(line)
  }

  return { width, height, data: out }
}

/* ------------------------------------------------------------- PNG ENCODE -- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, body) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(body.length, 0)
  head.write(type, 4, 'ascii')
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0)
  return Buffer.concat([head, body, tail])
}

/**
 * Encode opaque 8-bit RGB. Every scanline is tried under all five filters and the one with the
 * smallest sum of absolute differences is kept — the standard heuristic, and worth the five passes
 * here: on flat-ground artwork it is the difference between a file that deflates and one that does
 * not.
 */
function encodePng(width, height, rgb) {
  const stride = width * 3
  const raw = Buffer.alloc((stride + 1) * height)
  const prev = new Uint8Array(stride)
  const line = new Uint8Array(stride)
  const candidate = new Uint8Array(stride)

  for (let y = 0; y < height; y++) {
    line.set(rgb.subarray(y * stride, (y + 1) * stride))
    let bestFilter = 0
    let bestScore = Infinity
    let best = null

    for (let filter = 0; filter <= 4; filter++) {
      let score = 0
      for (let i = 0; i < stride; i++) {
        const a = i >= 3 ? line[i - 3] : 0
        const b = prev[i]
        const c = i >= 3 ? prev[i - 3] : 0
        let value = line[i]
        if (filter === 1) value -= a
        else if (filter === 2) value -= b
        else if (filter === 3) value -= (a + b) >> 1
        else if (filter === 4) value -= paeth(a, b, c)
        candidate[i] = value & 0xff
        score += candidate[i] < 128 ? candidate[i] : 256 - candidate[i]
      }
      if (score < bestScore) {
        bestScore = score
        bestFilter = filter
        best = Uint8Array.prototype.slice.call(candidate)
      }
    }

    raw[y * (stride + 1)] = bestFilter
    Buffer.from(best).copy(raw, y * (stride + 1) + 1)
    prev.set(line)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour, no alpha
  return Buffer.concat([
    PNG_MAGIC,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* --------------------------------------------------------------- ICO ------ */

/** ICO with PNG payloads — read by every browser in the support matrix, and far smaller than BMP. */
function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  const directory = Buffer.alloc(16 * images.length)
  let offset = header.length + directory.length

  images.forEach((image, i) => {
    const at = i * 16
    directory[at] = image.size >= 256 ? 0 : image.size
    directory[at + 1] = image.size >= 256 ? 0 : image.size
    directory.writeUInt16LE(1, at + 4) // colour planes
    directory.writeUInt16LE(32, at + 6) // bits per pixel
    directory.writeUInt32LE(image.png.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += image.png.length
  })

  return Buffer.concat([header, directory, ...images.map((image) => image.png)])
}

/* ---------------------------------------------------------- RESAMPLE ------ */

const LANCZOS_A = 3

function lanczos(x) {
  if (x === 0) return 1
  if (x <= -LANCZOS_A || x >= LANCZOS_A) return 0
  const px = Math.PI * x
  return (LANCZOS_A * Math.sin(px) * Math.sin(px / LANCZOS_A)) / (px * px)
}

/**
 * Weights for one output axis. The kernel widens when shrinking (support / scale) so a downscale
 * averages every source pixel that falls in the footprint instead of point-sampling a few of them.
 */
function axisWeights(srcLength, dstLength) {
  const scale = dstLength / srcLength
  const filterScale = scale < 1 ? 1 / scale : 1
  const support = LANCZOS_A * filterScale
  const rows = []

  for (let i = 0; i < dstLength; i++) {
    const center = (i + 0.5) / scale
    const from = Math.max(0, Math.floor(center - support))
    const to = Math.min(srcLength - 1, Math.ceil(center + support))
    const weights = []
    let total = 0
    for (let j = from; j <= to; j++) {
      const w = lanczos((j + 0.5 - center) / filterScale)
      weights.push(w)
      total += w
    }
    rows.push({ from, weights: weights.map((w) => w / total) })
  }

  return rows
}

/**
 * Resize RGBA. Operates on premultiplied alpha: the master's fully transparent pixels carry black
 * RGB, and convolving those unpremultiplied drags a grey fringe into every stroke edge.
 */
function resize(image, dstW, dstH) {
  const { width: srcW, height: srcH, data } = image

  const premul = new Float32Array(srcW * srcH * 4)
  for (let i = 0; i < srcW * srcH; i++) {
    const a = data[i * 4 + 3] / 255
    premul[i * 4] = data[i * 4] * a
    premul[i * 4 + 1] = data[i * 4 + 1] * a
    premul[i * 4 + 2] = data[i * 4 + 2] * a
    premul[i * 4 + 3] = a * 255
  }

  const xs = axisWeights(srcW, dstW)
  const horizontal = new Float32Array(dstW * srcH * 4)
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < dstW; x++) {
      const { from, weights } = xs[x]
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let k = 0; k < weights.length; k++) {
        const at = (y * srcW + from + k) * 4
        const w = weights[k]
        r += premul[at] * w
        g += premul[at + 1] * w
        b += premul[at + 2] * w
        a += premul[at + 3] * w
      }
      const to = (y * dstW + x) * 4
      horizontal[to] = r
      horizontal[to + 1] = g
      horizontal[to + 2] = b
      horizontal[to + 3] = a
    }
  }

  const ys = axisWeights(srcH, dstH)
  const out = new Float32Array(dstW * dstH * 4)
  for (let y = 0; y < dstH; y++) {
    const { from, weights } = ys[y]
    for (let x = 0; x < dstW; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let k = 0; k < weights.length; k++) {
        const at = ((from + k) * dstW + x) * 4
        const w = weights[k]
        r += horizontal[at] * w
        g += horizontal[at + 1] * w
        b += horizontal[at + 2] * w
        a += horizontal[at + 3] * w
      }
      const to = (y * dstW + x) * 4
      out[to] = r
      out[to + 1] = g
      out[to + 2] = b
      out[to + 3] = a
    }
  }

  // Still premultiplied — composite() is the only consumer and wants it that way.
  return { width: dstW, height: dstH, data: out }
}

/* ------------------------------------------------------------ COMPOSE ----- */

/** Crop away fully transparent edges so the mark's own bounds, not the file's, drive centring. */
function trim(image) {
  const { width, height, data } = image
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // The master carries an all-but-invisible halo of alpha 1-8; treat that as empty, or the
      // "bounds" are just the file's bounds and the centring is a no-op.
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const from = ((minY + y) * width + minX) * 4
    out.set(data.subarray(from, from + w * 4), y * w * 4)
  }
  return { width: w, height: h, data: out }
}

/** Two-tone remap of the artwork: strokes to one colour, the pink accent to another. */
function recolour(image, { ink, accent }) {
  const { data } = image
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r - Math.min(g, b) > 24) {
      data[i] = accent[0]
      data[i + 1] = accent[1]
      data[i + 2] = accent[2]
    } else {
      // The stroke is not one flat value — it carries the artwork's grain. Preserve that
      // variation, inverted, instead of flattening every stroke pixel to a single colour.
      const tone = Math.max(0, Math.min(1, ((r + g + b) / 3 - 60) / 60))
      data[i] = Math.round(ink[0] - 26 * tone)
      data[i + 1] = Math.round(ink[1] - 28 * tone)
      data[i + 2] = Math.round(ink[2] - 28 * tone)
    }
  }
  return image
}

/**
 * One square icon: a flat full-bleed ground with the mark centred on its own bounding box.
 *
 * Nothing rounds the corners here. iOS masks the tile with its superellipse and Android with the
 * launcher's shape; a radius baked into the bitmap only shows up as a second, mismatched corner
 * inside the platform's own.
 */
function compose(mark, { ground, recolour: recipe }, size, widthFraction) {
  const art = recipe ? recolour(trim(mark), recipe) : trim(mark)
  const big = size * SUPERSAMPLE
  const markW = Math.round(big * widthFraction)
  const markH = Math.round((markW * art.height) / art.width)
  const scaled = resize(art, markW, markH)

  const offsetX = Math.round((big - markW) / 2)
  const offsetY = Math.round((big - markH) / 2)

  // Composite over the ground at supersampled resolution, then box-filter to the target. The result
  // is opaque, so this collapses to plain RGB.
  const full = new Float32Array(big * big * 3)
  for (let i = 0; i < big * big; i++) {
    full[i * 3] = ground[0]
    full[i * 3 + 1] = ground[1]
    full[i * 3 + 2] = ground[2]
  }
  for (let y = 0; y < markH; y++) {
    for (let x = 0; x < markW; x++) {
      const from = (y * markW + x) * 4
      const alpha = Math.max(0, Math.min(1, scaled.data[from + 3] / 255))
      const to = ((offsetY + y) * big + offsetX + x) * 3
      for (let c = 0; c < 3; c++) {
        full[to + c] = scaled.data[from + c] + ground[c] * (1 - alpha)
      }
    }
  }

  const box = SUPERSAMPLE * SUPERSAMPLE
  const rgb = new Uint8Array(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sums = [0, 0, 0]
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const at = ((y * SUPERSAMPLE + sy) * big + x * SUPERSAMPLE + sx) * 3
          sums[0] += full[at]
          sums[1] += full[at + 1]
          sums[2] += full[at + 2]
        }
      }
      const to = (y * size + x) * 3
      for (let c = 0; c < 3; c++) {
        rgb[to + c] = Math.max(0, Math.min(255, Math.round(sums[c] / box)))
      }
    }
  }

  return { width: size, height: size, rgb }
}

/* --------------------------------------------------------------- BUILD ---- */

function write(relative, buffer) {
  const target = path.join(ROOT, relative)
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, buffer)
  console.log(`  ${relative}  ${(buffer.length / 1024).toFixed(1)} KB`)
}

function render(recipe, size, widthFraction = MARK_WIDTH) {
  const { width, height, rgb } = compose(decodePng(readFileSync(MASTER)), recipe, size, widthFraction)
  return encodePng(width, height, rgb)
}

const shipped = GROUNDS[SHIPPED]
if (!shipped) throw new Error(`unknown ground "${SHIPPED}" — pick one of ${Object.keys(GROUNDS)}`)

console.log(`building the app icon on the "${SHIPPED}" ground`)
for (const { file, size } of PNG_SIZES) write(file, render(shipped, size))
write('public/icons/maskable-512x512.png', render(shipped, 512, MASKABLE_WIDTH))
write(
  'public/favicon.ico',
  encodeIco(ICO_SIZES.map((size) => ({ size, png: render(shipped, size) })))
)

console.log('comparison stills')
for (const name of Object.keys(GROUNDS)) {
  write(`docs/app-icon/preview-${name}.png`, render(GROUNDS[name], 512))
}
