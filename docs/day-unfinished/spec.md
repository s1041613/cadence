# Day 檢視 · 未完成待辦

日檢視標題列右側一顆切換鈕，數字是「比這一天早、而且還沒打勾」的待辦數。
按下去，一張 sheet 由下往上長出來，**浮在日檢視上面、不推擠它**，
**高度固定**——3 筆和 30 筆打開來一樣高。
裡面是**全部**的逾期待辦——不截斷、不收合、不用再點一次。
每一列可以移到這一天，或刪掉。

畫面在 `*.dc.html`（由 `build-artboards.mjs` 產生，同 `docs/month-filter-design/` 的做法）：

| 檔 | 畫面 |
| --- | --- |
| `Main.dc.html` | 收合（預設） |
| `SheetShort.dc.html` | 3 筆：一樣的高度，下面留白 |
| `SheetAll.dc.html` | 15 筆：一樣的高度，清單自己捲 |
| `Confirm.dc.html` | 刪除的就地確認 |
| `SheetSelect.dc.html` | 選取模式 |
| `Undo.dc.html` | 移到今天之後的 toast |
| `Empty.dc.html` | 沒有逾期時的標題列 |
| `Anatomy.dc.html` | 尺寸、色票、資料規則 |
| `Rejected-Panel.dc.html` | 沒採用 A：內嵌面板 |
| `Rejected-Capped.dc.html` | 沒採用 B：內嵌面板 + 截斷 |

## 切換鈕

擺在 `Pv2DayHeader` 的右側叢集，`Pv2HeaderNav`（TODAY）左邊，gap 8。
與 TODAY 同高（28）、同圓角、同陰影——標題列已經有一套藥丸語彙，這顆沿用，
而不是另外做一顆月檢視那種玻璃分段鈕：月的 `Pv2TypeSwitch` 是「兩份內容二選一」，
這裡是「開一張清單」，形狀不該一樣。

| | |
| --- | --- |
| 內容 | 未打勾清單 glyph（24 grid、stroke 1.9 round，與 nav icon 同族）+ 逾期筆數 |
| 關閉態 | 白底、`0 2px 6px rgba(0,0,0,.06)`、`--pv2-ink-2` |
| 開啟態 | `rgba(222,110,140,.12)` 底、`rgba(222,110,140,.38)` 邊、`#A8425E` 墨 |
| 命中區 | 44×44，用 `::after` 撐出來，不改版面（同 `Pv2TypeSwitch__seg`） |
| 筆數 0 | 整顆不 render |

數字照實顯示，不截成 `9+`。難看正是重點：`9+` 會讓 47 筆和 10 筆長得一樣。

`#A8425E` 不是 `--pv2-accent`：`#DE6E8C` 在白底只有 3.1:1，這顆鈕裡有 11px 的數字，
過不了 4.5:1。月檢視那顆是純 icon 所以用得下去。這個角色建議進 `cadence-tokens.css`
（`--pv2-accent-ink`），不要散在元件裡。

## sheet

由下往上，**absolute 浮在頁框裡，不參與 `.dv2__body` 的 flex column**，
所以時間軸的高度、捲動位置、ALL-DAY 列一格都不會動。這是它跟內嵌面板最大的差別：
面板是版面的一部分，開了就得從別人身上拿高度；sheet 只是蓋上去。

沿用 `Pv2DaySheet` 的語彙（scrim + handle + 圓角 28 + teleport 到頁框）。
DayPageV2 的 `data-poster-root` 目前沒有 id，要補一個 `#dp2-root`，MonthPageV2 是 `#mp2-root`。

**固定高度：頁框高的 50%**（393×852 上是 426）。跟內容無關，跟拖曳無關，
每次打開都長一樣。50% 不是新數字——`Pv2DaySheet` 已經是 `height: 50%`，
全 app 只有一個 bottom sheet 高度；差幾個點的第二個高度只會看起來像做錯。

