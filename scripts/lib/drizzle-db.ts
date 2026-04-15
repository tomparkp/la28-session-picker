import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import * as schema from '@/db/schema'

import type { DbTarget } from './db'

const D1_LOCAL_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'

interface CloudflareD1QueryResult {
  result?: Array<{ results?: unknown[]; success?: boolean }>
  errors?: Array<{ message?: string; code?: number }>
  success?: boolean
}

function findLocalD1File(): string {
  if (!existsSync(D1_LOCAL_DIR)) {
    throw new Error(
      `${D1_LOCAL_DIR} not found — run \`pnpm db:migrate:local\` first to create the local D1.`,
    )
  }
  const file = readdirSync(D1_LOCAL_DIR).find(
    (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
  )
  if (!file) throw new Error(`No local D1 SQLite file found in ${D1_LOCAL_DIR}.`)
  return resolve(D1_LOCAL_DIR, file)
}

type ProxyRow = Record<string, unknown>
type ProxyResult = { rows: ProxyRow[] | unknown[][] }

interface ProxyQuery {
  sql: string
  params: unknown[]
  method: 'all' | 'run' | 'get' | 'values'
}

function buildHttpProxy() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      'Missing CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_DATABASE_ID / CLOUDFLARE_API_TOKEN env vars; remote D1 access requires all three.',
    )
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`
  const headers = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  }

  async function postQuery(body: object): Promise<CloudflareD1QueryResult> {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const json = (await res.json()) as CloudflareD1QueryResult
    if (!res.ok || json.success === false) {
      const msg = json.errors?.map((e) => e.message ?? '').join('; ') || res.statusText
      throw new Error(`D1 HTTP error (${res.status}): ${msg}`)
    }
    return json
  }

  // D1's HTTP API returns rows as objects keyed by column name. sqlite-proxy
  // expects positional `unknown[][]` (column order matches the SELECT). Modern
  // JS preserves object key insertion order, so Object.values yields the right
  // sequence. NOTE: do NOT use Object.values on rows where the result was a
  // SELECT-by-key alias whose order differs from the underlying table — the
  // server returns columns in the SELECT order so this is safe.
  function toPositional(rows: unknown[]): unknown[][] {
    return rows.map((r) => Object.values(r as Record<string, unknown>))
  }

  return drizzle<typeof schema>(
    async (sqlText, params, _method) => {
      const json = await postQuery({ sql: sqlText, params })
      return { rows: toPositional(json.result?.[0]?.results ?? []) }
    },
    async (queries: ProxyQuery[]) => {
      const json = await postQuery({
        queries: queries.map((q) => ({ sql: q.sql, params: q.params })),
      })
      return json.result?.map((r) => ({ rows: toPositional(r.results ?? []) })) ?? []
    },
    { schema, casing: 'snake_case' },
  )
}

function runLocalQuery(
  sqlite: Database.Database,
  sqlText: string,
  params: unknown[],
  method: string,
): ProxyResult {
  // sqlite-proxy expects positional `unknown[][]` rows. better-sqlite3 in
  // raw() mode returns arrays in column order, matching what Drizzle wants.
  const stmt = sqlite.prepare(sqlText)
  if (method === 'run') {
    stmt.run(...(params as unknown[]))
    return { rows: [] }
  }
  if (method === 'get') {
    stmt.raw(true)
    const row = stmt.get(...(params as unknown[])) as unknown[] | undefined
    return { rows: row ? [row] : [] }
  }
  stmt.raw(true)
  const rows = stmt.all(...(params as unknown[])) as unknown[][]
  return { rows }
}

function buildLocalProxy() {
  const sqlite = new Database(findLocalD1File())
  return drizzle<typeof schema>(
    async (sqlText, params, method) => runLocalQuery(sqlite, sqlText, params, method),
    async (queries: ProxyQuery[]) => {
      // Wrap the batch in a transaction so failures don't half-apply.
      const tx = sqlite.transaction((qs: ProxyQuery[]) =>
        qs.map((q) => runLocalQuery(sqlite, q.sql, q.params, q.method)),
      )
      return tx(queries)
    },
    { schema, casing: 'snake_case' },
  )
}

export type DrizzleDb = ReturnType<typeof buildHttpProxy>

let cached: { target: DbTarget; db: DrizzleDb } | null = null

export function getDrizzleDb(target: DbTarget): DrizzleDb {
  if (cached && cached.target === target) return cached.db
  const db = target === 'remote' ? buildHttpProxy() : buildLocalProxy()
  cached = { target, db }
  return db
}

export { schema }
