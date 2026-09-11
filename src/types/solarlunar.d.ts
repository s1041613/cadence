/**
 * Types for `solarlunar`, which ships its own solarlunar.d.ts but does not map "types" in its
 * package.json "exports" — so under this project's bundler module resolution TypeScript resolves
 * the ESM entry, finds no declarations, and reports the import as implicitly `any`.
 *
 * Declared to the surface src/utils/festivals.ts actually uses rather than mirroring the whole
 * package: the rest of it (ganzhi, zodiac animals, the Simplified-Chinese labels) has no consumer
 * here, and a copy of it would be a second thing to keep true.
 */
declare module 'solarlunar' {
  export interface SolarLunarResult {
    /** Lunar year, month and day as numbers — the Chinese-label fields are Simplified, so unused. */
    lYear: number
    lMonth: number
    lDay: number
    /** True when lMonth is a leap month, which repeats the previous month's number. */
    isLeap: boolean
    isTerm: boolean
    /** Solar-term name when isTerm, '' otherwise. Simplified Chinese, compared not displayed. */
    term: string
  }

  const solarLunar: {
    /**
     * Gregorian to lunar. Returns -1 for a date outside the package's 1900–2100 table, which is
     * why callers must narrow before reading fields.
     */
    solar2lunar(year: number, month: number, day: number): SolarLunarResult | -1
  }

  export default solarLunar
}