- 裝不下 → 清單自己捲，組標題 sticky。
- 裝得下 → 下面就是留白。**穩定比貼合重要**：每次打開高度都一樣，
  肌肉記憶才建立得起來，鈕的位置、第一列的位置、時間軸剩多少都是可預期的。
- 往下拖關掉（`Pv2DaySheet` 已有 `v-touch-swipe.down`）。**沒有第二段高度**，
  往上拖不會變高。

捲動只發生在 sheet 裡，底下的時間軸這時候被 scrim 蓋住，不存在兩層捲動打架的問題。

高度寫 `height: 50%` 而不是 `50vh`。sheet 的 scrim 是 `position: absolute; inset: 0`
掛在頁框裡，`%` 量的是頁框；`vh` 量的是視窗，在桌面的 device frame（393×852 固定尺寸）
底下會量到整個瀏覽器高度，sheet 會爆出框外。

**分組**：按逾期距離分成 `昨天` / `一週內` / `更早`，**全部展開，沒有收合**。
（設計稿原本寫「本週」，實作改成「一週內」：桶子是「2–7 天前」，
在週一看「本週」會指到錯的東西。）
分組不是為了藏東西，是為了讓「昨天忘了打勾」跟「三週前就放生了」在視覺上分得開——
混成一條長清單會讓整份都變噪音。每組標題右邊一顆「整組移到今天」：
最高價值的動作是「把昨天的搬過來」，它該是一次點擊。

頂層**沒有**「全部移到今天」。15 筆的時候那顆鈕會把 32 天前的東西一起丟進今天，
批次要有選擇性，所以走右上的「選取」模式：圓形 checkbox + 底部「移到今天 · N」/ 刪除。

## 資料規則

納入：`type === 'quadrant' && !done && date < 檢視中的日期`，
且 `calendarsStore.isVisible(calendarId)`，且 `ownerId` 是自己
（別人的列在這個 app 裡本來就唯讀，放進一個「動作面板」只會給出按不動的鈕）。
組內 `date` 由新到舊（剛逾期的在上面，和三個桶子本身的順序同向），同日照 `start` 由早到晚。

**沒有筆數上限，也沒有回看天數的上限。** 三十筆就是三十筆，捲下去看得到。

逾期是相對「正在看的那一天」算的，不是相對今天。往前滑到上週四，算的就是
那天之前還沒做完的事，動作的字跟著變成「移到這天」。理由是日檢視本來就可以左右滑，
錨定在今天的話，滑開之後那顆鈕的數字會跟畫面上的日期對不起來。

- 移到今天：`date = 檢視中的日期`，`endDate` 同步平移，`start`/`end`/`allDay` 原樣保留。
  走現成的 `tasksStore.saveTask`。
- 刪除：`tasksStore.deleteTask`（已有樂觀更新 + 失敗回滾 + 重試 toast）。

分組要一支按「逾期幾天」分桶的函式。`src/utils/group-by-recency.ts` 形狀對得上
（Today / Yesterday / Previous 7 Days），但它鎖死 `createdAt`、而且把 7 天以上的直接丟掉，
這裡不能丟。要嘛把它泛化（取 key 的函式 + 第四個 bucket），要嘛寫一支姊妹函式；
不要兩份各自漂移的分組邏輯。

## 回饋

- 移到今天 → toast「N 筆已移到今天」+ 復原。
  **不動 `ui-store` 的 `Toast`**：那個 ref 從來沒有被任何元件 render 過
  （全 repo 只有兩處寫入、零處讀取），真正會出現在畫面上的 toast 是
  `src/lib/notify.ts` 走 Quasar Notify。所以 undo 加在那裡：`notifyUndo(message, undo)`，
  和既有的 `notifySyncError(message, retry)` 同一個形狀。
  `ui-store.Toast` 的死碼留著沒清，不在這次範圍內。
