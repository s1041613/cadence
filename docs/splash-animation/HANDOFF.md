# App 進場動畫（Web Splash）· 實作紀錄

分支 `feat/splash-animation`，來源設計 [Web Splash.dc.html](https://claude.ai/design/p/6b2e6720-08d2-442d-9737-1147150093ff?file=Web+Splash.dc.html)。

> **2026-08 改版：** 動畫內容已換成新的「思考的網絡」稿
> （[CADENCE Mobile 畫面設計](https://claude.ai/code/artifact/c7896a64-815c-434d-bcba-bfed5888f6ef)）。
> 下面的**做法、兩層保險絲、收尾條件**都沒變，只有畫面與時間軸換了 ——
> 見文末〈改版：思考的網絡〉。

## 問題

冷啟動時 `index.html` 的 body 是空的：使用者先看到一片空白，等 JS bundle 下載、
掛載、資料抓完，中間才輪到各頁自己的「載入中…」。所以「進場動畫」實際上從來沒有
出現過——只有載入中。

## 做法

動畫本體寫進 `index.html`，純 CSS keyframes，**在 JS bundle 下載前就開始播**。
收尾（淡出＋移除節點）交給 bundle 內的 composable。

為什麼一定要純 CSS：`index.html` 的 CSP 是 `script-src 'self'`，inline `<script>`
會被擋掉；`style-src` 有 `'unsafe-inline'`，所以樣式可以直接寫在頁面裡。

## 改了什麼

| 檔案 | 動作 |
| --- | --- |
| `index.html` | 加三塊：字檔 `<link rel="preload">`、`<style>` 動畫、body 裡 `#cd-splash` markup（放在 `<!-- quasar:entry-point -->` 前面）。CSP、PWA meta、icon 原封不動 |
| `src/composables/use-app-splash.ts` | 新增。決定何時收掉動畫並移除元素 |
| `src/App.vue` | 加一行 `useAppSplash()` |
| `public/fonts/instrument-serif-italic.woff2` | 從 `@fontsource` 複製（22 KB） |

字檔那步是必要的：`app.css` 的 `@fontsource` 匯入要等 bundle 才會到，首次繪製時
還沒有字。少了這份複本，動畫的 C 會 fallback 到 Georgia，字味不同。

## 時間軸

| 時間 | 畫面 |
| --- | --- |
| 0.00s | 紙面 `#fafaf9`，點陣格線淡入放大 |
| 0.26s | 斜體 C 浮起 |
| 0.74s | 三顆分類圓點依序彈入（sunday / accent / saturday） |
| 1.12s | 圓點向外展開成一條時間軸 |
| 1.24s | CADENCE 字距由 .66em 收攏到 .3em |
| ≥1.90s | 資料到齊即淡出（scale 1.03 + opacity 0，420ms） |
| 6.00s | JS 保險絲：資料再慢也收掉（需 app 已 mount） |
| 8.00s | CSS fail-open：連 JS 都沒跑到時的兜底（詳見下方兩層保險絲） |

## 收尾條件

```
auth.isReady && (!auth.isSignedIn || !tasks.isLoading)
```

- 未登入 → auth 一解析完就收，直接看到登入頁
- 已登入 → 等 `tasksStore.isLoading` 結束，所以冷啟動路徑上**不會再閃「載入中…」**
- `MIN_MS = 1900` 保證品牌段播完；`MAX_MS = 6000` 是 JS 保險絲

`prefers-reduced-motion: reduce` 時直接顯示最終狀態，不播放；淡出也只用 opacity，
不做 scale（那 3% 縮放正是這些使用者選擇關掉的動態）。

## 兩層保險絲（codex review 後補）

`MAX_MS` 這道 JS 保險絲有個盲點：它要等 `App.vue` setup 執行、`useAppSplash()` 被
呼叫才註冊，但 Quasar 會先跑 boot files，而 `src/boot/auth.ts` 是
`await auth.init()` —— 裡面的 `supabase.auth.getSession()` **沒有 timeout**。

所以網路卡住時：boot 停住 → App 不 mount → 保險絲根本還沒掛上 → 全螢幕 splash
永久卡死，使用者只能重整。保險絲最需要生效的場景，正是它唯一失效的場景。

因此 `index.html` 多了一道**純 CSS fail-open**：

```css
#cd-splash { animation: cd-splash-failopen 1ms linear 8s forwards; }
@keyframes cd-splash-failopen {
  to { opacity: 0; visibility: hidden; pointer-events: none; }
}
```

從 first paint 起算，不依賴任何 JS，bundle 沒下載到或 parse 失敗都照樣解鎖。
8s > JS 保險絲的 6s，所以正常路徑上它永遠不會先觸發，只在 JS 那層沒掛上時兜底。

注意 reduced-motion 區塊的 `animation: none` 選的是 `#cd-splash *`（只有子元素），
容器上的 fail-open 不受影響——它是安全計時器，不是動態效果。

## 與交付稿的一處差異

交付稿的 `dismissAppSplash()` 有個變數名誤導：

```ts
const waited = performance.now()
window.setTimeout(removeSplash, Math.max(0, MIN_MS - waited))
```

`performance.now()` 回傳的是「頁面載入至今」的時間，也就是動畫**已經顯示多久**，
不是「等了多久」。邏輯本身正確（MIN_MS 是總顯示時間的下限，不是額外延遲），只是
名字讀起來像後者。已改名為 `shownFor` 並補上註解說明，行為不變。

其餘與交付稿一致；註解依專案慣例改為英文。

## 驗證

| 項目 | 結果 |
| --- | --- |
| `npm run typecheck` | 通過，無錯誤 |
| `npm test` | 30 檔 482 測試全過 |
| `npm run build` | 成功（spa） |
| 產出檢查 | `dist/spa/index.html` 含 `id=cd-splash`（minifier 去引號，屬正常）；`<%= publicPath %>` 已解析，無殘留樣板；`dist/spa/fonts/instrument-serif-italic.woff2` 22 KB 已出貨 |

**尚未做真機/瀏覽器驗收。** 上面都是靜態與建置層級的驗證——動畫實際觀感（時間感、
字重、圓點位置、與登入頁的銜接）需要跑起來看。冷啟動路徑最好用 hard reload 或
無痕視窗，避免快取讓 bundle 秒到、動畫一閃而過。

```bash
cd /Users/zoe/Documents/cadence/.worktrees/splash-animation && npm run dev
```

## 待確認

- 動畫總長 1.9s 是否偏長。資料若很快到齊，使用者每次冷啟動都得等滿 1.9s；
  要縮短就調 `use-app-splash.ts` 的 `MIN_MS`
- 已登入且 tasks 載很久時，會停在動畫上直到 6s JS 保險絲——是否需要中途給進度提示
- `auth.init()` 的 `getSession()` 沒有 timeout。splash 這邊已用 CSS fail-open 兜住，
  但 auth boot 本身卡住仍會讓 app 停在空畫面（動畫讓開之後）。那是既有問題、不在
  這個 PR 範圍，但值得另開一張處理

---

# 改版：思考的網絡（2026-08）

來源設計：[CADENCE Mobile 畫面設計](https://claude.ai/code/artifact/c7896a64-815c-434d-bcba-bfed5888f6ef)。

對應 reflect.app 的核心意象：把零散的筆記結成一張網（backlink graph）。
節點逐一亮起、連線成網，再收攏成 CADENCE 標記。開場短暫轉成深色只為了那三秒的
「意義感」，收掉之後立刻回到 app 原本的紙色 `#fafaf9`。

## 新時間軸

| 時間 | 畫面 |
| --- | --- |
| 0.00s | 畫面即為深底 `#0b0b0b` |
| 0.55s | 12 個節點依序亮起（每顆間隔 0.045s），像陸續想起的筆記 |
| 1.15s | 15 條連線一條條畫出（每條間隔 0.035s），連成一張網 |
| 1.55s | 整張網收攏縮小（scale .4）並淡出 |
| 1.62s | 標記浮起 |
| 1.78s | CADENCE 字距由 .5em 收攏到 .28em |
| ≥2.30s | 資料到齊即淡出（opacity 0，400ms） |
| 6.00s / 8.00s | 兩層保險絲，與改版前相同 |

## 實作差異

| 項目 | 改版前 | 改版後 |
| --- | --- | --- |
| 底色 | 紙面 `#fafaf9` | 深底 `#0b0b0b`（僅 splash，app 本身不變） |
| 主體 | 點陣格線 + 斜體 C + 三顆分類圓點 | 內嵌 SVG：12 節點 + 15 連線 |
| 字 | Inter 400（大寫 C 150px） | Inter 500（只剩 CADENCE 17px） |
| 字檔 | `public/fonts/inter-400.woff2` | `public/fonts/inter-500.woff2`（400 那份已無人使用，移除） |
| 收尾 | opacity + scale 1.03 | 只用 opacity（設計稿的收法） |
| `MIN_MS` | 1900 | 2300（新動畫最後一拍 2.28s 收完） |

連線用 `pathLength="1"` 搭配 `stroke-dasharray: 1`，讓「畫線」的 keyframe 與線段
實際長度無關，一組 keyframe 就能畫完 15 條各自不同長度的線。節點的縮放用
`transform-box: fill-box` 以自己的圓心為原點，而不是 viewBox 原點。

SVG 用預設的 `xMidYMid meet`，所以整張網會隨視窗縮放並維持置中 —— 手機與桌機
都對得上它最後收攏成的標記位置。

`prefers-reduced-motion: reduce` 時網絡直接 `display: none`（它本來就是過場的鷹架、
最後會消失），只留深底與收攏後的 CADENCE。

## 驗證（改版）

| 項目 | 結果 |
| --- | --- |
| `npm run typecheck` | 通過 |
| `npm test` | 52 檔 797 測試全過 |
| `npm run build` | 成功（spa）；`dist/spa/index.html` 含 splash markup、無殘留 `<%=` 樣板、`dist/spa/fonts/inter-500.woff2` 已出貨 |
| Playwright 逐拍截圖 | 393×852 與 1280×800 兩種視窗、含 reduced-motion，各拍點畫面與設計稿一致 |

**仍未做真機驗收**：截圖是把動畫暫停在指定時間點拍的，實際的節奏感（節點亮起的
密度、收攏的快慢、與登入頁的銜接）還是要跑起來看。冷啟動路徑建議用 hard reload
或無痕視窗。
