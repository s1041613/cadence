// End-to-end check of the MCP surface through the real SDK, with an in-memory database instead
// of Supabase. Not a vitest file (it needs Deno for the npm: imports); run it by hand:
//
//   deno run --allow-env --allow-read --allow-net=registry.npmjs.org supabase/functions/mcp/smoke.deno.ts
//
// It speaks raw JSON-RPC over the same fetch handler index.ts serves, so it catches the things
// the unit tests cannot: a schema the SDK rejects, a tool that is not registered, a result shape
// the protocol does not accept.

import { createMcpHandler } from 'npm:@modelcontextprotocol/server@^2.4.0'
import { buildServer } from './server.ts'
import type { Db, ToolContext } from './handlers.ts'

const inserted: Record<string, unknown[]> = {}

// Just enough of a query builder: records inserts, answers reads with fixtures.
const db: Db = {
  rpc: (fn: string) => Promise.resolve({ data: fn === 'has_mcp_access', error: null }),
  from(table: string) {
    const calls: string[] = []
    const builder: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'lt', 'lte', 'gte', 'or', 'order', 'limit', 'update', 'upsert', 'delete', 'maybeSingle']) {
      builder[m] = () => {
        calls.push(m)
        return builder
      }
    }
    builder.insert = (rows: unknown) => {
      ;(inserted[table] ??= []).push(rows)
      calls.push('insert')
      return builder
    }
    builder.then = (resolve: (v: unknown) => void) => {
      if (table === 'calendar_members') {
        return resolve({ data: [{ position: 0, role: 'owner', calendars: { id: '11111111-1111-4111-8111-111111111111', name: 'Mine' } }], error: null })
      }
      resolve({ data: calls.includes('maybeSingle') ? null : [], error: null })
    }
    return builder
  }
}

const ctx: ToolContext = { db, userId: 'me', timeZone: 'Asia/Taipei', now: () => new Date(), newId: () => crypto.randomUUID() }
const handler = createMcpHandler(() => buildServer(ctx))

let id = 0
async function rpc(method: string, params: unknown = {}): Promise<any> {
  const res = await handler.fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params })
    })
  )
  const text = await res.text()
  // Either a JSON body or a single SSE "data:" frame.
  const json = text.trim().startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data:'))!.slice(5)
  const msg = JSON.parse(json)
  if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error)}`)
  return msg.result
}

function assert(cond: unknown, what: string): void {
  if (!cond) throw new Error(`FAILED: ${what}`)
  console.log(`ok - ${what}`)
}

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } })
assert(init.serverInfo.name === 'cadence', 'initialize answers as cadence')
assert(typeof init.instructions === 'string' && init.instructions.includes('time_zone'), 'server instructions are sent')

const { tools } = await rpc('tools/list')
const names = tools.map((t: { name: string }) => t.name).sort()
assert(
  JSON.stringify(names) === JSON.stringify(['add_todos', 'create_event', 'get_schedule', 'list_calendars', 'search_schedule', 'update_event', 'update_todo']),
  `exactly the seven tools are listed (${names.join(', ')})`
)
assert(!names.some((n: string) => n.includes('delete')), 'no delete tool exists')
const create = tools.find((t: { name: string }) => t.name === 'create_event')
assert(create.inputSchema.required.includes('title') && create.inputSchema.required.includes('date'), 'create_event requires title and date')
assert(tools.filter((t: any) => t.annotations?.readOnlyHint).length === 3, 'three tools are marked read-only')

const schedule = await rpc('tools/call', { name: 'get_schedule', arguments: {} })
const body = JSON.parse(schedule.content[0].text)
assert(!schedule.isError && body.time_zone === 'Asia/Taipei' && /^\d{4}-\d{2}-\d{2}$/.test(body.today), 'get_schedule returns time_zone and today')

const created = await rpc('tools/call', { name: 'create_event', arguments: { title: 'Smoke test', date: '2026-11-12', start: '14:00' } })
const entry = JSON.parse(created.content[0].text)
assert(!created.isError && entry.start === '14:00' && entry.end === '15:00', 'create_event returns the saved entry')
const row = (inserted.events?.[0] ?? {}) as Record<string, unknown>
assert(row.starts_at === '2026-11-12T06:00:00.000Z' && row.owner_id === 'me', 'create_event wrote the row in UTC as the caller')

const bad = await rpc('tools/call', { name: 'create_event', arguments: { title: 'x', date: '2026-11-12', start: '15:00', end: '14:00' } })
assert(bad.isError && /end_date/.test(bad.content[0].text), 'an inverted range comes back as a tool error the model can read')

const invalid = await rpc('tools/call', { name: 'create_event', arguments: { title: 'x', date: 'tomorrow' } }).catch((e: Error) => ({ isError: true, content: [{ text: e.message }] }))
assert(invalid.isError, 'a malformed date is rejected by the schema')

console.log('\nall smoke checks passed')
