# 動畫稽核進度

**最後更新：** 2026-08-16
**起因：** Zoe「我覺得我的 app 現在很死板！沒有 app 操作絲滑的感覺」（iPhone + Safari 加到主畫面 / PWA standalone）

用 [emilkowalski/skills](https://github.com/emilkowalski/skills) 的 `improve-animations` 對 v2 全站做動畫稽核，本文件追蹤各項的處理狀態。

---

## 診斷摘要

稽核當下的根本發現：**app 不是動畫做錯，而是根本沒有動畫。**

`grep -rn '<Transition' src/` 在整個 codebase **回傳零筆結果**（稽核當時）。Token 系統其實健全 —— `src/css/cadence-tokens.css:241-255` 已有 `--cd-ease-standard: cubic-bezier(.22,1,.36,1)`（正統 strong ease-out）與完整 duration 級距，keyframes `cd-sheetUp` / `cd-scrimIn` / `cd-popIn` 都寫好且規格正確（`cd-popIn` 用 `scale(.95)` 不是 `scale(0)`）。**東西都備好了，只是沒接上去。**

經典反模式反而很乾淨：沒有 `ease-in`、沒有 `scale(0)`、僅兩處 `transition: all`。

⚠️ **一個判斷誤差要留給後人：** 初次稽核時我把 iOS 300ms 點擊延遲列為「可能是最大單一元兇」，**這是高估**。現代 Safari 在有 `width=device-width` 的頁面上早就不套 double-tap 延遲，而 `index.html:10` 一直都有該 meta。實測後 Zoe 確認有感的是長按放大鏡消失，不是速度。

---

## 已完成

### ✅ #0 — iOS 觸控回饋（PR #62，已合併 `8c61111`）

嚴格說是觸控行為而非動畫，但它是後續所有按壓回饋的**前置條件**。

| 改動 | 檔案 |
|---|---|
| 全域清 tap highlight、可互動元素加 `touch-action` / `user-select` / `touch-callout` | `src/css/app.css` |
| boot file 註冊 passive touchstart listener | `src/boot/ios-active-state.ts`（新）+ `quasar.config.ts` |
| 回歸守門測試（7 tests） | `src/css/ios-touch-feedback.test.ts` |

**關鍵發現：** 常見做法 `<body ontouchstart="">` 在本專案**會靜默失效** —— 頁面 CSP 是 `script-src 'self'` 且無 `unsafe-inline`（`index.html:12-13`），inline handler 會被瀏覽器拒絕，只在 console 留 violation 而 `:active` 依然不動。改由 bundled JS 註冊才可行。此點由 Codex review 抓出，並以測試確認（先紅後綠）。

**連帶效果：** codebase 裡原本已寫好但在 iOS 上完全不觸發的 4 處 `:active`（`Pv2Fab.vue:34`、`Pv2HeaderNav.vue:70`、`Pv2MonthSheet.vue:184,188`、`CdWeekAgenda.vue:122`）自此生效，未改任何元件。

**Zoe 實測結果：** 長按不再跳放大鏡（有感）。灰方塊與延遲兩項無明顯感受 —— 前者只在按住不放時明顯，後者本來就不存在。

### 🟡 #1 — Day Sheet 開合動畫（PR #64，**CI 綠、待合併驗收**）

點日期格開出的當日事件面板，加上遮罩淡入 + 面板滑上（`--cd-duration-sheet` .3s + `--cd-ease-standard`），關閉對稱倒回。

- PR: https://github.com/s1041613/cadence/pull/64
- 分支 `fix/day-sheet-transition`，commit `485335b`
- 計畫（含完整技術決策）：`~/.claude/plans/greedy-mapping-pinwheel.md`（Codex peer review 3 輪 APPROVED）
- Mockup（⚠️ 展示的是**修正前**的版本，見下）：https://claude.ai/code/artifact/6c0ca873-36c6-497a-97b6-99b1d697e20f

**加劇問題的事實：** 這個面板本來就支援往下滑關閉（`Pv2DaySheet.vue:10` 的 `v-touch-swipe.down`），所以現況是可以用手指拖、卻瞬間消失 —— 可拖曳而無動畫是最違和的組合。

**兩個「直覺寫法會踩到」的陷阱**（皆由 Codex review 抓出，寫在此處避免下次重犯）：

1. **不能用 transition root 的 `opacity`** —— 會合成整個子樹，面板跟著淡掉而非實心滑動。遮罩因此改由 `.pv2-ds-scrim::before` 承載。同時避開另一陷阱：若改動 root 自己的 `background-color`，scoped 的 `.pv2-ds-scrim[data-v-…]`（0,2,0）specificity 高於 transition class（0,1,0），起始狀態會**靜默失效**。
2. **絕對定位的偽元素會蓋住面板** —— 堆疊順序中 `::before` 排第 8 步、未定位的 `.pv2-ds` 排第 4 步，導致面板被壓暗且點擊被吃掉。需**兩半都修**：`::before` 加 `pointer-events: none`、`.pv2-ds` 加 `position: relative`。只做其一仍是 bug。
3. **必須給 `<Transition>` 明確 `:duration="300"`** —— 兩個動畫層都不在 transition root 上，Vue 既無法由 root 的 computed style 推導時長，也收不到 `target === el` 的 transitionend（`@vue/runtime-dom` 的 `onEnd` 明確有此 guard）。需與 `--cd-duration-sheet` 保持一致。

**待 Zoe 環境驗收**（無自動化覆蓋，見下方「測試現況」）：
- 面板內「＋」按鈕與事件列必須點得到（不可變成關閉面板）← 驗證陷阱 2
- 面板不可看起來偏暗 ← 驗證陷阱 2
- 切週檢視 → 切回月檢視 → 點日期格，面板須照常打開 ← `Teleport defer` 時序迴歸

### ✅ 第三梯（除 #8、#11）— 既有動畫瑕疵

這梯與前兩梯的性質不同：不是「沒有動畫」，而是**已經在動、但動錯**。兩項都是純 CSS，互不相干，沒有 overlay 的掛載時序問題。

| # | 位置 | 改動 |
|---|---|---|
| **#13** | `Pv2HeaderNav.vue` | `.pv2-hn__seg` 補 `background-color` 過場（`--cd-duration-micro-1`，即計畫寫的 120ms），既有的 `:active` 換底色不再硬切 |
| — | `Pv2EventBlock.vue` | 進行中反白補過場：外框的 `background-color` / `color`，以及 `__time`、`__subs li` 的 `color` / `opacity`，四處同一時長 |

**Pv2EventBlock 的兩個要點：**

1. 這是全 app 唯一**非使用者觸發**的狀態變化 —— 由時鐘驅動，分鐘一跳就整格翻黑。沒人在操作卻看到畫面自己跳，讀起來像 bug 而不是狀態改變，所以這格比另外兩項更需要過場。
2. inline `:style` 綁的是 `background` 簡寫，但補間發生在解析後的 `background-color`，兩個值（`props.color` 與 `color-mix(…)`）都是純色所以可以內插。**若日後改綁漸層或帶 image 的簡寫，過場會靜默失效退回瞬變** —— 已用測試釘住這個綁定形狀。
3. 子元素（時間、subtask 行）的字色與 opacity 也是同一次翻面的一部分，時長必須與外框一致，否則外框先變、字慢半拍。

三個檔案各自補了 `prefers-reduced-motion` 區塊（scoped style，`app.css` 搆不進去）。

**測試：** `src/css/motion-existing-flaws.test.ts`（7 tests）。與 #0 同樣是靜態檔案內容斷言 —— 釘住過場宣告齊備、`:style` 綁定形狀未變、兩個 reduced-motion 區塊都在。這類修補在 diff 裡看起來像沒事發生，是最容易被下次改版靜默吃掉的一種。

**待真機驗收**（兩項都只改視覺過場，不改版面也不改行為，風險低，可與 #11 同一輪驗）：
- Week/Day 標題列的 TODAY 鈕：**按住不放**，底色應淡入而非閃一下
- Day 頁事件格跨進「進行中」的那一刻：整格（含時間與 subtask 行）應一起翻黑，不該有外框先變、字後變的落差 ← 需建一個一分鐘後開始的事件，留在 Day 頁等分鐘跳

⚠️ **量級要先講清楚：** 這梯全是 120–200ms 的顏色過場，**不會讓 app 變得明顯絲滑**（那是第一、二梯的事）。要特意盯著看才看得出來，看不出來不代表壞了。

---

## 未處理

### 第一梯 — overlay 轉場（同一根因：缺 `<Transition>` 層）

| # | 位置 | 問題 | 備註 |
|---|---|---|---|
| **#2** | `CdPopover.vue:138` | `.cd-popover` **零動畫**。這是桌面版 event preview / quick-add 的實際路徑 | 需另一組 class：`cd-popIn`（既有）+ `transform-origin` 錨定觸發點 |
| **#3** | `Pv2MonthSheet.vue`（掛載點 `MonthViewV2.vue:44-52`） | 第二個全無動畫的底部面板 | **可直接沿用 #1 的 `pv2-sheet` class**，但同樣要處理 `::before` 的兩個副作用 |
| **#4** | `CdSheet.vue:88` | 只有進場 `animation-name: cd-sheetUp`，**無退場**，且 keyframes 會從零重啟（不可中斷） | 改用 `<Transition>` + transitions |

### 第二梯 — 按壓回饋（#0 已鋪好前置條件）

⚠️ 這三個目前**完全沒有回饋** —— #0 拿掉灰方塊後，它們從「有灰方塊」變成「什麼都沒有」。若 Zoe 覺得按起來變空，這梯就升為最優先。

| # | 位置 | 現況 |
|---|---|---|
| **#6** | `Pv2BottomNav.vue` | 整個檔案 **0 個動畫宣告**。每天點幾十次，無按壓回饋；切頁籤時 `.pv2-nav__glyph--on` 的黑底白字瞬間跳換 |
| **#7a** | `Pv2WeekDayRow.vue:22-37` | 可點列，無回饋 |
| **#7b** | `Pv2EventBlock.vue:98` | `cursor:pointer` 但無回饋 |

修法統一：`:active { transform: scale(0.97) }` + 非對稱時序（按下 60ms、放開 160ms）。因 #0 的 boot file 已生效，純 CSS 即可在 iOS 上運作。

### 第三梯 — 既有動畫瑕疵

剩下兩項，**都不是「還沒做」而是「不該現在做」**。其餘兩項已完成，見上方。

| # | 位置 | 問題 | 為何擱著 |
|---|---|---|---|
| **#8** | `Pv2DayTabs.vue:58` | `transition: all 0.2s ease` → 應拆成具名屬性 | **這個元件現在沒有被掛載。** `DayViewV2.vue:17,41` 的 template 用法與 import 兩處都被註解掉（`TEMP: tabs hidden while the timeline rendering is reworked`），改了看不到也驗不了。**等 timeline 改完、tabs 恢復顯示時再一併處理** |
| **#11** | `Pv2Fab.vue:34` | `scale(0.94)` 略超出建議帶（0.95–0.98） | **待 Zoe 真機手感確認後再決定是否調整** —— 數字不一定是錯的 |

⚠️ **稽核清單的通病，留給後人：** 原稽核是 grep 出來的，**只證明程式碼存在，不證明它出現在畫面上**。#8 就是這樣混進清單的 —— 我第一次做這梯時直接照著改，改完才發現在叫 Zoe 去點一個不存在的按鈕。**動手前先確認掛載點**（`grep -rn '<元件名' src/` 且要排除被註解的行），這條對後面的 #2、#3 同樣適用。

---

## 明確排除

| 項目 | 原因 |
|---|---|
| **FocusSession 全部** | Zoe 明確指定不處理（長期有效）。原稽核的 #5 reduced-motion、#9 未具名 transition、#10 800ms 時長、#12 hover gating 皆屬此列 |
| **view 切換轉場** | **已完成**，非待辦 —— `2f41ea3` 已加 swipe 導航，`app.css` 有完整 `.pv2-slide-next/prev` 含 `prefers-reduced-motion` |
| `apple-design` skill 的 materials/translucency | 與 Zoe 的 neutral ink/paper 極簡方向不合 |

---

## 測試現況（重要）

**這一整塊沒有自動化覆蓋。** repo **沒有 `@vue/test-utils`**，`vitest.config.ts` 是 `environment: 'node'`，全 repo 零元件掛載測試。所以：

- overlay 的掛載/卸載/轉場行為**只能手動驗**
- `#0` 的 `ios-touch-feedback.test.ts` 與第三梯的 `motion-existing-flaws.test.ts` 都是靜態檔案內容斷言（禁 inline handler、CSS 屬性齊備、綁定形狀未變），不是行為測試 —— 它們擋的是**下次改版把修好的東西靜默改回去**，不是證明動畫好看
- 若要為第一梯的其餘項目建立自動化保障，需先引進元件測試基礎設施 —— 那是獨立決策，不應夾帶在動畫 PR 裡

現有 586 tests 的角色是**回歸保障**（確認沒弄壞既有東西），不驗證動畫本身。

⚠️ `npm run check:tokens` 目前有一筆既有失敗（`FocusSession.vue:478` 的 `#c98a2e`）。**與動畫無關、且 FocusSession 在「明確排除」清單內**，別誤以為是自己這輪弄出來的。

---

## 建議的工作順序

1. **先等 #1 的環境驗收結果** —— 手感若需調整，`--cd-duration-sheet` / `--cd-ease-standard` 是單點調整，會同時影響後續所有 sheet
2. #1 確認後 → **#3**（沿用同一組 class，成本最低）
3. 依 Zoe 對「按起來變空」的感受決定第二梯是否插隊
4. **#2** 需要自己的一組 class，獨立處理
5. ~~第三梯是零散修補，可併入任一輪~~ → **已做**（#8、#11 除外：#8 的元件現在沒掛載，#11 是手感問題不是工），可與 #11 一起在真機上驗

---

## 給下一個 session 的提醒

- **worktree**：`/Users/zoe/Documents/cadence/.worktrees/ios-touch-feedback`（目錄名沿用自 #0，現在分支是 `fix/day-sheet-transition`）。git 指令一律帶 `-C <worktree 絕對路徑>`，Bash CWD 會漂回主 repo
- **Zoe 本地 main 曾落後 origin/main 20+ commits** —— 稽核基準務必用 `origin/main`，否則會對著過期程式碼下判斷（本次已踩過：原稽核誤報 view 切換無轉場、overscroll 缺失，兩者其實都已修）
- **驗收只能在真機** —— 桌面測不出 iOS 觸控行為，也看不出掉幀。`deploy.yml` 只在 push 到 `main` 時觸發，PR 無預覽環境，所以環境驗收需先合併
- **commit gate**：Codex review 是必經步驟（`/build` skill 會跑三軸）；plan 檔另有 Stop hook 強制 `codex-peer-review`

## Suggested skills

| Skill | 用途 |
|---|---|
| `improve-animations` | 重跑稽核或為某一項產出實作計畫（`plan <描述>`）。`reconcile` 可重新核對本清單與現況 |
| `animate` | 從零建一個動畫時走決策 gate（該不該動 → 目的 → 工具 → 屬性 → 曲線） |
| `review-animations` | 對完成的動畫 diff 做嚴格審查 |
| `emil-design-eng` | 查 easing / duration 的具體數值判準 |
| `/build` | 實作 + Codex 三軸審查（停在 commit 前） |
| `/worktree` | 開新 worktree 或沿用既有的 |
