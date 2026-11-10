# Cadence MCP server

讓 Claude、ChatGPT 等 MCP client 以「使用者本人」的身分查詢行程，並新增事件與每日待辦。

- 端點：`https://<project-ref>.supabase.co/functions/v1/mcp`（Streamable HTTP）
- 驗證：Supabase Auth 的 OAuth 2.1 server。每個使用者用自己的帳號授權，拿到的是**自己的** access token。
- 權限：每個 tool 都用該使用者的 token 建 Supabase client，RLS 和 app 完全一樣。**這個 function 沒有、也不能用 service role。**

## 檔案

| 檔案 | 內容 |
|---|---|
| `index.ts` | 入口：OAuth discovery、驗 token、建 per-request MCP server |
| `server.ts` | tool 名稱、說明、input schema，以及所有 tool 共用的錯誤/權限包裝 |
| `handlers.ts` | 每個 tool 實際做的查詢與寫入（不 import npm:，vitest 可測） |
| `core.ts` | 純規則：時區換算、輸入驗證、row ↔ 回傳格式（不 import 任何東西） |
| `*.test.ts` | vitest（`npm test` 會跑） |
| `events-mapper.parity.test.ts` | 鎖住「MCP 建的 event」和「app 建的 event」寫進 DB 的 row 完全一樣 |
| `smoke.deno.ts` | 用真的 MCP SDK + 假資料庫，跑 initialize / tools/list / tools/call |

## Tools

| Tool | 讀/寫 | 說明 |
|---|---|---|
| `list_calendars` | 讀 | 可見的行事曆（含共享），`default=true` 是新事件預設放的地方 |
| `get_schedule` | 讀 | 一段日期（預設今天、最多 62 天）的 events、tasks、todos |
| `search_schedule` | 讀 | 依標題 / 地點 / 備註找 events 和 tasks |
| `create_event` | 寫 | 新增事件，提醒預設 15 分鐘前（同 app） |
| `update_event` | 寫 | 只能改自己建的 event；改開始時間會保留長度 |
| `add_todos` | 寫 | 新增每日待辦，預設今天 |
| `update_todo` | 寫 | 勾完成 / 取消 / 改名 |

刻意**沒有**：刪除任何東西、寫入象限 task、改別人在共享行事曆建的 event。

## 部署步驟

### 1. Supabase Dashboard 設定（一次性）

1. **Authentication → OAuth Server**：啟用。
   - **Authorization path**：`/oauth/consent`（app 裡的授權同意頁，`src/pages/OAuthConsentPage.vue`）。
     它會接在 **Site URL** 後面。若 Site URL 是 GitHub Pages 的 `https://<user>.github.io/cadence`，
     請實際跑一次授權流程，確認被導到的網址是 `.../cadence/oauth/consent?authorization_id=...`。
   - **Allow dynamic client registration**：開啟。Claude、ChatGPT 會自己註冊成 OAuth client。
2. **JWT signing keys**：必須是非對稱金鑰（ES256 / RS256）。`@supabase/server` 不接受舊的 HS256 token。
   若專案還在用 legacy JWT secret，需要先在 Dashboard 遷移。
3. **Authentication → URL Configuration**：確認 Site URL 是正式網址。

### 2. 資料庫

```bash
supabase db push   # 套用 20261110120000_mcp_access.sql
```

### 3. 部署 function

```bash
supabase functions deploy mcp
```

`config.toml` 的 `[functions.mcp] verify_jwt = false` 是必要的：未登入的請求要能進到 function，
才能回 `WWW-Authenticate` 讓 client 知道去哪登入。真正驗 token 的是 `withSupabase({ auth: 'user' })`。

選用的 secret：

```bash
supabase secrets set CADENCE_TIME_ZONE=Asia/Taipei   # 預設就是 Asia/Taipei
```

### 4. 白名單

在 SQL editor 執行（SQL editor 以 postgres 身分執行，不受 RLS 限制）：

```sql
insert into mcp_access (user_id, note)
select id, 'beta' from auth.users where email = '<email>';

-- 查看目前名單
select a.user_id, u.email, a.note, a.created_at
from mcp_access a join auth.users u on u.id = a.user_id;

-- 移除
delete from mcp_access where user_id = '<uuid>';
```

使用者自己只能讀自己那一列，不能把自己加進去（沒有 insert policy，也 revoke 了寫入權限）。

誰能用只由資料庫函式 `has_mcp_access()` 決定。MCP function 和前端授權頁都呼叫它，
所以兩邊的判斷不會不一致。

### 5. 連接 AI client

URL 都是 `https://<project-ref>.supabase.co/functions/v1/mcp`。

- **Claude**（claude.ai / Desktop）：Settings → Connectors → Add custom connector → 貼上 URL → Connect → 在 Cadence 授權頁按 Allow。
- **ChatGPT**：Settings → Apps & Connectors → 開啟 Developer mode → Create → 貼上 URL、驗證選 OAuth → 授權。

（兩家的選單名稱常改，若找不到請以官方說明為準。）

### 6. 對所有人開放

```sql
update mcp_settings set open_to_everyone = true;
```

不需要 migration，也不需要重新部署 function 或前端。改回 `false` 就回到白名單模式。

## 安全模型與已知限制

- **資料隔離靠 RLS，不靠這裡的程式碼。** 所有查詢都用使用者自己的 token。`handlers.ts` 裡的
  `eq('user_id', …)` 只是讓錯誤訊息清楚，即使漏寫，RLS 也會擋。
- **「不能刪除」是 tool 的限制，不是 token 的限制。** OAuth access token 和 app 的登入 token 一樣能
  直接打 Supabase Data API。Claude/ChatGPT 只會呼叫這裡定義的 tools，但如果要在資料庫層面也禁止
  OAuth client 刪除，需要在相關 RLS policy 加上 `(auth.jwt() ->> 'client_id') is null`。目前**還沒做**。
- **Prompt injection**：共享行事曆裡別人寫的標題/備註會進到 AI 的 context。server instructions 有提醒
  模型不要把它們當指令，加上沒有刪除工具，風險有限，但不是零。
- **時區**：目前所有人共用 `CADENCE_TIME_ZONE`（app 本身也只支援 Asia/Taipei）。要支援個人時區時，
  只需要改 `index.ts` 的 `resolveTimeZone`。
- **沒有 rate limit**：目前依賴 Supabase 本身的限制。
- **沒有「撤銷授權」的 UI**：supabase-js 有 `auth.oauth.listGrants()` / `revokeGrant()`，之後可以在設定頁加。
  在那之前，使用者可以在 Claude/ChatGPT 端中斷連線，或由管理者把他移出白名單。

## 測試

```bash
npm test                                   # 包含這個資料夾的 vitest
deno check supabase/functions/mcp/index.ts # 型別檢查（需在沒有 package.json 的目錄下執行，或用 --no-config）
deno run -A supabase/functions/mcp/smoke.deno.ts
```
