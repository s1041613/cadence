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
