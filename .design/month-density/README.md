# 月檢視密度 mockup

四張 402x874 對照，回答「為什麼參考圖的格子區比較小卻比較清楚」：

| | 現況 | 提案 |
|---|---|---|
| 一列週高 | 105.4px（`maxLanes` 反推出 4 條 lane） | 81px（lane 上限固定 3） |
| 格子區 | 527px = 螢幕的 71% | 405px，空出 122px |
| 底 | `Pv2PageBackdrop` 滿版桌布穿過資料區 | 格子區永遠白底，桌布收成上下兩個去背圖片槽 |
| 定時 chip | 白底 + 1px 描邊 + 同色字 | 事件色混白 78% 實心 + 混黑 36% 的字 |

`Now` → `Step1` → `Step2` → `Main` 是累加的，一張看一項。

所有數值取自 `src/utils/month-lanes.ts` 的 `CELL`、`Pv2Cell` / `Pv2EventChip` /
`Pv2Grid` / `Pv2Poster` / `Pv2CalStrip` / `Pv2BottomNav` 與 `cadence-tokens.css`，
不是照截圖描的。事件資料是 2026/9 的真實內容。

`Step2` / `Main` 上下兩槽裡的線稿是**佔位圖**，等真正的去背 PNG。

## 已知問題（mockup 裡順手改掉的）

lane 收到 3 條之後，`Pv2Cell` 現在放在右下角的 `+N`（`bottom: 3px`）會被最後一條
chip 蓋住 —— 81px 列高下最後一條 chip 剛好落在那個位置。mockup 把它移到日期列右側。

## 重建

```sh
node gen.mjs      # 產生四個 .dc.html
node preview.mjs  # 產生 preview.html，瀏覽器可直接開
```

設計畫布：https://claude.ai/code/artifact/b88b161e-3555-4b25-a32a-b8232402cd8c

## 第二頁：標題字體

`TypeInter` / `TypeFredoka` / `TypeBaloo` / `TypeNunito` 是月份標題的候選字體對照，
只換標題那一個字，48px 與 `#1b1b1b` 都不動。

參考圖的字體無法從截圖判定，這三個是 Google Fonts 上特徵最接近的（幾何圓體、
極重字重、末端全圓、直立）。Baloo 2 800 最接近參考圖的重量與圓度。

字檔用 `fetch-fonts.mjs` 抓 latin 子集（各 16-18KB woff2）內嵌進 `.dc.html`，
不是 `<link>` 連 Google Fonts —— 連結版在 PNG / PDF 匯出時會退回 Inter，
四張看起來就會一模一樣。

要換候選字體：改 `gen.mjs` 末端的 `FACES` 與 `out('Type*.dc.html', ...)`，
重跑 `node fetch-fonts.mjs && node gen.mjs`。

### 這件事跟現有規則衝突

`cadence-tokens.css` 記著「本產品只出一套拉丁字體（Inter）」，六個 font token
全部指向它；`Pv2Poster` 的註解記著月 / 週 / 日三個主標題刻意都是 400。
換月份標題等於同時破這兩條 —— 要嘛三個標題一起換，要嘛接受月檢視自成一套。

### 字體授權

Fredoka、Baloo 2、Nunito 皆為 SIL Open Font License 1.1。內嵌的是各自的
latin 子集，僅供此 mockup 預覽；真的要進 app 請走 `@fontsource` 套件。
