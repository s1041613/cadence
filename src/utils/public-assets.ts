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

// jan … dec — the calendar months' file-name stems, shared by the photo and the wordmark below.
// The photos are the system default banner per month, used whenever the user hasn't uploaded their
// own (settings-store.monthlyPhotos[i] is null). index 0 = January.
const MONTH_FILE_STEMS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_PHOTO_EXTENSIONS = ['png', 'jpg', 'jpeg']

export function defaultMonthPhotoPath(monthIndex: number): string {
  return defaultMonthPhotoPaths(monthIndex)[0]!
}

export function defaultMonthPhotoPaths(monthIndex: number): string[] {
  const fileName = MONTH_FILE_STEMS[monthIndex % 12]!
  return MONTH_PHOTO_EXTENSIONS.map((ext) => publicAssetPath(`month-photos/${fileName}.${ext}`))
}

// jan.png … dec.png — a hand-set wordmark for the month name, drawn rather than typeset, shown
// by the v2 poster in place of its title. All twelve are drawn, on one shared 3:1 canvas so the
// poster's title box is the same height whichever month is open. Index 0 = January; the file
// names are the photos' names, since both are keyed by calendar month.
export function monthWordmarkPath(monthIndex: number): string {
  return publicAssetPath(`month-wordmarks/${MONTH_FILE_STEMS[monthIndex % 12]!}.png`)
}
