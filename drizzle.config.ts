import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './netlify/db/migrations',
  migrations: { prefix: 'timestamp' },
  dbCredentials: {
    url: process.env.NETLIFY_DB_URL!,
  },
})
