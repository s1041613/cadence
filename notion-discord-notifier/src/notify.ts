/**
 * 雷包糾察隊 → Discord 通知
 *
 * 每次執行：
 *   1. 讀 state/last-seen.json，拿到「上次成功通知過的最後建立時間」與該分鐘內已通知的 page id
 *   2. 用 created_time >= lastCreatedTime 查 Notion data source（含分頁）
 *   3. 扣掉已通知過的 page id
 *   4. 還有東西才發 Discord；沒有就安靜結束
 *   5. 成功送出的部分才寫回 state
 *
 * 為什麼不是單純 created_time > lastCreatedTime：
 * Notion 的 created_time 只精確到「分」，同一分鐘內建立的多筆資料會有一模一樣的時間戳。
 * 用嚴格大於會漏掉「排程剛好切在那一分鐘中間」的資料，所以改成 >= 再用 id 去重。
 */

const NOTION_VERSION = '2025-09-03';
const NOTION_API = 'https://api.notion.com/v1';

/** Discord 一則訊息最多 10 個 embed */
const EMBEDS_PER_MESSAGE = 10;
/** state 裡最多保留幾個已通知 id（防呆用，正常情況下遠低於此數） */
const MAX_TRACKED_IDS = 500;

const DISCORD_LIMITS = {
  embedTitle: 256,
  embedDescription: 4096,
  fieldName: 256,
  fieldValue: 1024,
} as const;

type NotifiedEntry = { id: string; createdTime: string };

type State = {
  version: 1;
  /** 上次成功通知過的最大 created_time（ISO 8601） */
  lastCreatedTime: string;
  /** 剛好落在 lastCreatedTime 那一分鐘、已經通知過的 page */
  notified: NotifiedEntry[];
};

type NotionPage = {
  id: string;
  url: string;
  created_time: string;
  properties: Record<string, unknown>;
};

type JobEntry = {
  id: string;
  createdTime: string;
  notionUrl: string;
  company: string;
  role: string;
  platform: string;
  contactSource: string;
  workStyle: string;
  jobUrl: string;
};

// ---------------------------------------------------------------------------
// 環境變數
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少必要的環境變數 ${name}（GitHub Actions 請到 Settings → Secrets 設定）`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// state 讀寫
// ---------------------------------------------------------------------------

async function readState(path: string): Promise<State | null> {
  const { readFile } = await import('node:fs/promises');
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${path} 不是合法 JSON，請修掉或直接刪除讓腳本重新初始化`);
  }

  const state = parsed as Partial<State>;
  if (typeof state?.lastCreatedTime !== 'string' || Number.isNaN(Date.parse(state.lastCreatedTime))) {
    return null;
  }

  const notified = Array.isArray(state.notified)
    ? state.notified.filter(
        (entry): entry is NotifiedEntry =>
          typeof entry?.id === 'string' && typeof entry?.createdTime === 'string',
      )
    : [];

  return { version: 1, lastCreatedTime: state.lastCreatedTime, notified };
}

async function writeState(path: string, state: State): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/**
 * 把已送出的資料併回 state。
 * 只保留 created_time 落在新的 lastCreatedTime 那一刻的 id —— 更早的資料下次查詢
 * 本來就不會回來（filter 是 on_or_after），留著只是浪費空間。
 */
function nextState(previous: State | null, delivered: JobEntry[]): State {
  const times = delivered.map((entry) => entry.createdTime);
  if (previous) times.push(previous.lastCreatedTime);
  const lastCreatedTime = times.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));

  const merged = new Map<string, NotifiedEntry>();
  for (const entry of previous?.notified ?? []) merged.set(entry.id, entry);
  for (const entry of delivered) merged.set(entry.id, { id: entry.id, createdTime: entry.createdTime });

  const notified = [...merged.values()]
    .filter((entry) => Date.parse(entry.createdTime) >= Date.parse(lastCreatedTime))
    .sort((a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime))
    .slice(0, MAX_TRACKED_IDS);

  return { version: 1, lastCreatedTime, notified };
}

// ---------------------------------------------------------------------------
// Notion
// ---------------------------------------------------------------------------

function plainText(property: unknown, key: 'title' | 'rich_text'): string {
  const value = (property as Record<string, unknown> | undefined)?.[key];
  if (!Array.isArray(value)) return '';
  return value
    .map((token) => (token as { plain_text?: string })?.plain_text ?? '')
    .join('')
    .trim();
}

function selectName(property: unknown): string {
  const value = (property as { select?: { name?: string } } | undefined)?.select;
  return value?.name?.trim() ?? '';
}

function urlValue(property: unknown): string {
  const value = (property as { url?: string | null } | undefined)?.url;
  return value?.trim() ?? '';
}

function toJobEntry(page: NotionPage): JobEntry {
  const props = page.properties;
  return {
    id: page.id,
    createdTime: page.created_time,
    notionUrl: page.url,
    role: plainText(props['職缺'], 'title'),
    company: plainText(props['公司'], 'rich_text'),
    platform: selectName(props['求職平台']),
    contactSource: selectName(props['接觸來源']),
    workStyle: selectName(props['工作型態']),
    jobUrl: urlValue(props['職缺連結']),
  };
}

