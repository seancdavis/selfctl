# Migrating from the Netlify DB extension (@netlify/neon) to Netlify Database (@netlify/database)

Working notes from migrating this project. Goal: a generalizable guide for moving a Netlify project off the deprecated **Netlify DB extension** (Beta, `@netlify/neon`, `NETLIFY_DATABASE_URL`) onto **Netlify Database** (GA, `@netlify/database`, `NETLIFY_DB_URL`) with zero downtime.

> **Audience.** Engineers with working knowledge of Postgres, Drizzle (or a comparable ORM), Netlify deploys, and their own export/import tooling. This guide does not teach those fundamentals; it documents the swap.

## Strategy

The GA product auto-provisions a Postgres database at deploy time and auto-applies migrations on each deploy (preview + production). That lets us do the entire migration in a single branch:

1. Export production data from the current Neon DB.
2. Swap application code to `@netlify/database`.
3. Reuse the existing Drizzle schema migrations as-is.
4. Add the exported production data as a **DML (data) migration** — a timestamped file under `netlify/db/migrations/` containing `INSERT` statements.
5. Push the branch. Netlify provisions a DB for the deploy preview, runs all migrations (schema + data), and we validate against the preview URL.
6. Merge to main. Netlify provisions the production DB, runs the same migrations, and cuts over.

The data import being part of the migration sequence is the key move: production cutover becomes the normal deploy flow rather than a separate out-of-band step.

## Phase 1 — Export production data

Any dump tool that produces a replayable SQL file works. We used `pg_dump`:

```bash
pg_dump \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --schema=public \
  "$PROD_URL" > tmp/prod-data.sql
```

Notes:

