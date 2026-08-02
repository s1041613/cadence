# Focus / 番茄鐘 重構 — Handoff

**Worktree**：`/Users/zoe/Documents/cadence/.worktrees/v2-bottombar-restyle`
**Branch**：`feat/v2-bottombar-restyle`
**日期**：2026-07-31
**狀態**：重構已完成並 commit；有一個**未決的設計問題**擋著後續（見第 4 節）

---

## 1. 這輪做完了什麼

兩個 commit，都已進 branch、工作區乾淨：

| Commit | 內容 |
|---|---|
| `bdd61fd` | 番茄鐘重構主體（架構＋計時正確性＋提示音＋小 bug） |
| `ed773f2` | 超時背景變色（溫和提醒） |

### 起因：Zoe 回報的兩個痛點

1. **「時鐘關閉會從第一顆番茄重新倒數」** —— 稽核後發現有**兩個獨立成因**：完全沒有持久化，加上 `FocusSession` 被複製掛在四個頁面各自的 template，切換月／週／日檢視就會 unmount 重建。第二條她原本沒察覺。
2. **「結束變成休息時沒有提醒或聲音」** —— 程式裡完全沒有任何通知程式碼。

另外稽核找到 3 個確定 bug（背景分頁計時漂移、`estPoms` 不同源、`anotherPomodoro` 死碼守衛）。

### 架構變更

- **計時真相**從「元件內的剩餘秒數」改成**絕對時間戳**，存 localStorage（key `cadence.focus.session`）
- **掛載點**從四個頁面收斂到 `MainLayout.vue` 單一處，路由切換不再 unmount
- **邏輯外提**到純函式 reducer，元件降為投影（630 → 約 300 行）

### 新增檔案

| 檔案 | 性質 | 說明 |
|---|---|---|
| `src/utils/focus-timer.ts` | 純函式（**主要接縫**） | reducer。不 import vue/pinia/localStorage，`now` 一律當參數傳入 |
| `src/stores/focus-store.ts` | Pinia | 持有狀態、讀時鐘、讀寫 localStorage、執行 effects |
| `src/utils/make-focus-chime.ts` | 副作用 | 提示音，**自有 AudioContext** |
| `src/utils/breathing-curve.ts` | 純函式 | 呼吸動畫數學 + 呼吸次數邊緣偵測 |

各自都有 `.test.ts`。**測試共 359 個全過**，`vue-tsc` 無錯，production build 成功。

---

## 2. 關鍵設計決策（改動前務必先讀，這些都有原因）

### 2.1 running / paused 是兩種不同型別，不是一個 paused 布林

```ts
RunningSegment = { status: 'running', endsAt: number }    // 絕對終點
PausedSegment  = { status: 'paused', remainingMs: number } // 凍結餘額，不參照時鐘
```

這是「暫停中關掉分頁、隔天回來」能正確運作的原因 —— 暫停狀態根本不看時鐘。

**`PausedSegment.remainingMs` 恆 > 0**：`pause()` 在 `remaining <= 0` 時會**推進階段而非產生 0 秒暫停段**。少了這條，已過期的計時被暫停會卡在 00:00 直到 resume 才瞬間跳完。

### 2.2 提示音必須用自己的 AudioContext

`make-focus-audio.ts`（環境音）**不能共用**，有兩個陷阱：
- `fadeOut()` 把 master gain 歸零且**永不還原**，而它在計時一開始就被呼叫 → 番茄結束時 master 早已是 0
- `pause()` 呼叫 `ctx.suspend()` 停掉整個 context

**任何走錯 context 的實作會是完全無聲而不是報錯**，很難察覺。`make-focus-chime.ts` 的檔案註解有寫明「Do not helpfully merge these two modules」。

### 2.3 breathing / done 不參與 expiry 判定

`projectFocus` 的 `expired` 只在 `focus`／`rest` 階段才可能為 true。

**這是實作中抓到的真 bug**：`startSession` 建立的 breathing 段 `endsAt = now`，所以一開始就回報 `expired: true`，watcher 因此latch 在 true，番茄真正結束時看到 `true → true` 什麼都不會觸發 —— **番茄鐘永遠不會進入休息**。純 reducer 測試看不到，是 store 接線測試抓出來的。

### 2.4 `close()` 的防遞迴三件套

`ui.focusTaskId` 是入口意圖，`focus.state` 是生命週期，靠單向 watch 連接。因為 `close()` 也會清 `ui.focusTaskId`，watch 會再次觸發 `close()`。防法**三者缺一不可**：

1. `stopSession()` 冪等（`if (state === null) return`），且**永不碰** `ui.focusTaskId`
2. `close()` 先清 state 再清 id
3. `start()` 對同一 taskId early-return

有專門的 store 測試守著（`focus-store.test.ts` 的 "watcher contract"）。

