// Shrinks a picked photo before it is uploaded.
//
// A stock phone photo is 3–8 MB at 4032x3024, and it renders as a full-bleed
// background on a ~400px-wide frame under a 0.8-opacity white scrim. Nothing
// about that needs the original resolution: uploading it costs the user a slow
// upload on mobile data, and costs every later page load the full download.
//
// Pure module: no store, no Supabase, no DOM beyond the canvas it creates. The
// size arithmetic is exported separately from the encode so it can be tested
// without a working canvas — jsdom has neither createImageBitmap nor a real
// 2D context, and a test that stubs both proves very little.

/** Longest edge of the uploaded image. Generous for a 3x-DPR phone frame, and
 *  leaves room for a future desktop layout. */
export const MAX_EDGE_PX = 1920

/** JPEG quality for the re-encode. 0.85 is the usual knee: visually clean,
 *  roughly a tenth the bytes. */
const JPEG_QUALITY = 0.85

const OUTPUT_TYPE = 'image/jpeg'

export interface FittedSize {
  width: number
  height: number
}

/**
 * Scales (width, height) so the longer edge is at most maxEdge, preserving the
 * aspect ratio. Returns whole pixels, and never returns 0 — a panorama whose
 * short edge rounds to zero would produce a canvas that throws on construction.
 */
export function fittedSize(width: number, height: number, maxEdge: number): FittedSize {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }

  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

/**
 * Returns a downscaled JPEG, or the original file if it cannot be processed.
 *
 * Every failure path falls back to the original rather than throwing. A photo
 * that is larger than ideal still works; a failed upload does not. The caller
 * enforces the hard size ceiling, so this function's only job is to make the
 * common case cheap.
 */
export async function downscaleImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    try {
      const { width, height } = fittedSize(bitmap.width, bitmap.height, MAX_EDGE_PX)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) return file
      context.drawImage(bitmap, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, OUTPUT_TYPE, JPEG_QUALITY)
      })
      if (!blob) return file

      // Re-encoding a small PNG can come out larger than the original. Keeping
      // whichever is smaller means this never makes the upload worse.
      return blob.size < file.size ? blob : file
    } finally {
      // Bitmaps hold decoded pixels off-heap; on a phone this is tens of MB.
      bitmap.close()
    }
  } catch {
    // Unsupported format, OOM on a low-end device, or no createImageBitmap at
    // all. The original is still a valid upload.
    return file
  }
}
