import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineConfig } from 'drizzle-kit'

const D1_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'

function findLocalD1File(): string {
  if (!existsSync(D1_DIR)) {
    throw new Error(
      `${D1_DIR} not found — run \`pnpm db:migrate:local\` first to create the local D1.`,
    )
  }
  const file = readdirSync(D1_DIR).find(
    (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
  )
  if (!file) {
    throw new Error(`No local D1 SQLite file found in ${D1_DIR}.`)
  }
  return resolve(D1_DIR, file)
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  migrations: { prefix: 'timestamp' },
  dbCredentials: { url: findLocalD1File() },
})
