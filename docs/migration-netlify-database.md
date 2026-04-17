# Switching to Netlify Database from the Netlify DB Extension

Working notes from switching this project off the deprecated **Netlify DB extension** (`@netlify/neon`, `NETLIFY_DATABASE_URL`) onto **Netlify Database** (`@netlify/database`, `NETLIFY_DB_URL`). Written as a narrative for building docs and video content.

> **Terminology.** "Switch" means changing database providers. "Migration" means a schema migration file. The two overlap during this process but are distinct concepts.

> **Audience.** Engineers with working knowledge of Postgres, Drizzle, and Netlify deploys. This guide doesn't teach those fundamentals; it documents the switch and the rough edges we hit.

## Strategy

The switch happens in one branch:

1. Export production data from the source database.
2. Swap application code to `@netlify/database` in a single commit.
3. Push the branch — Netlify auto-provisions a preview database and applies existing schema migrations.
4. Import data into the preview database as an operator step (not committed to git).
5. Validate the preview with real data.
6. Provision the production database, apply schema, import data.
7. Merge to main and clean up.

Data never lands in git. The import is a one-shot operator step using `psql` against the target database's `NETLIFY_DB_URL`.

## Step 1 — Export production data

```bash
pg_dump \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --schema=public \
  "$SOURCE_DB_URL" | grep -v -E '^\\(restrict|unrestrict)' > tmp/prod-data.sql
```

**What we learned:**

- **`--schema=public`** is essential when the source DB has a `neon_auth` schema (from Neon Auth). Those tables belong to the auth product and shouldn't move into the new database.
- **`pg_dump` 18+** emits `\restrict` / `\unrestrict` psql meta-commands that aren't valid SQL. The `grep -v` strips them. Without this, any tool replaying the dump outside of `psql` will fail.
- **Don't commit the dump.** Even with secrets stripped, production data doesn't belong in source control. Keep it in a gitignored `tmp/` directory and pipe it directly into `psql`.
- **Secrets are fine to include** when the dump only flows operator-shell → target DB. Exclude tables with credentials only if the dump will be committed or shared.

## Step 2 — Code swap

All changes in one commit on a feature branch.

### Packages

```bash
npm uninstall @netlify/neon @neondatabase/serverless @neondatabase/toolkit
npm install @netlify/database
```

We kept `@neondatabase/neon-js` because the frontend still uses it for Neon Auth (auth switch is a separate effort).

### Database client (`_shared/db.ts`)

`getDatabase()` returns different drivers depending on the runtime. Branch on `driver`:

```ts
import { getDatabase } from '@netlify/database'
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import * as schema from '../../../db/schema'

const database = getDatabase()

export const db =
  database.driver === 'serverless'
    ? drizzleNeonHttp(database.httpClient, { schema })
    : drizzlePg(database.pool, { schema })

export { schema }
```

**What we learned:** `@netlify/database@0.6.x` exports less than the docs suggest. There is no `withNetlifyDatabase()` helper, no `@netlify/database/drizzle` subpath, and no `drizzle-orm/netlify-database` driver. `getDatabase()` returns `{ driver, sql, pool, httpClient?, connectionString }` — not `{ client }`. Wire Drizzle manually using the existing `neon-http` and `node-postgres` drivers.

### Drizzle config

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './netlify/db/migrations',
  migrations: { prefix: 'timestamp' },
  dbCredentials: { url: process.env.NETLIFY_DB_URL! },
})
```

### Move schema migrations

```bash
git mv migrations netlify/db/migrations
```

### Delete manual scripts

Netlify Database auto-applies schema migrations on every deploy. We deleted `scripts/migrate.js` and the `db:migrate:staging` / `db:migrate:prod` npm scripts.

## Step 3 — Pre-flight: fix schema migration filename order

**This was the biggest gotcha.** Our first push failed:

```
Database migration failed: error running migrations: running migrations:
ERROR 1771681020_solid_timeslip.sql: failed to run SQL
```

**Root cause:** Netlify applies schema migrations **lexicographically by filename**. Our project had mixed prefixes — some files used 10-digit unix timestamps (`1771681020_...`), others used 14-digit timestamps (`20260214140526_...`). Alphabetically, `1...` sorts before `2...`, so the unix-prefixed files ran first — but they were generated *after* the timestamp-prefixed files and depended on tables those files created.

Drizzle Kit's own `migrate` command applies by `idx` order from `_journal.json` (not by filename), which is why this never surfaced locally.

**Fix:** Rename unix-prefixed files to timestamp prefixes using the `when` values from `_journal.json`:

```bash
date -u -r 1771681020 +%Y%m%d%H%M%S   # -> 20260221133700
git mv netlify/db/migrations/1771681020_solid_timeslip.sql \
       netlify/db/migrations/20260221133700_solid_timeslip.sql
