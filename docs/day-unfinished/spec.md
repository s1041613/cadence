# Day 檢視 · 未完成待辦面板

日檢視標題列右側多一顆切換鈕，打開「比這一天早、而且還沒打勾」的待辦清單；
每一列可以移到這一天，或刪掉。

畫面在 `*.dc.html`（由 `build-artboards.mjs` 產生，同 `docs/month-filter-design/` 的做法）：

| 檔 | 畫面 |
| --- | --- |
| `Main.dc.html` | 收合（預設） |
| `Expanded.dc.html` | 展開，三筆逾期 |
| `Confirm.dc.html` | 刪除的就地確認 |
| `Undo.dc.html` | 移到今天之後的 toast |
| `Empty.dc.html` | 沒有逾期時的標題列 |
| `MultiSelect.dc.html` | 替代方案 B（多選 + 底部動作列） |
| `Anatomy.dc.html` | 尺寸、色票、資料規則 |
| `Many.dc.html` | 15 筆時的面板（截到 4 列） |
| `Sheet.dc.html` | 全部未完成 · sheet |
| `SheetSelect.dc.html` | sheet 的選取模式 |

## 切換鈕

擺在 `Pv2DayHeader` 的右側叢集，`Pv2HeaderNav`（TODAY）左邊，gap 8。
與 TODAY 同高（28）、同圓角、同陰影——標題列已經有一套藥丸語彙，這顆沿用，
而不是另外做一顆月檢視那種玻璃分段鈕：月的 `Pv2TypeSwitch` 是「兩份內容二選一」，
這裡是「一塊面板開或關」，形狀不該一樣。

| | |
| --- | --- |
| 內容 | 未打勾清單 glyph（24 grid、stroke 1.9 round，與 nav icon 同族）+ 逾期筆數 |
| 關閉態 | 白底、`0 2px 6px rgba(0,0,0,.06)`、`--pv2-ink-2` |
| 開啟態 | `rgba(222,110,140,.12)` 底、`rgba(222,110,140,.38)` 邊、`#A8425E` 墨 |
| 命中區 | 44×44，用 `::after` 撐出來，不改版面（同 `Pv2TypeSwitch__seg`） |
| 筆數 0 | 整顆不 render |

`#A8425E` 不是 `--pv2-accent`：`#DE6E8C` 在白底只有 3.1:1，這顆鈕裡有 11px 的數字，
過不了 4.5:1。月檢視那顆是純 icon 所以用得下去。這個角色建議進 `cadence-tokens.css`
（`--pv2-accent-ink`），不要散在元件裡。

## 面板

長在 header 與時間軸之間，白卡、圓角 18、`--pv2-line-soft` 邊、`margin: 16px 22px 0`。
時間軸是 flex:1，面板一開它自己會縮，不需要額外的 layout 處理。

面板**永遠不捲動**：最多 5 列（≤5 筆時全部畫出來），超過就只畫 4 列，
第 5 列換成「還有 N 筆 · 查看全部」，開 sheet。理由見下面「很多筆的時候」。

- 面板頭：`UNFINISHED · N`（600 11 mono、`--pv2-ink-3`，與 `ALL-DAY` 同一個標籤語彙）
  + 「全部移到今天」文字鈕 + 收起 chevron。
- 列：3px 象限色條 ／ 標題（600 14/18，單行 ellipsis）／ 副標
  （`09/16 · 逾期 3 天`，500 10.5 mono）／ 兩顆 32×32 動作鈕。
- 「移到今天」是主要動作（accent tint 底），「刪除」是安靜的（透明底、灰墨）。

## 很多筆的時候

逾期是會累積的：一個月沒整理就可能三十筆。一個 232px 的內捲區在那個量級下沒有用——
它在時間軸上面挖了一個小洞，讓你用四列的視窗去捲三十筆，而且捲動巢狀在頁面裡。
所以面板不吃這個量，它把量交出去。

**≤5 筆** → 面板全部畫出來，每列兩顆鈕，這是日常情況。
**>5 筆** → 面板畫 4 列（最近逾期的優先），第 5 列是「還有 N 筆 · 查看全部」，開 sheet。

sheet 用現成的 `Pv2DaySheet` 語彙（scrim + handle + 圓角 28 + teleport 到頁框）。
DayPageV2 的 `data-poster-root` 目前沒有 id，要補一個 `#dp2-root`，MonthPageV2 是 `#mp2-root`。

sheet 裡：