### 2.5 doneCount 不存 localStorage

一律從 `task.completedPomodoros`（DB 同步的真相）推導。理由：使用者可能在別的裝置做過番茄，信 localStorage 會顯示過期數字，並可能讓上限判斷出錯（顯示 1/3 但其實已 3/3 → 允許再開 → `Math.min` 靜默不加 → 做白工）。

### 2.6 超時一律丟棄，不詢問

還原時若已過結束時間，**安靜清除、不計番茄、不彈窗**。Zoe 明確決定（原因：不想被打擾，也不想讓番茄統計灌水）。

### 2.7 其他

- **靜音按鈕已整顆移除**（Zoe 要求），`FocusAudio` 介面的 `toggleMute` 也拿掉了
- **z-index 4000** —— 蓋過 Quasar drawer（~3000）但低於 dialog（~6000），有寫理由在 CSS 註解
- **提示音解鎖**：任何點擊都會 `unlock()`。還原後在使用者互動前就到期的 session **無法保證有聲音**（瀏覽器 autoplay policy 硬限制），畫面會顯示「點一下畫面以啟用提示音」

---

## 3. 明確不做的（Out of Scope，Zoe 已決定）

- **迷你視窗 / Document PiP** —— Zoe 明確說不做
- **Web Notification / 分頁標題倒數 / 震動** —— 本輪只做提示音
- **持久化的重試佇列** —— 同步失敗後重整，該次番茄計入會消失。明確接受，理由是 `toggleDone` 等寫入都是同一個樂觀模式，單為番茄鐘做一套會不一致；要解應是 `tasks-store` 層級的離線佇列
- **jsdom / @vue/test-utils** —— 維持專案既有的純邏輯測試形態

---

## 4. ~~未決的設計問題~~ → 已於 2026-08-02 結案

### 結論：入口限制整個不做，A / B / C 三個方向都不採用

Zoe 的裁決：**「未完成的應該要移動到某一天繼續做才對」**。

這推翻了整節的前提 —— 原本在問「逾期的事要不要擋、怎麼補做」，但她的產品模型是**逾期的事根本不該留在原地**，該搬到未來某天。A 的「補做」語意在這個模型下是多餘甚至誤導的，所以連 A 也不做。

這正好是本節調研裡 Sunsama 的作法（rollover 搬到今天，而非禁止）—— 當時只當旁註寫，實際上它才是主線。

| 方向 | 結論 |
|---|---|
| A（改語意「補做」） | ❌ 不做 —— 模型是搬移不是補做 |
| B（detached session） | ❌ 不做 |
| C（番茄數手動覆寫＋凍結） | ❌ 不做 —— Zoe：「番茄數會跟著事件時段跳動 → 沒差」 |
| 舊答案「按鈕顯示為停用」 | ✅ 作廢 |

### 這輪實際做的兩件事

1. **all-day 不顯示「開始專注」按鈕**（Zoe：「all-day 沒有番茄功能」）。兩張 preview card 的 `v-if` 加 `!allDay`，兩個 popover 傳 `:all-day="task.allDay"`。
   **性質是防守性的**：存檔路徑已強制 quadrant task 的 `allDay = false`（`EventPreviewPopover.vue` / `EventPreviewPopoverV2.vue` 的 `saveEdit`），正常流程產生不出 all-day task。這道防的是 `tasks-store.ts:15` `createTask` 的 `overrides.allDay` 缺口。
2. **`FocusSession.vue` 全面英文化**（21 個字串）。系統預設是英文介面，原本整支番茄鐘 UI 是中文，是全站少數的中文 UI。用語照業界慣例（`Short break`、`Start another pomodoro`、`Focus · Pomodoro`）。
   `notifySyncError` 那批 18 個中文 toast **刻意不動**（Zoe 明確排除），所以全站 toast 目前仍是中英混用（`Pv2SettingsNotifications.vue:112` 已是英文）。

### 📌 未來規劃：rollover（搬到某一天）

Zoe 自己規劃，**這輪不做，repo 裡也完全沒有任何實作**（搬移目前只能手動在 edit card 改日期）。

真的要做時，以下兩題必須先答（本輪問了但她擱置）：

1. **自動還是手動？** 手動（逾期事件上出現「移到今天」按鈕，改 `date` 走既有 `saveTask`）技術上很小、不用新表；自動 rollover 要處理「什麼算未完成」、重複事件、跨裝置誰負責搬（每台裝置開 app 都搬一次會打架）。
2. **搬移後已完成的番茄數保留還是歸零？** 現在 `completedPomodoros` 累積在 task 上，若搬移只改 `date` 則**預設保留**（1/3 繼續做），要歸零得額外寫。

---

### 以下為原始記錄（決策過程，保留備查）

