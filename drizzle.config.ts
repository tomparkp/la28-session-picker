import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const isRemote = process.env.DRIZZLE_ENV === 'remote'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  migrations: { prefix: 'timestamp' },
  ...(isRemote
    ? {
        driver: 'd1-http',
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
          databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
          token: process.env.CLOUDFLARE_D1_TOKEN!,
        },
      }
    : {
        dbCredentials: {
          url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite',
        },
      }),
})
