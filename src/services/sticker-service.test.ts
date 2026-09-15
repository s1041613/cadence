import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DaySticker, MonthSticker } from '@/types/sticker'
import {
  fetchStickerAssets,
  uploadSticker,
  deleteStickerAsset,
  deleteStickerObject,
  publicStickerUrl,
  fetchDayStickers,
  upsertDaySticker,
  deleteDaySticker,
  fetchMonthStickers,
  upsertMonthSticker,
  deleteMonthSticker,
  rowToDaySticker,
  dayStickerToRow,
  rowToMonthSticker,
  monthStickerToRow,
  STICKER_BUCKET,
  type DayStickerRow,
  type MonthStickerRow
} from './sticker-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

type Call = [string, ...unknown[]]

/** Chainable query-builder stub, matching user-settings-service.test.ts. */
function makeBuilder(result: { data: unknown; error: unknown }): {
  builder: Record<string, ReturnType<typeof vi.fn>>
  calls: Call[]
} {
  const calls: Call[] = []
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn((columns: string) => {
      calls.push(['select', columns])
      return builder
    }),
    upsert: vi.fn((row: unknown, options: unknown) => {
      calls.push(['upsert', row, options])
      return builder
    }),
    delete: vi.fn(() => {
      calls.push(['delete'])
      return builder
    }),
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(['eq', column, value])
      return builder
    }),
    order: vi.fn((column: string, options: unknown) => {
      calls.push(['order', column, options])
      return builder
    }),
    abortSignal: vi.fn(() => builder),
    then: undefined as unknown as never
  }
  builder.then = vi.fn((onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  ) as unknown as ReturnType<typeof vi.fn>
  return { builder, calls }
}

