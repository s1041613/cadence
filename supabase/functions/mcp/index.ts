// mcp — Cadence as a remote MCP server, so Claude, ChatGPT and other MCP clients can read a
// user's schedule and add events and day todos for them.
//
// Auth: each user connects their own AI client through Supabase Auth's OAuth 2.1 server. The
// client gets an access token for THAT user, and every tool runs with a Supabase client built
// from it, so RLS gives each user exactly what they have in the app — no more. See README.md
// for the dashboard settings this depends on.
//
// Deployed with --no-verify-jwt (config.toml): an unauthenticated request must reach
// withOAuthProtectedResource so it can answer with the WWW-Authenticate challenge MCP clients
// use to discover where to sign in. withSupabase({ auth: 'user' }) is the real gate.
//
// Kept thin on purpose: tools are declared in server.ts, and the rules live in core.ts and
// handlers.ts, which vitest can load.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler } from 'npm:@modelcontextprotocol/server@^2.4.0'
import { pipeline } from 'npm:@supabase/middleware@^1.0.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.9.2'

import { isTimeZone } from './core.ts'
import type { ToolContext } from './handlers.ts'
import { buildServer } from './server.ts'

// The app only offers Asia/Taipei today (CdSettingsDrawer: "Only Asia/Taipei is available in
// this beta"), and it does not store a per-user zone. One place decides the zone, so when the
// app starts storing one, only resolveTimeZone changes.
const DEFAULT_TIME_ZONE = Deno.env.get('CADENCE_TIME_ZONE') ?? 'Asia/Taipei'
if (!isTimeZone(DEFAULT_TIME_ZONE)) throw new Error(`CADENCE_TIME_ZONE is not a valid IANA zone: ${DEFAULT_TIME_ZONE}`)

function resolveTimeZone(_userId: string): string {
  return DEFAULT_TIME_ZONE
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase, userClaims }) => {
      if (!userClaims) return new Response('Unauthorized', { status: 401 })
      const ctx: ToolContext = {
        // The caller-scoped client. Do NOT swap in supabaseAdmin — see handlers.ts.
        db: supabase,
        userId: userClaims.id,
        timeZone: resolveTimeZone(userClaims.id),
        now: () => new Date(),
        newId: () => crypto.randomUUID()
      }
      // A fresh server per request: Edge Functions are stateless.
      return createMcpHandler(() => buildServer(ctx)).fetch(req)
    }
  )
)
