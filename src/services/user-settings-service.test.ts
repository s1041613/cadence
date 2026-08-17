import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchUserSettings,
  saveUserSettings,
  uploadBackground,
  deleteBackground,
  publicBackgroundUrl,
  BACKGROUND_BUCKET,
  type UserSettings
} from './user-settings-service'

const requireSupabaseMock = vi.fn()

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => requireSupabaseMock()
}))

type Call = [string, ...unknown[]]

/** Chainable query-builder stub, matching notes-service.test.ts. `maybeSingle` is
 *  the extra terminal this service needs: one row per user, zero rows is legal. */
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
    eq: vi.fn((column: string, value: unknown) => {
      calls.push(['eq', column, value])
      return builder
    }),
    abortSignal: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: undefined as unknown as never
  }
  // `saveUserSettings` awaits the builder itself (no maybeSingle), so it needs a
  // thenable. Assigned after construction so the object literal stays readable.
  builder.then = vi.fn((onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  ) as unknown as ReturnType<typeof vi.fn>
  return { builder, calls }
}

function makeStorageBucket(overrides: Record<string, unknown> = {}) {
  return {
    // Parameters are declared so the mock's call tuples stay typed — `vi.fn(async () => …)`
    // infers a zero-arg signature, and `.mock.calls[0][0]` then has no element to read.
    upload: vi.fn(async (_path: string, _file: Blob, _options?: unknown) => ({
      data: { path: 'ignored' },
      error: null as { message: string } | null
    })),
    remove: vi.fn(async (_paths: string[]) => ({
      data: [] as unknown[],
      error: null as { message: string } | null
    })),
    getPublicUrl: vi.fn((path: string) => ({
      data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/${BACKGROUND_BUCKET}/${path}` }
    })),
    ...overrides
  }
}

const SETTINGS: UserSettings = {
  backgroundPath: 'user-1/abc.jpg',
  scrimOpacity: 0.6,
  shownTabKeys: ['month', 'notes', 'setting']
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchUserSettings', () => {
  it('maps a row into the client shape', async () => {
    const { builder } = makeBuilder({
      data: {
        background_path: 'user-1/abc.jpg',
        scrim_opacity: 0.6,
        shown_tab_keys: ['month', 'notes', 'setting']
      },
      error: null
    })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await expect(fetchUserSettings('user-1')).resolves.toEqual(SETTINGS)
  })

  it('returns null when the user has no row yet', async () => {
    // Distinct from a row with null columns: "never opened Customization".
    const { builder } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await expect(fetchUserSettings('user-1')).resolves.toBeNull()
  })

  it('scopes the read to the owner and carries an abort signal', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await fetchUserSettings('user-1')

    expect(calls).toContainEqual(['eq', 'user_id', 'user-1'])
    expect(builder.abortSignal).toHaveBeenCalled()
  })

  it('throws when the query errors', async () => {
    const { builder } = makeBuilder({ data: null, error: { message: 'boom' } })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await expect(fetchUserSettings('user-1')).rejects.toBeTruthy()
  })
})

describe('saveUserSettings', () => {
  it('always writes all three preference columns, never a partial row', async () => {
    // The slider debounce, a photo upload and a tab-bar save all target the same
    // row. A partial upsert would let one clobber another's column with a stale
    // value, so every write carries the full current state.
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await saveUserSettings(SETTINGS, 'user-1')

    const upsert = calls.find((c) => c[0] === 'upsert')
    expect(upsert).toBeDefined()
    const row = upsert?.[1] as Record<string, unknown>
    expect(row).toMatchObject({
      user_id: 'user-1',
      background_path: 'user-1/abc.jpg',
      scrim_opacity: 0.6,
      shown_tab_keys: ['month', 'notes', 'setting']
    })
  })

  it('upserts on the user_id conflict target, taking the DO UPDATE path', async () => {
    // Not ignoreDuplicates: unlike notes and dismissed_title_suggestions, every
    // save after the first IS an update of the same row.
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await saveUserSettings(SETTINGS, 'user-1')

    const upsert = calls.find((c) => c[0] === 'upsert')
    expect(upsert?.[2]).toMatchObject({ onConflict: 'user_id' })
    expect(upsert?.[2]).not.toMatchObject({ ignoreDuplicates: true })
  })

  it('writes nulls through rather than dropping the keys', async () => {
    const { builder, calls } = makeBuilder({ data: null, error: null })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await saveUserSettings(
      { backgroundPath: null, scrimOpacity: 0.8, shownTabKeys: null },
      'user-1'
    )

    const row = calls.find((c) => c[0] === 'upsert')?.[1] as Record<string, unknown>
    expect(row).toHaveProperty('background_path', null)
    expect(row).toHaveProperty('shown_tab_keys', null)
  })

  it('throws when the write errors', async () => {
    const { builder } = makeBuilder({ data: null, error: { message: 'boom' } })
    requireSupabaseMock.mockReturnValue({ from: () => builder })

    await expect(saveUserSettings(SETTINGS, 'user-1')).rejects.toBeTruthy()
  })
})

describe('uploadBackground', () => {
  it('returns a storage path, not a URL', async () => {
    // The DB stores the path: a URL embeds the project ref and would have to be
    // rewritten if the project ever moved.
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    const path = await uploadBackground(new Blob(['x'], { type: 'image/jpeg' }), 'user-1')

    expect(path).not.toMatch(/^https?:/)
    expect(path.startsWith('user-1/')).toBe(true)
  })

  it('puts the object in the owner uid folder, which is what storage RLS checks', async () => {
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await uploadBackground(new Blob(['x'], { type: 'image/jpeg' }), 'user-1')

    const uploadedPath = bucket.upload.mock.calls[0]?.[0]
    expect(uploadedPath?.split('/')[0]).toBe('user-1')
  })

  it('gives each upload a fresh unguessable name', async () => {
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await uploadBackground(new Blob(['x'], { type: 'image/jpeg' }), 'user-1')
    await uploadBackground(new Blob(['y'], { type: 'image/jpeg' }), 'user-1')

    const first = bucket.upload.mock.calls[0]?.[0]
    const second = bucket.upload.mock.calls[1]?.[0]
    expect(first).toBeDefined()
    expect(first).not.toBe(second)
  })

  it('names the object after what is actually being uploaded', async () => {
    // downscaleImage falls back to the original file when the canvas path fails,
    // so a PNG can reach here unconverted. A hardcoded .jpg would then describe
    // the object incorrectly, and contentType and extension would disagree.
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await uploadBackground(new Blob(['x'], { type: 'image/png' }), 'user-1')

    const path = bucket.upload.mock.calls[0]?.[0]
    expect(path).toMatch(/\.png$/)
  })

  it('falls back to a jpg extension for an unrecognised type', async () => {
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await uploadBackground(new Blob(['x']), 'user-1')

    expect(bucket.upload.mock.calls[0]?.[0]).toMatch(/\.jpg$/)
  })

  it('throws when the upload errors', async () => {
    const bucket = makeStorageBucket({
      upload: vi.fn(async () => ({ data: null, error: { message: 'boom' } }))
    })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await expect(
      uploadBackground(new Blob(['x'], { type: 'image/jpeg' }), 'user-1')
    ).rejects.toBeTruthy()
  })
})

describe('deleteBackground', () => {
  it('removes the object', async () => {
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await deleteBackground('user-1/abc.jpg')

    expect(bucket.remove).toHaveBeenCalledWith(['user-1/abc.jpg'])
  })

  it('never throws when the remove errors', async () => {
    // Best-effort cleanup: an orphaned object is invisible, and failing an
    // otherwise successful replacement over it would be perverse.
    const bucket = makeStorageBucket({
      remove: vi.fn(async (_paths: string[]) => ({
        data: null,
        error: { message: 'boom' } as { message: string } | null
      }))
    })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    await expect(deleteBackground('user-1/abc.jpg')).resolves.toBe(false)
  })

  it('never throws when the client itself is unavailable', async () => {
    requireSupabaseMock.mockImplementation(() => {
      throw new Error('not configured')
    })

    await expect(deleteBackground('user-1/abc.jpg')).resolves.toBe(false)
  })

  it('reports whether the object was actually removed', async () => {
    // Storage's remove() resolves with { error } rather than rejecting, so a
    // try/catch alone never sees the common failure. Returning the outcome lets a
    // caller distinguish "cleaned up" from "orphaned" without making the failure
    // fatal — which is the part a bare catch silently loses.
    const ok = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => ok } })
    await expect(deleteBackground('user-1/abc.jpg')).resolves.toBe(true)

    const failing = makeStorageBucket({
      remove: vi.fn(async (_paths: string[]) => ({
        data: null,
        error: { message: 'boom' } as { message: string } | null
      }))
    })
    requireSupabaseMock.mockReturnValue({ storage: { from: () => failing } })
    await expect(deleteBackground('user-1/abc.jpg')).resolves.toBe(false)
  })
})

describe('publicBackgroundUrl', () => {
  it('derives a URL from a stored path', () => {
    const bucket = makeStorageBucket()
    requireSupabaseMock.mockReturnValue({ storage: { from: () => bucket } })

    expect(publicBackgroundUrl('user-1/abc.jpg')).toContain('user-1/abc.jpg')
  })
})
