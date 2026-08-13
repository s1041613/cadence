# Research — Timeboxing 用在 Cadence 上能帶來什麼

Branch: `claude/timeboxing-life-week-5rgbzq` · Status: research notes（尚未做任何產品決策）
· 前篇：[Timeboxing 與 My Life in Weeks](./timeboxing-and-life-in-weeks.md)

## TL;DR

Timeboxing 對 Cadence 的意義不是「再加一個功能」，而是一次**定位升級**：
從「記錄行程的行事曆」變成「**規劃時間怎麼花**的工具」。
而且盤點現有程式碼後發現：**Cadence 已經擁有大部分的積木**，
缺的不是新系統，而是把積木**接成一個迴路**：

> **計畫**（把任務放進時間盒）→ **執行**（番茄鐘跑這個盒）→ **回顧**（預估 vs 實際）

---

## 1. 盤點：Cadence 已有的 timeboxing 積木

| Timeboxing 需要的元素 | Cadence 現況 | 出處 |
|---|---|---|
| 有起訖時間的盒子 | ✅ `Task` 已有 `date` / `start` / `end` | `src/types/task.ts` |
| 預估（盒子多大） | ✅ `estimatedPomodoros` 欄位已存在 | `src/types/task.ts` |
| 實際（真的花多久） | ✅ `completedPomodoros` 欄位已存在 | `src/types/task.ts` |
| 執行計時器 | ✅ Focus 番茄鐘，絕對時間戳計時、結束提示音、超時背景變色 | `src/stores/focus-store.ts`、`docs/focus/HANDOFF.md` |
| 未排程的任務池 | ✅ Inbox | `src/stores/inbox-store.ts` |
| 優先級 | ✅ 四象限 `important` / `urgent` | `src/types/task.ts` |
| 到時提醒 | ✅ `reminder` presets | `src/types/task.ts` |
| 呈現盒子的時間軸 | ✅ Day / Week 視圖 | `DayPageV2` / `WeekPageV2` |

換句話說，資料模型幾乎不用動。問題在這些積木目前是**互不相認的孤島**：
番茄鐘不知道行事曆上排了什麼，Inbox 的任務沒有自然的路徑變成時間軸上的盒子，
`estimatedPomodoros` 填了之後沒有任何回饋迴路使用它。

## 2. 缺口：三段迴路各缺一塊

### 2.1 計畫 — Inbox → 時間軸的「排程動作」

Timeboxing 的核心動作只有一個：**把 to-do 搬進行事曆**（HBR 調查 100 種生產力
技巧中排名第一的就是這件事）。對 Cadence 來說：

- 讓 Inbox 任務可以**拖到 Day/Week 時間軸上**，落地即生成有起訖的盒子；
  `estimatedPomodoros` 已可換算預設長度（N × 25 分 + 休息）。
- 反向也成立：時間軸上的空隙可以「從 Inbox 挑一件放進來」。
- 四象限在這裡有了新用途：**排程順序建議**——important+urgent 先佔盒子，
  排不進去的自動往後——四象限從靜態分類變成排程引擎的輸入。

**帶來什麼**：使用者打開 Cadence 不再只看到「約好的事」，而是完成了
「今天的時間怎麼分配」這個決策。這是 to-do app 和行事曆 app 都做不到的中間地帶。

### 2.2 執行 — 番茄鐘與排程任務打通

Focus 番茄鐘目前是獨立計時器。接起來的樣子：

- 時間軸上的盒子到點時，提供「開始 Focus」的入口——排程（計畫盒）
  直接餵給番茄鐘（執行盒）。
- Focus 完成的番茄**自動回填**該任務的 `completedPomodoros`——
  這個欄位終於有了自動資料來源，不必手填。
- 已有的超時背景變色機制，正是 timeboxing「軟盒」哲學的現成實作：
  提醒但不強制切斷。

**帶來什麼**：行事曆從「計畫的紀錄」變成「實際時間流向的紀錄」。
市場上番茄鐘 app 很多、行事曆 app 很多，兩者真正打通的產品很少
（Sunsama / Akiflow 做了任務排程但沒有執行計時；TickTick 有番茄鐘
但與行事曆脫節）——這是 Cadence 現成積木拼得出來的差異化。

### 2.3 回顧 — 預估 vs 實際的迴路

有了 2.1 和 2.2，回顧幾乎是免費的：

- **週回顧**：本週預估 N 顆番茄、實際完成 M 顆；哪些任務常態性爆估。
  Week 視圖天然是這個報告的容器（週 = 個人 sprint）。
- 長期下來這是使用者**估時能力的校準器**（對抗 planning fallacy）——
  timeboxing 文獻中公認最有價值、也最少產品真正做的一環。

**帶來什麼**：留存理由。計畫工具的黏性來自「我的歷史資料在這裡」；
預估 vs 實際的累積紀錄是別的 app 帶不走的。

## 3. 次要機會（迴路之外）

- **一天的排滿度**：Day 視圖顯示「已排程 %」，超過 ~80% 給溫和警示——
  對應 DSDM「Must have ≤ 60%、保留洩壓閥」的原則。留白是功能，不是空白。
- **與 Life in Weeks 的接點**（見前篇）：人生週曆的一格點進去就是 Week 視圖；
  週回顧的資料讓每一格有內容可寫（「這格人生花在什麼上」）。
  微觀的番茄與宏觀的 4,680 格，用同一個「格子」隱喻貫穿——
  這是 Day → Week → Month → Life 縮放階層的最後一層。

## 4. 建議的切入順序

最小可用的迴路是 **2.1 的一半 + 2.2 的一半**：

1. Inbox 任務可拖上時間軸（估時 → 預設長度）
2. 盒子上的「開始 Focus」入口 + 番茄自動回填 `completedPomodoros`
3. Week 視圖的預估 vs 實際小結（先做唯讀統計即可）

每一步都各自可交付、可獨立驗收；資料模型異動趨近於零（主要是 UI 與 store 的接線）。
四象限排程建議、排滿度、Life in Weeks 海報都可以之後再開盒。

---

*註：本文件是研究筆記，具體功能範圍與 UI 需另開 spec（參照 `docs/time-wheel/spec.md` 的格式）。*
