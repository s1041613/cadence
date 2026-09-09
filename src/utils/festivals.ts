import solarLunar from 'solarlunar'

/**
 * Taiwan public holidays and the folk festivals worth a line in the month grid.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *
 * - Solar terms other than 清明. There are 24 of them, so showing them all puts a line under
 *   nearly every third day and the ones that matter stop standing out. 清明 is here because it
 *   is a public holiday, not because it is a term.
 * - The lunar date itself (初三, 十八). A reference design that carries it every day reads as a
 *   lunar calendar; this one is a solar calendar that knows when the holidays are.
 * - 補假 and 調整放假 (the make-up days and bridge days the DGPA announces each autumn for the
 *   following year). Those are a published table, not a rule, so they cannot be derived — a
 *   Monday that is a holiday because Saturday was one shows nothing here. Adding them means
 *   adding a per-year table and updating it every year; see the note on TW_HOLIDAY_OVERRIDES.
 *
 * The lunar conversion comes from `solarlunar` (28 KB ESM). Its labels are Simplified Chinese,
 * so nothing it returns is displayed: this module reads only its numbers (lunar month/day, the
 * term name for the 清明 test) and supplies its own Traditional names.
 */

/** A day's festival line. `holiday` means a Taiwan public holiday — the day off, not just a date. */
export interface Festival {
  name: string
  holiday: boolean
}

/** Fixed-date public holidays, keyed 'MM-DD'. */
const SOLAR_HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '02-28': '和平紀念日',
  '04-04': '兒童節',
  '05-01': '勞動節',
  '10-10': '國慶日'
}

/**
 * Lunar-date festivals, keyed 'month-day' of the lunar calendar.
 *
 * 春節 covers 初一 to 初三 because all three are holidays and all three read as the new year;
 * labelling 初二 and 初三 by their lunar day would be the only two lunar dates in the whole grid.
 */
const LUNAR_FESTIVALS: Record<string, Festival> = {
  '1-1': { name: '春節', holiday: true },
  '1-2': { name: '春節', holiday: true },
  '1-3': { name: '春節', holiday: true },
  '1-15': { name: '元宵節', holiday: false },
  '5-5': { name: '端午節', holiday: true },
  '7-7': { name: '七夕', holiday: false },
  '7-15': { name: '中元節', holiday: false },
  '8-15': { name: '中秋節', holiday: true },
  '9-9': { name: '重陽節', holiday: false }
}

/**
 * Days a rule cannot produce: the make-up and bridge days announced per year.
 *
 * Empty on purpose rather than absent — the shape is the documentation. Fill it from the DGPA's
 * published calendar (行政院人事行政總處「政府行政機關辦公日曆表」), keyed 'YYYY-MM-DD', and
 * every entry here wins over the rules below.
 */
const TW_HOLIDAY_OVERRIDES: Record<string, Festival> = {}

function parse(date: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

/** The solar day after `date`, as 'YYYY-MM-DD'. Used to find 除夕 — see festivalOf. */
function nextDay(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/**
 * The festival to print under a day number, or null for an ordinary day.
 *
 * `date` is the app's 'YYYY-MM-DD'. Resolution order, and why:
 *   1. A per-year override, which exists precisely to overrule a rule.
 *   2. 除夕, which no table can hold: it is "the day before 正月初一", and the lunar twelfth
 *      month is 29 or 30 days depending on the year.
 *   3. The fixed-date holidays.
 *   4. 清明, whose date moves with the solar term (4/4 or 4/5).
 *   5. The lunar festivals.
 *
 * 兒童節 and 清明 collide whenever the term lands on 4/4 — roughly every other year. The day is a
 * holiday either way and only one line fits, so the fixed table wins and the label reads 兒童節.
 */
export function festivalOf(date: string): Festival | null {
  const solar = parse(date)
  if (!solar) return null

  const override = TW_HOLIDAY_OVERRIDES[date]
  if (override) return override

  const lunar = solarLunar.solar2lunar(solar.y, solar.m, solar.d)
  // The library returns -1 for a date outside its table (it covers 1900–2100).
  if (typeof lunar === 'number' || !lunar) return null

  const tomorrow = nextDay(solar.y, solar.m, solar.d)
  const lunarTomorrow = solarLunar.solar2lunar(tomorrow.y, tomorrow.m, tomorrow.d)
  const eveOfNewYear =
    typeof lunarTomorrow !== 'number' &&
    !!lunarTomorrow &&
    !lunarTomorrow.isLeap &&
    lunarTomorrow.lMonth === 1 &&
    lunarTomorrow.lDay === 1
  if (eveOfNewYear) return { name: '除夕', holiday: true }

  const fixed = SOLAR_HOLIDAYS[date.slice(5)]
  if (fixed) return { name: fixed, holiday: true }

  if (lunar.isTerm && lunar.term === '清明') return { name: '清明節', holiday: true }

  // A leap month repeats a lunar month number, and its 初五 is not 端午 — the festivals belong to
  // the ordinary month only.
  if (lunar.isLeap) return null

  return LUNAR_FESTIVALS[`${lunar.lMonth}-${lunar.lDay}`] ?? null
}