function makeStorageBucket(overrides: Record<string, unknown> = {}) {
  return {
    upload: vi.fn(async (_path: string, _file: Blob, _options?: unknown) => ({
      data: { path: 'ignored' },
      error: null as { message: string } | null
    })),
    remove: vi.fn(async (_paths: string[]) => ({
      data: [] as unknown[],
      error: null as { message: string } | null
    })),
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/${STICKER_BUCKET}/${path}` }
    })),
    ...overrides
  }
}

const DAY_STICKER: DaySticker = {
  id: 'sticker-1',
  date: '2026-09-15',
  stickerId: 'asset-1',
  x: 0.25,
  y: 0.4,
  width: 0.2,
  rotation: 15,
  zIndex: 2
}

const MONTH_STICKER: MonthSticker = {
  id: 'sticker-2',
  month: 9,
  stickerId: 'asset-1',
  x: 0.1,
  y: 0.1,
  width: 0.15,
  rotation: 0,
  zIndex: 0
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sticker mapping', () => {
  it('round-trips a day sticker unchanged', () => {
    expect(rowToDaySticker(dayStickerToRow(DAY_STICKER, 'user-1'))).toEqual(DAY_STICKER)
  })

  it('round-trips a month sticker unchanged', () => {
    expect(rowToMonthSticker(monthStickerToRow(MONTH_STICKER, 'user-1'))).toEqual(MONTH_STICKER)
  })

  it('carries the owner into the written row but not back out — RLS is the read filter, not the domain shape', () => {
    const row = dayStickerToRow(DAY_STICKER, 'user-1')
    expect(row.user_id).toBe('user-1')
    expect(rowToDaySticker(row as unknown as DayStickerRow)).not.toHaveProperty('user_id')
  })

  it('maps snake_case row columns onto the camelCase domain shape', () => {
    const row: DayStickerRow = {
      id: 'sticker-1',
      date: '2026-09-15',
      sticker_id: 'asset-1',
      x: 0.25,
      y: 0.4,
      width: 0.2,
      rotation: 15,
      z_index: 2
    }
    expect(rowToDaySticker(row)).toEqual(DAY_STICKER)
  })

  it('maps a month row using the recurring 1-12 month field, not a year-month string', () => {
    const row: MonthStickerRow = {
      id: 'sticker-2',
      month: 9,
      sticker_id: 'asset-1',
      x: 0.1,
      y: 0.1,
      width: 0.15,
      rotation: 0,
      z_index: 0
    }
    expect(rowToMonthSticker(row).month).toBe(9)
  })
})

describe('uploadSticker', () => {
  it('puts the object in the owner uid folder, which is what storage RLS checks', async () => {
    const bucket = makeStorageBucket()
    const { builder } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    await uploadSticker(new Blob(['x'], { type: 'image/png' }), 'user-1')

    const uploadedPath = bucket.upload.mock.calls[0]?.[0]
    expect(uploadedPath?.split('/')[0]).toBe('user-1')
  })

  it('names the object .png, matching downscaleSticker’s alpha-preserving output', async () => {
    const bucket = makeStorageBucket()
    const { builder } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    await uploadSticker(new Blob(['x'], { type: 'image/png' }), 'user-1')

    expect(bucket.upload.mock.calls[0]?.[0]).toMatch(/\.png$/)
  })

  it('names the object after what is actually being uploaded, not a hardcoded extension', async () => {
    const bucket = makeStorageBucket()
    const { builder } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    await uploadSticker(new Blob(['x'], { type: 'image/webp' }), 'user-1')

    expect(bucket.upload.mock.calls[0]?.[0]).toMatch(/\.webp$/)
  })

  it('writes the library row with ignoreDuplicates, so a retry never mints a second row for one upload', async () => {
    const bucket = makeStorageBucket()
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    await uploadSticker(new Blob(['x'], { type: 'image/png' }), 'user-1')

    const upsert = calls.find((c) => c[0] === 'upsert')
    expect(upsert?.[2]).toMatchObject({ ignoreDuplicates: true })
  })

  it('returns an asset whose storagePath matches what was uploaded', async () => {
    const bucket = makeStorageBucket()
    const { builder } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    const asset = await uploadSticker(new Blob(['x'], { type: 'image/png' }), 'user-1')

    expect(bucket.upload.mock.calls[0]?.[0]).toBe(asset.storagePath)
  })

  it('throws when the storage upload errors', async () => {
    const bucket = makeStorageBucket({
      upload: vi.fn(async () => ({ data: null, error: { message: 'boom' } }))
    })
    const { builder } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    await expect(uploadSticker(new Blob(['x'], { type: 'image/png' }), 'user-1')).rejects.toBeTruthy()
  })

  it('throws when the library row write errors', async () => {
    const bucket = makeStorageBucket()
    const { builder } = makeBuilder({ data: null, error: { message: 'boom' } })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket }, from: () => builder })

    await expect(uploadSticker(new Blob(['x'], { type: 'image/png' }), 'user-1')).rejects.toBeTruthy()
  })
})

describe('fetchStickerAssets', () => {
  it('scopes the read to the owner, newest first', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await fetchStickerAssets('user-1')

    expect(calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(calls).toContainEqual(['order', 'created_at', { ascending: false }])
  })

  it('throws when the query errors', async () => {
    const { builder } = makeBuilder({ data: null, error: { message: 'boom' } })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await expect(fetchStickerAssets('user-1')).rejects.toBeTruthy()
  })
})

describe('deleteStickerAsset', () => {
  it('deletes by id and lets the database cascade the placements', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await deleteStickerAsset('asset-1')

    expect(calls).toContainEqual(['delete'])
    expect(calls).toContainEqual(['eq', 'id', 'asset-1'])
  })

  it('throws when the delete errors', async () => {
    const { builder } = makeBuilder({ data: null, error: { message: 'boom' } })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await expect(deleteStickerAsset('asset-1')).rejects.toBeTruthy()
  })
})

describe('deleteStickerObject', () => {
  it('never throws when the remove errors — best-effort cleanup, like deleteBackground', async () => {
    const bucket = makeStorageBucket({
      remove: vi.fn(async () => ({ data: null, error: { message: 'boom' } as { message: string } | null }))
    })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await expect(deleteStickerObject('user-1/abc.png')).resolves.toBe(false)
  })

  it('never throws when the client itself is unavailable', async () => {
    requireSupabaseMock.mockImplementation(() => {
      throw new Error('not configured')
    })

    await expect(deleteStickerObject('user-1/abc.png')).resolves.toBe(false)
  })
})

describe('publicStickerUrl', () => {
  it('derives a URL from a stored path', () => {
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    expect(publicStickerUrl('user-1/abc.png')).toContain('user-1/abc.png')
  })
})

describe('day placements', () => {
  it('fetchDayStickers scopes to owner and date', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await fetchDayStickers('user-1', '2026-09-15')

    expect(calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(calls).toContainEqual(['eq', 'date', '2026-09-15'])
  })

  it('upsertDaySticker writes on the id conflict target, taking the DO UPDATE path — this is how a drag saves', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await upsertDaySticker(DAY_STICKER, 'user-1')

    const upsert = calls.find((c) => c[0] === 'upsert')
    expect(upsert?.[2]).toMatchObject({ onConflict: 'id' })
  })

  it('deleteDaySticker deletes by id', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await deleteDaySticker('sticker-1')

    expect(calls).toContainEqual(['eq', 'id', 'sticker-1'])
  })
})

describe('month placements', () => {
  it('fetchMonthStickers scopes to owner and the recurring 1-12 month', async () => {
    const { builder, calls } = makeBuilder({ data: [], error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await fetchMonthStickers('user-1', 9)

    expect(calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(calls).toContainEqual(['eq', 'month', 9])
  })

  it('upsertMonthSticker writes on the id conflict target', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await upsertMonthSticker(MONTH_STICKER, 'user-1')

    const upsert = calls.find((c) => c[0] === 'upsert')
    expect(upsert?.[2]).toMatchObject({ onConflict: 'id' })
  })

  it('deleteMonthSticker deletes by id', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await deleteMonthSticker('sticker-2')

    expect(calls).toContainEqual(['eq', 'id', 'sticker-2'])
  })
})