git mv netlify/db/migrations/meta/1771681020_snapshot.json \
       netlify/db/migrations/meta/20260221133700_snapshot.json
# Update the `tag` in _journal.json to match
```

**Pre-flight checklist:** Before pushing, verify that the lexicographic sort of `netlify/db/migrations/*.sql` matches the `idx` order in `_journal.json`. If not, rename first.

**Bonus issue:** Mixed prefixes also corrupted Drizzle's snapshot chain (`id` / `prevId` in `meta/*_snapshot.json`), causing `drizzle-kit generate` to fail with a "collision" error. Fixed by walking the chain in journal order and patching broken `prevId` values.

## Step 4 — Push and observe

After fixing the filename order, the second push succeeded. The deploy preview:

- Detected `@netlify/database` in the dependency tree and **auto-provisioned a branch database**.
- **Auto-applied all 8 schema migrations** before the preview went live.
- The preview was live with an empty but fully-schemaed database.

## Step 5 — Import data into preview (rehearsal)

Got the preview database's connection string from the Netlify UI (Project configuration → Database) and imported:

```bash
psql "$PREVIEW_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f tmp/prod-data.sql
```

850 rows across 12 tables imported cleanly. The preview URL worked with real data — full app functionality validated.

This rehearsal is the key moment: it validates both the dump and the schema against the new database, and gives a concrete timing for the production cutover window.

## Step 6 — Production cutover

With the production Netlify Database provisioned, we applied schema and data:

```bash
# Apply schema migrations
NETLIFY_DB_URL="$PROD_DB_URL" npx drizzle-kit migrate

# Re-export for freshness
pg_dump --data-only --column-inserts --no-owner --no-privileges \
  --schema=public "$SOURCE_DB_URL" | grep -v -E '^\\(restrict|unrestrict)' > tmp/prod-data-fresh.sql

# Import
psql "$PROD_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f tmp/prod-data-fresh.sql
```

**Cutover window:** There is a real downtime window between the final export and the completed import. For our 850-row database this was seconds. For larger databases, plan accordingly — consider a read-only window or a catch-up pass.

## Step 7 — Merge and clean up

Merge the branch to main. Netlify detects schema migrations are already applied and skips them.

Post-merge cleanup:
- Remove `@netlify/neon` and remaining `@neondatabase/*` packages (except `@neondatabase/neon-js` if auth is still on Neon Auth)
- Remove `NETLIFY_DATABASE_URL` references from code and environment
- Update `CLAUDE.md` and project documentation

## Summary of rough edges

| Issue | Impact | Resolution |
|---|---|---|
| `pg_dump` 18+ `\restrict` meta-commands | Dump fails on replay | Strip with `grep -v` |
| `neon_auth.*` tables in the source DB | Wrong data imported | `--schema=public` flag |
| `@netlify/database` API gaps vs docs | Code examples don't compile | Use fallback Drizzle wiring (see Step 2) |
| Mixed schema migration prefixes (unix + timestamp) | Deploy preview fails — wrong apply order | Rename to unified timestamp prefixes (see Step 3) |
| Drizzle snapshot chain corruption | `drizzle-kit generate` fails | Patch `prevId` values in journal order |
| Drizzle Kit vs Netlify apply order | Silent divergence | Pre-flight check: lexicographic sort must match `_journal.json` idx order |
| Production data in git | Security and bloat risk | Keep dump gitignored; import via operator step |