async function queryNotionSince(token: string, dataSourceId: string, since: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetch(`${NOTION_API}/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { timestamp: 'created_time', created_time: { on_or_after: since } },
        sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Notion 查詢失敗 ${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
    }

    const payload = (await response.json()) as {
      results?: NotionPage[];
      has_more?: boolean;
      next_cursor?: string | null;
    };

    pages.push(...(payload.results ?? []));
    cursor = payload.has_more && payload.next_cursor ? payload.next_cursor : undefined;
  } while (cursor);

  return pages;
}

// ---------------------------------------------------------------------------
// Discord
// ---------------------------------------------------------------------------

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Discord 只接受 http/https 的 embed url，其他一律當作沒填 */
function safeLink(raw: string): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function buildEmbed(entry: JobEntry) {
  const company = entry.company || '未填公司';
  const role = entry.role || '未填職缺';
  const jobLink = safeLink(entry.jobUrl);

  const description = [
    jobLink ? `🔗 [職缺連結](${jobLink})` : '🔗 職缺連結：未填',
    `📄 [在 Notion 開啟](${entry.notionUrl})`,
  ].join('\n');

  const fields = [
    { name: '求職平台', value: entry.platform || '—' },
    { name: '接觸來源', value: entry.contactSource || '—' },
    { name: '工作型態', value: entry.workStyle || '—' },
  ].map((field) => ({
    name: truncate(field.name, DISCORD_LIMITS.fieldName),
    value: truncate(field.value, DISCORD_LIMITS.fieldValue),
    inline: true,
  }));

  return {
    title: truncate(`${company}｜${role}`, DISCORD_LIMITS.embedTitle),
    url: jobLink ?? entry.notionUrl,
    description: truncate(description, DISCORD_LIMITS.embedDescription),
    color: 0x5865f2,
    fields,
    footer: { text: '雷包糾察隊' },
    timestamp: entry.createdTime,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function postToDiscord(webhookUrl: string, entries: JobEntry[]): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `🆕 雷包糾察隊新增 ${entries.length} 筆`,
      embeds: entries.map(buildEmbed),
      // 不要因為職缺標題裡有 @everyone 之類的字就 ping 全頻道
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord 送出失敗 ${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const notionToken = requireEnv('NOTION_TOKEN');
  const dataSourceId = requireEnv('NOTION_DATA_SOURCE_ID');
  const webhookUrl = requireEnv('DISCORD_WEBHOOK_URL');
  const statePath = process.env.STATE_FILE?.trim() || 'state/last-seen.json';
  const dryRun = process.env.DRY_RUN === 'true';

  const sinceOverride = process.env.SINCE?.trim();
  if (sinceOverride && Number.isNaN(Date.parse(sinceOverride))) {
    throw new Error(`SINCE 不是合法的時間字串：${sinceOverride}`);
  }

  let state = await readState(statePath);
  if (sinceOverride) {
    console.log(`SINCE 覆寫生效，改從 ${sinceOverride} 開始查`);
    state = { version: 1, lastCreatedTime: new Date(sinceOverride).toISOString(), notified: [] };
  }

  // 第一次跑（或 state 壞掉）就只記錄現在時間，不把整個資料庫倒進頻道
  if (!state) {
    const now = new Date().toISOString();
    console.log(`找不到 ${statePath}，初始化為 ${now}，這次不發通知`);
    await writeState(statePath, { version: 1, lastCreatedTime: now, notified: [] });
    return;
  }

  console.log(`查詢 created_time >= ${state.lastCreatedTime}`);
  const pages = await queryNotionSince(notionToken, dataSourceId, state.lastCreatedTime);

  const alreadyNotified = new Set(state.notified.map((entry) => entry.id));
  const fresh = pages.map(toJobEntry).filter((entry) => !alreadyNotified.has(entry.id));

  if (fresh.length === 0) {
    console.log(`Notion 回傳 ${pages.length} 筆，扣掉已通知後沒有新資料，結束`);
    return;
  }

  if (dryRun) {
    console.log(`DRY_RUN：會通知 ${fresh.length} 筆，但不送 Discord、不寫 state`);
    for (const entry of fresh) {
      console.log(`  - ${entry.company || '未填公司'}｜${entry.role || '未填職缺'} (${entry.createdTime})`);
    }
    return;
  }

  // 分批送。中途失敗時，已經送出去的那幾批還是要寫進 state，否則下次會重複通知。
  const delivered: JobEntry[] = [];
  try {
    for (const batch of chunk(fresh, EMBEDS_PER_MESSAGE)) {
      await postToDiscord(webhookUrl, batch);
      delivered.push(...batch);
    }
  } finally {
    if (delivered.length > 0) {
      await writeState(statePath, nextState(state, delivered));
      console.log(`已通知 ${delivered.length} 筆，state 更新至 ${nextState(state, delivered).lastCreatedTime}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