- 按逾期距離分組，sticky 組標題：`昨天 · 2` / `本週 · 4` / `更早 · 9`。
  分組不是裝飾——「昨天忘了打勾」和「三週前就放生了」是兩件事，混在一條長清單裡
  只會讓整份都變成噪音。
- 每組標題右邊一顆「整組移到今天」。最高價值的動作是「把昨天的搬過來」，
  它應該是一次點擊，不是勾五次。
- 「更早」預設收起。數字照算進鈕上的 badge，不偷偷藏——收起的是視線，不是事實。
- 右上「選取」進多選模式：圓形 checkbox + 底部「移到今天 · N」/ 刪除。
  這就是原本的替代方案 B，它在長清單下才成立，所以它變成 sheet 的一個模式，
  而不是面板的另一種長相。

badge 的數字照實顯示，不截成 `9+`。難看正是重點；`9+` 會讓 47 筆和 10 筆長得一樣。

## 資料規則

納入：`type === 'quadrant' && !done && date < 檢視中的日期`，
且 `calendarsStore.isVisible(calendarId)`，且 `ownerId` 是自己
（別人的列在這個 app 裡本來就唯讀，放進一個「動作面板」只會給出按不動的鈕）。
排序 `date` 由舊到新，同日照 `start`。

逾期是相對「正在看的那一天」算的，不是相對今天。往前滑到上週四，面板算的就是
那天之前還沒做完的事，動作的字也跟著變成「移到這天」。理由是日檢視本來就是
可以左右滑的，錨定在今天的話，滑開之後那顆鈕的數字會跟畫面上的日期對不起來。

- 移到今天：`date = 檢視中的日期`，`endDate` 同步平移，`start`/`end`/`allDay` 原樣保留。
  走現成的 `tasksStore.saveTask`。
- 刪除：`tasksStore.deleteTask`（已有樂觀更新 + 失敗回滾 + 重試 toast）。

## 回饋

- 移到今天 → toast「N 筆已移到今天」+ 復原。
  `ui-store` 的 `Toast` 目前只有 `type` / `message`，要加一個 optional 的 action
  （`{ label, run }`），toast 元件跟著長一顆鈕。
- 刪除 → 不用 toast，列就地換成「刪除「X」？ ／ 取消 ／ 刪除」。
  刪除在這裡是真的刪掉一筆遠端資料，兩段式比事後復原誠實，也比再擴一次 toast 便宜。
- 最後一列處理完 → 面板自己收起，切換鈕消失。
- 開關狀態放 `ui-store` 的 ref，不同步、不持久化——理由同 `monthFilter`：
  這是「畫面現在的樣子」，不是帳號帶著走的偏好。

## a11y / 動態

- 切換鈕 `aria-pressed`，面板 `role="region"` + `aria-label="未完成待辦"`。
- icon-only 的動作鈕都要 `aria-label`（含標題，例如「把『訂下週的牙醫』移到今天」）。
- 高度 200ms `var(--cd-ease-standard)`；`prefers-reduced-motion` 直接切換。

## 沒採用的：面板本身就是多選（`MultiSelect.dc.html`）

每列一顆圓形 checkbox、底部一條「移到今天 · 2」+ 刪除，取代每列的兩顆鈕。
批次很有效率，但它逼著每一次展開都先進出一個「選取模式」，而常見情況是兩三筆——
兩三筆用勾的比直接按還慢。
所以多選沒有消失，它搬到 sheet 裡（`SheetSelect.dc.html`）：量大的時候才需要它，
量大的時候才付得起那個模式的代價。

## 實作會動到的檔

- `src/components/v2/ui/Pv2DayHeader.vue` — 右側叢集多一顆鈕 + 一組 props/emit。
- `src/components/v2/day/DayViewV2.vue` — 開關 state、面板掛載位置。
- `src/components/v2/day/DayUnfinished.vue`（新）— 面板本體。
- `src/components/v2/day/DayUnfinishedSheet.vue`（新）— 全部未完成的 sheet。
- `src/pages/DayPageV2.vue` — 頁框補 `id="dp2-root"` 給 sheet teleport。
- `src/utils/group-by-recency.ts` — 形狀對得上（Today / Yesterday / Previous 7 Days），
  但它鎖死 `createdAt`、而且把 7 天以上的直接丟掉，這裡不能丟。
  要嘛把它泛化（取 key 的函式 + 第四個 bucket），要嘛寫一支姊妹函式；
  不要兩份各自漂移的分組邏輯。
- `src/stores/ui-store.ts` — `Toast` 加 action。
- `src/css/cadence-tokens.css` — `--pv2-accent-ink`。