- **`--schema=public`** excludes the `neon_auth` schema if the project uses Neon Auth. Those tables belong to the auth product and should not move into the new application database. (If you're also migrating auth, handle that separately.)
- **`--data-only`** — schema lives in Drizzle migrations; we only want rows.
- **`--column-inserts`** — produces one `INSERT` per row with explicit column lists. Slightly more verbose, but replayable in any order and resilient to column reordering.
- `pg_dump` 18 emits psql meta-commands (`\restrict` / `\unrestrict`) at the top and bottom of the dump. These are not valid SQL and will fail when replayed by a migration runner. Strip them:

  ```bash
  ... | grep -v -E '^\\(restrict|unrestrict)' > tmp/prod-data.sql
  ```

Keep the connection string out of source control and chat — load it from a gitignored `.env.migration` or your shell.

## Phase 2 — Code swap

### Packages

```bash
npm uninstall @netlify/neon @neondatabase/serverless @neondatabase/toolkit
npm install @netlify/database
```

Keep `@neondatabase/neon-js` if (like this project) it is being used by the Neon Auth client in the frontend and auth is not part of this migration.

### Watch out: the package exports less than the GA docs suggest

At the time of this migration, `@netlify/database@0.6.1` **only** exports:

- `getConnectionString()` — reads `NETLIFY_DB_URL`
- `getDatabase(options?)` — returns `{ driver, sql (waddler), pool, httpClient?, connectionString }`
- `MissingDatabaseConnectionError`

There is **no** `withNetlifyDatabase` helper and **no** `@netlify/database/drizzle` subpath, despite docs/examples that reference them. Treat that as a documentation gap and wire Drizzle up manually instead.

Similarly, there is no `drizzle-orm/netlify-database` subpath in `drizzle-orm`. Use the existing `drizzle-orm/neon-http` (serverless) and `drizzle-orm/node-postgres` (server) drivers with whatever `getDatabase()` hands you.

### `netlify/functions/_shared/db.ts`

`getDatabase()` already selects the right underlying driver based on `NETLIFY_DB_DRIVER` (set by the platform). Return the matching Drizzle client:

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

Note: `getDatabase()` throws immediately if `NETLIFY_DB_URL` isn't set — different from `@netlify/neon`'s `neon()` which was lazy. Any code that imports `db` without the env var configured will fail at import time, not at query time.

### `drizzle.config.ts`

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

- Schema path can stay wherever it already lives — a single file, a directory of files re-exported from `index.ts`, whatever; Drizzle only cares that the path resolves.
- Use **`prefix: 'timestamp'`** for new migrations even if existing files use a different prefix. Timestamp prefixes don't collide across branches.
- Move migrations from their old location (often `./migrations/`) to `./netlify/db/migrations/` with `git mv` — this is the GA convention and tooling defaults to it.

### Delete deprecated manual migration scripts

The GA product applies migrations automatically on every deploy (preview and production). Any script that called `drizzle-kit migrate` against an explicit staging/production URL can be removed. In this project, that was `scripts/migrate.js` and the `db:migrate:staging` / `db:migrate:prod` npm scripts.

## Phase 3 — Importing data (don't commit it)

**Do not put production data into git.** Even with secrets stripped, a SQL dump in source control is the wrong tool: it mixes application code with operational artifacts, leaks PII into history, and bloats the repo. Treat the data import as a one-shot operator step instead — the only thing committed to source is schema.

The flow is three manual steps, run once per target database (preview, then production):

1. **Export from the source DB** (`pg_dump` as in Phase 1).
2. **Make sure the target DB is provisioned and has schema.** Push the branch so Netlify provisions the new database and auto-runs schema migrations. The DB exists now but is empty.
3. **Import.** Pull the target DB's `NETLIFY_DB_URL` out of Netlify and pipe the dump into `psql`.

### Getting `NETLIFY_DB_URL` for a preview or production deploy

This is the "escape hatch" use of the env var — application code should never touch it directly, but the migration operator needs it this one time:

```bash
# Preview context (one specific branch)
netlify env:get NETLIFY_DB_URL --context deploy-preview

# Production
netlify env:get NETLIFY_DB_URL --context production
```

If the CLI surface is ever restricted, the same value is visible in the Netlify UI under **Project configuration → Database**.

### Running the import

```bash
export NETLIFY_DB_URL='postgres://...'   # from the step above
psql "$NETLIFY_DB_URL" < tmp/prod-data.sql
```

Run this against the **preview** DB first. Use that run as your dry rehearsal — it both validates the dump against the new schema and gives you a concrete timing for the production cutover window.

### Handling rows with secrets or PII

Exclude them from the dump rather than importing and rotating. Common offenders in a Netlify project: OAuth token tables (Strava, GitHub, etc.), API key stores, webhook secrets.

For `pg_dump`:

```bash
pg_dump ... --exclude-table=public.strava_tokens "$PROD_URL" > tmp/prod-data.sql
```

Restore those rows out-of-band after cutover — typically by rerunning whatever OAuth bootstrap flow created them in the first place.

### Rough edge: broken snapshot chain from mixed-prefix history

When a project has an existing migrations history that mixes `unix` and `timestamp` prefixes (common after switching the `prefix` config mid-project), Drizzle's snapshot chain — used by `generate` to diff against the last known schema state — may be corrupted in a way that's invisible until the next `generate`:

```
Error: [.../<A>_snapshot.json, .../<B>_snapshot.json] are pointing to a parent snapshot: ... which is a collision.
```

The fix is to walk the chain (`id` ↔ `prevId` fields in each `meta/<tag>_snapshot.json`) in `_journal.json` order and patch any broken `prevId` to the previous entry's `id`. This only touches meta files; it does not change any SQL that has already been applied to production.

## Phase 3.5 — Cutover window

There **is** a downtime window. Any write to the source DB between the final export and the import lands nowhere. The flow above doesn't hide that — it gives you a rehearsal on the preview deploy so you know roughly how long the window will be, and you can plan around it:

- For small projects (single-user, low write rate), the window is typically seconds to a few minutes — acceptable.
- For real production systems, extend the flow with a read-only window, a catch-up pass using `updated_at`/CDC, or application-level dual-write. Those are out of scope for this guide.

Before the production import: put the site in maintenance mode or pause writes however your app supports, re-export to capture the latest rows, import, cut over, resume.

## Phase 4 — Push and observe

_TBD: what happens when a deploy preview branch installs `@netlify/database` for the first time — does a DB get provisioned? Do migrations run? Any surprises with the existing `./migrations/` path._

## Phase 5 — Production cutover

_TBD: merging to main, production provisioning, confirming data landed intact._

## Phase 6 — Cleanup

_TBD: remove `@netlify/neon`, delete now-unused migration scripts, update `CLAUDE.md`._

## Rough edges encountered

_(Running log — each item here should end up reflected in the relevant phase above.)_

- `pg_dump` 18 meta-commands break naive replay — strip `\restrict` / `\unrestrict`.
- Neon Auth tables (`neon_auth.*`) live in the same database but do not belong in the new application DB. Filter by schema.
