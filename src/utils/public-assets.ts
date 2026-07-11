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
