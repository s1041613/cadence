import { defineBoot } from '#q-app'

/**
 * iOS standalone PWA（加到主畫面）冷啟動時，WebKit 首次排版用的 layout viewport
 * 少算了 status bar 高度（16 Pro 實測短 62pt），所有 viewport 單位（dvh/svh/vh）
 * 都以這個過期 viewport 解析，app shell 因此比螢幕矮、底部露出 body 底色。
 * 使用者手動捲動會觸發 viewport 重算而恢復——這裡在首繪後用程式捲動觸發同一次重算。
 */
export default defineBoot(() => {
  const isIosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!isIosStandalone) return

  // double rAF：確保第一次 paint 已發生，nudge 才會命中「過期 viewport」的那次排版
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 已有捲動位移代表使用者捲過、viewport 已被重算，不需要也不該重置捲動位置
      if (window.scrollY !== 0) return
      window.scrollTo(0, 1)
      window.scrollTo(0, 0)
    })
  })
})
