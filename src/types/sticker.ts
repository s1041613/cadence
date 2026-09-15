/** An uploaded sticker in the user's library. Uploaded once, placed many times
 *  via DaySticker/MonthSticker. */
export interface StickerAsset {
  id: string
  storagePath: string
  createdAt: string
}

/** Shared shape of a placed sticker instance: which library asset, where on
 *  the surface (0..1 fractions, not pixels — the surface renders at different
 *  sizes across phone widths), and its stacking order. height is deliberately
 *  absent: resizing scales width only, and the caller derives height from the
 *  source image's own aspect ratio so a sticker can never be squashed. */
export interface StickerPlacement {
  id: string
  stickerId: string
  x: number
  y: number
  width: number
  rotation: number
  zIndex: number
}

/** A sticker placed on one specific calendar date (DayPageV2). */
export interface DaySticker extends StickerPlacement {
  date: string
}

/** A sticker placed on a calendar month (MonthPageV2). month is 1-12 and
 *  recurs every year, mirroring how month background photos already work —
 *  not tied to one specific year. */
export interface MonthSticker extends StickerPlacement {
  month: number
}