### 問題

Zoe 原本要求：**「現在時間如果已經超過結束時間不應該可以開啟番茄時鐘」**

但她接著反問：**「我在想任務需要綁定番茄時鐘嗎？」** 並要求評估綁定的利弊。**所以入口限制沒有實作，等她決定方向。**

### 目前的矛盾狀態（重要）

- **已開始的 session 超時** → 不擋，只變背景色（`ed773f2` 已實作）
- **入口是否要擋** → **未決**

兩邊方向相反。這是因為我先做了超時提醒才做調研，順序反了。

### 調研結論

**業界零家產品會因為「超過結束時間」而禁止開始計時。** 查證涵蓋 TickTick、Sunsama、Toggl、Motion、Google Calendar、Forest、Pomofocus、Focus To-Do。

最接近的是 Toggl：不自動幫過去的事件建記錄，但**手動點過去的事件仍可開始計時** —— 分界是「自動化不越界，手動操作不設限」。

Sunsama 最值得參考（模型最像 Cadence，行事曆時段長度決定 planned time）：超時不封鎖也不自動停，只給提示音；昨天沒做完走 **rollover 搬到今天**而非禁止。

另一個發現：**業界查不到任何產品把番茄顆數從事件長度自動推導**（TickTick、Pomofocus、Focus To-Do 全是手動估計）。Cadence 的 `autoPoms()` 在這點上是獨特設計，是優點也是 `estPoms` 漂移的來源。

### 若加入口限制會卡死的情境

| 情境 | 結果 |
|---|---|
| 早上排 09:00-10:00，晚上才做 | 完全卡死 |
| 想現在專注但沒建事件 | 完全卡死（**現在就已經是這樣**） |
| 昨天沒做完今天繼續 | 完全卡死 |

另有一個既存矛盾：`autoPoms` 給 all-day 事件 **1 顆**番茄，但 all-day 又永遠不算逾期 → 「整天可用但只能做 25 分鐘」。

### 三個方向（A + C 可疊加；B 唯一需要擴資料模型）

- **A｜維持綁定但不擋，只改語意** —— 按鈕文案「開始專注」→「補做」，session 內顯示「原定 09:00-10:00」。改動最小，完全對齊業界。不解決「沒事件就不能專注」。
- **B｜允許 detached session**（對齊 TickTick）—— 可不綁事件直接專注。解掉臨時專注與逾期兩情境，但需要**新的 focus session 記錄實體**（目前完成數只寫在 task 上，沒 task 就沒地方寫），是真正的模型擴充。
- **C｜番茄數可手動覆寫 + 開始後凍結**（對齊 TickTick + Toggl）—— 解掉番茄數跳動與 all-day 只有 1 顆的問題，自動推導降級為預設值。

**建議 A + C**，B 等確定真的需要「沒有事件也能專注」再做。

### 附帶未決項

Zoe 已回答「不能開的時候按鈕顯示為停用」，但**在 A 方向下按鈕不該停用而是改文案**，所以這個答案可能作廢，要重新確認。

---

## 5. 尚未人工驗證的項目

自動化測不到，需要真的跑 app 確認（`npx quasar dev --port 9000`）：

1. **切換月／週／日檢視** —— 倒數連續不重置（主要痛點）
2. **重整** —— 正確還原剩餘時間
3. **背景分頁** —— 切走數分鐘回來，時間與真實經過一致
4. **三個提示音** —— 番茄結束／休息結束／全部完成，音色可分辨。**最容易錯，務必實聽**（見 2.2，錯了是無聲不是報錯）
5. **超時丟棄** —— 把 `endsAt` 改成過去再重整，應安靜回到未開始、番茄數不增加
6. **桌面寬度截圖** —— overlay 滿版，未被 v2 的 393px 手機 frame 裁切
7. **z-index 疊放** —— 開 settings drawer 與 dialog，確認「蓋過 drawer、不蓋過 dialog」
8. **超時背景** —— 開一個昨天或今天早上已過的事件，確認背景轉暖褐 + 顯示「已超過預定結束時間」

測試小技巧（縮短等待）：
```js
// DevTools console：把當前 session 的結束時間拉到 5 秒後
const s = JSON.parse(localStorage['cadence.focus.session'])
s.segment.endsAt = Date.now() + 5000
localStorage['cadence.focus.session'] = JSON.stringify(s)
```
記得先點一下畫面解鎖音訊。

---

## 6. 相關文件

- **Spec**：`/Users/zoe/.claude/plans/0-1-inherited-quail.md`（完整規格，含 Codex 審查後的修正）
- **稽核與調研報告**：`~/claude-replies/2026-07-31.html` 的 reply-11
- Spec 已通過 Codex 審查，審查找到的 6 類問題都已修進 spec 並實作
