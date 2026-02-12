import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NETLIFY_DATABASE_URL!,
  },
  schema: './db/schema/index.ts',
  out: './migrations',
  migrations: {
    prefix: 'timestamp',
  },
})