- 刪除 → 不用 toast，列就地換成「刪除「X」？ ／ 取消 ／ 刪除」。
  批次刪除同理，確認出現在底部那條動作列裡——使用者正在看的就是那條。
  刪除在這裡是真的刪掉一筆遠端資料，兩段式比事後復原誠實，也比再擴一次 toast 便宜。
- 最後一筆處理完 → sheet 自己關掉，切換鈕消失。
- 開關狀態放 `ui-store` 的 ref，不同步、不持久化——理由同 `monthFilter`：
  這是「畫面現在的樣子」，不是帳號帶著走的偏好。

## a11y / 動態

- 切換鈕 `aria-pressed`，sheet `role="dialog"` + `aria-label="未完成待辦"`。
- icon-only 的動作鈕都要 `aria-label`（含標題，例如「把『訂下週的牙醫』移到今天」）。
- sheet 進出沿用 `pv2-sheet` transition（app.css，300ms）。
  只有「開 / 關」兩個狀態，沒有中間段要吸附。
- `prefers-reduced-motion` 直接切換。

## 沒採用的：內嵌面板

`Rejected-Panel.dc.html` / `Rejected-Capped.dc.html`。
一張卡片長在 header 與時間軸之間，是最早的版本。兩個問題：

1. **它擠壓時間軸。** 面板是版面的一部分，一開就從時間軸身上拿走高度，
   本來看得到的時段被推下去。日檢視的主角是那條時間軸，不該被一個輔助清單推著走。
2. **它撐不住量。** 為了不把時間軸吃光，面板得設高度上限，於是要嘛內捲
   （在頁面裡挖一個四列高的洞去捲三十筆），要嘛截斷再給一顆「查看全部」
   （多一次點擊，而且在那之前你看不到全部）。

sheet 兩個都解決：浮著所以不擠壓，固定高度加內捲所以裝得下。
多選也從面板搬進 sheet——量少的時候勾選比直接按還慢，量大的時候才付得起那個模式的代價。

## 實作

已實作。動到的檔：

| 檔 | |
| --- | --- |
| `src/components/v2/day/DayUnfinishedSheet.vue` | 新。sheet 本體，含就地確認與選取模式 |
| `src/composables/use-unfinished.ts` | 新。逾期清單的單一來源，header 的數字和 sheet 的內容共用 |
| `src/utils/overdue-buckets.ts` | 新。分桶（昨天 / 一週內 / 更早） |
| `src/utils/move-task-to-date.ts` | 新。重新掛日期，多日跨度整段平移 |
| `src/components/v2/ui/Pv2DayHeader.vue` | 右側叢集多一顆鈕 |
| `src/components/v2/day/DayViewV2.vue` | 開關 state、sheet teleport |
| `src/pages/DayPageV2.vue` | 頁框補 `id="dp2-root"` |
| `src/lib/notify.ts` | `notifyUndo` |
| `src/css/cadence-tokens.css` | `--pv2-accent-ink` |

`group-by-recency.ts` 沒有動：它鎖死 `createdAt`、對齊「今天」、而且刻意丟掉 7 天以上的
（筆記本沒有那一組）。這裡三件事都不一樣，尤其是「不能丟」——一筆逾期待辦從清單上消失，
看起來就像已經處理掉了。所以是姊妹函式，`overdue-buckets.ts` 的檔頭註明了兩者的分界。

測試：`overdue-buckets.test.ts`、`move-task-to-date.test.ts`（純函式），
`DayUnfinishedSheet.wiring.test.ts`（釘住固定高度、不截斷、accent 用可讀墨色、
teleport 目標對得上頁面的 id——這些在 diff 裡看不出來，改壞了也不會有人發現）。

**沒有跑過真的 app。** auth guard 擋在 Supabase 前面，這個環境沒有憑證，
所以驗證只到 `npm test`（1042 passed）、`vue-tsc --noEmit`、`quasar build` 為止。
畫面實際長相請自己跑一次。
