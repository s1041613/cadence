const publicBase = import.meta.env.BASE_URL

export function publicAssetPath(path: string): string {
  return `${publicBase}${path.replace(/^\/+/, '')}`
}

export function publicIconPath(fileName: string): string {
  return publicAssetPath(`icons/${fileName}`)
}

export function publicIconSrcset(name: string): string {
  return [
    `${publicIconPath(`${name}-32.png`)} 1x`,
    `${publicIconPath(`${name}-48.png`)} 1.5x`,
    `${publicIconPath(`${name}-64.png`)} 2x`
  ].join(', ')
}

// jan.(png|jpg|jpeg) … dec.(png|jpg|jpeg) — system default banner photo per calendar month, used whenever the user
// hasn't uploaded their own (settings-store.monthlyPhotos[i] is null). index 0 = January.
const MONTH_PHOTO_FILES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_PHOTO_EXTENSIONS = ['png', 'jpg', 'jpeg']

export function defaultMonthPhotoPath(monthIndex: number): string {
  return defaultMonthPhotoPaths(monthIndex)[0]!
}

export function defaultMonthPhotoPaths(monthIndex: number): string[] {
  const fileName = MONTH_PHOTO_FILES[monthIndex % 12]
  return MONTH_PHOTO_EXTENSIONS.map((ext) => publicAssetPath(`month-photos/${fileName}.${ext}`))
}

// sep.png … — a hand-set wordmark for the month name, drawn rather than typeset, shown by the v2
// poster in place of its title. Only the months listed here have art; every other month falls
// back to the typeset title, so this map is the record of what has been drawn so far. Keys are
// month indexes, 0 = January.
const MONTH_WORDMARK_FILES: Record<number, string> = {
  8: 'sep'
}

export function monthWordmarkPath(monthIndex: number): string | null {
  const fileName = MONTH_WORDMARK_FILES[monthIndex % 12]
  return fileName ? publicAssetPath(`month-wordmarks/${fileName}.png`) : null
}

// A page's own drawn title, in the same hand as the month wordmarks above but keyed by page
// rather than by month — hence a directory of its own instead of a thirteenth month. Settings
// is the only one drawn so far; it is the page's h1, not decoration, so it carries the page
// name as its alt text at the call site.
export function pageWordmarkPath(page: 'settings'): string {
  return publicAssetPath(`wordmarks/${page}.png`)
}
