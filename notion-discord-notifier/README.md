# notion-discord-notifier

把 Notion「雷包糾察隊」資料庫**新增**的職缺，推到 Discord 的 `#踩地雷` 頻道。

- 只通知**新增**的 Page，修改既有 Page 不會通知
- 同一筆 Page 不會重複通知
- 沒有新資料就安靜結束，不發廢話訊息
- 執行環境零 runtime 依賴（用 Node 內建 `fetch`），Actions 不需要 `npm install`

---

## 一次性設定

### 1. Discord Webhook

1. `#踩地雷` 頻道 → 編輯頻道 → 整合 → Webhook → 新增 Webhook
2. 複製 Webhook 網址 → 這就是 `DISCORD_WEBHOOK_URL`

> Webhook 網址本身就是憑證，拿到的人就能往這個頻道發文，只放 GitHub Secrets，不要貼進程式碼或 issue。

### 2. Notion Integration

1. https://www.notion.so/profile/integrations → New integration
2. 複製 Internal Integration Secret（`ntn_...`）→ 這就是 `NOTION_TOKEN`
3. 打開「雷包糾察隊」資料庫 → 右上 `...` → Connections → 加入剛剛建立的 integration

**沒做第 3 步的話，API 會回 404 而不是 403**，很容易誤判成 ID 打錯。

### 3. GitHub Secrets

Settings → Secrets and variables → Actions → New repository secret：

| Secret | 值 |
| --- | --- |
| `NOTION_TOKEN` | 上面拿到的 `ntn_...` |
| `DISCORD_WEBHOOK_URL` | 上面拿到的 Webhook 網址 |
| `NOTION_DATA_SOURCE_ID` | `3f5ed3b5-36d6-4602-bc4a-bfd822084064` |

---

## 怎麼跑

| 觸發方式 | 說明 |
| --- | --- |
| `schedule` | 每 10 分鐘自動跑一次 |
| `workflow_dispatch` | Actions 分頁手動執行，可帶 `since` / `dry_run` |

手動執行的兩個輸入：

- `since`：ISO 8601 時間字串（例：`2026-09-01T00:00:00Z`）。忽略 state 檔，從這個時間之後重查。補漏或重測用。
- `dry_run`：只在 log 印出「會通知哪幾筆」，不送 Discord、不寫 state。驗證設定有沒有接通最安全的方式。

### 第一次執行會發生什麼

repo 裡沒有 `state/last-seen.json` 時，第一次執行**只會把「現在」記下來就結束，不發任何通知**。
這是刻意的 —— 否則第一次跑會把整個資料庫倒進頻道。

所以驗收流程是：

1. 手動執行一次 Action（初始化 state）
2. 在 Notion 新增一筆測試 Page
3. 再手動執行一次 → Discord 收到**一則**通知
4. 修改那筆 Page 的任何欄位 → 再執行 → **不會**再通知

---

## 通知內容

每筆新 Page 一個 Discord embed：

- 標題：`公司｜職缺`，點擊開「職缺連結」（沒填就開 Notion 頁面）
- 內文：職缺連結、Notion 頁面連結
- 欄位：求職平台、接觸來源、工作型態
- 時間：Page 的建立時間

一則訊息最多塞 10 個 embed，超過會自動拆成多則。

---

## 不重複通知是怎麼做的

`state/last-seen.json` 存兩件事：

```json
{
  "version": 1,
  "lastCreatedTime": "2026-09-03T10:20:00.000Z",
  "notified": [{ "id": "…", "createdTime": "2026-09-03T10:20:00.000Z" }]
}
```

查詢條件是 `created_time >= lastCreatedTime`，再用 `notified` 裡的 id 把已通知過的濾掉。

**為什麼不是單純的 `>`：** Notion 的 `created_time` 只精確到「分」。同一分鐘內建立的兩筆資料時間戳一模一樣，
如果排程剛好切在那一分鐘中間，用嚴格大於就會永久漏掉後面那筆。改成 `>=` 再用 id 去重，
代價只是每次多回傳幾筆已知資料，換到的是不會漏。

`notified` 只保留 `createdTime` 等於 `lastCreatedTime` 的那幾筆 —— 更早的資料下次查詢本來就不會回來，留著沒意義。

**寫入時機：** Discord 送成功之後才寫 state。中途失敗（例如第 2 批 429）時，
已經成功送出的那幾批仍然會寫進 state 再拋錯，所以重跑不會把它們重複通知一次。

state 由 workflow 用 `github-actions[bot]` commit 回 repo。這也順便讓 repo 保持活躍 ——
GitHub 會停掉 60 天沒動靜的 repo 的排程 workflow。

---

## 本地測試

```bash
cp .env.example .env      # 填進自己的 token
set -a && . ./.env && set +a
DRY_RUN=true npm run notify
```

型別檢查：

```bash
npm install
npm run typecheck
```

腳本是用 `node --experimental-strip-types` 直接跑 TypeScript，不編譯。
因此 `tsconfig.json` 開了 `erasableSyntaxOnly` —— 不能用 `enum`、`namespace`、constructor 參數屬性。

---

## 已知限制

- **只看新增，不看修改。** 面試流程更新、風險等級改變都不會通知。要做的話得改抓 `last_edited_time`，
  並處理「同一筆改 5 次就洗版 5 次」的問題，那是第二階段的事。
- **GitHub 排程會延遲。** `*/10` 是「最快 10 分鐘」，忙碌時可能拖到 20~30 分鐘。腳本靠 state 比對時間，
  延遲只影響即時性，不會漏資料。
- **state 靠 commit 保存。** 手動改壞或刪掉 `state/last-seen.json`，下次執行會重新初始化成「現在」，
  中間那段時間的新增資料就不會補通知（需要的話用 `since` 手動補）。
