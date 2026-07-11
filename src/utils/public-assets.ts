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

// jan.jpg … dec.jpg — system default banner photo per calendar month, used whenever the user
// hasn't uploaded their own (settings-store.monthlyPhotos[i] is null). index 0 = January.
const MONTH_PHOTO_FILES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function defaultMonthPhotoPath(monthIndex: number): string {
  return publicAssetPath(`month-photos/${MONTH_PHOTO_FILES[monthIndex % 12]}.jpg`)
}
