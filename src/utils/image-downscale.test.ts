import { describe, it, expect, vi, afterEach } from 'vitest'
import { fittedSize, downscaleImage, MAX_EDGE_PX } from './image-downscale'

describe('fittedSize', () => {
  it('leaves an image smaller than the cap untouched', () => {
    expect(fittedSize(800, 600, 1920)).toEqual({ width: 800, height: 600 })
  })

  it('leaves an image exactly at the cap untouched', () => {
    expect(fittedSize(1920, 1080, 1920)).toEqual({ width: 1920, height: 1080 })
  })

  it('caps the long edge of a landscape image and preserves the aspect ratio', () => {
    // 4032x3024 is a stock phone photo; 4:3 must survive the downscale.
    const { width, height } = fittedSize(4032, 3024, 1920)
    expect(width).toBe(1920)
    expect(height).toBe(1440)
    expect(width / height).toBeCloseTo(4032 / 3024, 5)
  })

  it('caps the long edge of a portrait image, scaling height not width', () => {
    const { width, height } = fittedSize(3024, 4032, 1920)
    expect(height).toBe(1920)
    expect(width).toBe(1440)
  })

  it('rounds to whole pixels', () => {
    const { width, height } = fittedSize(1000, 333, 500)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('never returns a zero dimension for an extreme aspect ratio', () => {
    // A 10000x1 panorama scaled to 1920 would round its height to 0, producing a
    // canvas that throws. The short edge must floor at 1.
    const { width, height } = fittedSize(10000, 1, 1920)
    expect(width).toBe(1920)
    expect(height).toBeGreaterThanOrEqual(1)
  })
})

describe('downscaleImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the original file when the canvas path is unavailable', async () => {
    // jsdom has no real createImageBitmap. Rather than fight it, this asserts the
    // fallback contract directly: a decode failure must never fail the upload,
    // because a too-large-but-valid photo is better than no photo.
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('nope')))

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await downscaleImage(file)

    expect(result).toBe(file)
  })

  it('returns the original file when there is no createImageBitmap at all', async () => {
    // Old Safari and any non-browser context. Same contract as a decode failure:
    // fall back, never throw.
    vi.stubGlobal('createImageBitmap', undefined as unknown as typeof createImageBitmap)

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await downscaleImage(file)

    expect(result).toBe(file)
  })

  // The successful encode path is deliberately not unit-tested. This suite runs in
  // vitest's `node` environment (vitest.config.ts) with no jsdom, so a canvas test
  // would be stubbing createImageBitmap, getContext, drawImage and toBlob — every
  // collaborator in the function — and would assert only that the mocks were called
  // in order. It is verified by hand instead: upload a photo and check the stored
  // object's dimensions and size.

  it('exposes the cap it downscales to', () => {
    expect(MAX_EDGE_PX).toBe(1920)
  })
})
