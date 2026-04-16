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

Because the dump only ever flows operator-shell → target DB — never into source control, a pastebin, or chat — tables containing credentials (OAuth tokens, API keys, webhook secrets) are fine to include. They never land anywhere they weren't already.

**Exclude a table from the dump only if the dump will be committed or shared.** In that case, exclude at dump time and restore the rows out-of-band (rerun the OAuth bootstrap, regenerate the key, etc.):

```bash
pg_dump ... --exclude-table=public.strava_tokens "$PROD_URL" > tmp/prod-data.sql
```

If the dump stays in `tmp/` (gitignored) and is piped directly into `psql`, no exclusion is needed.

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

## Phase 4 — Migration runner sorts lexicographically, not by journal order

The first time we pushed the branch, the preview build failed with:

```
Database migration failed: error running migrations: running migrations: ERROR 1771681020_solid_timeslip.sql: failed to run SQL
```

The file itself is fine — one clean `ALTER TABLE "tasks" ADD COLUMN "skipped" ...` statement. The problem is **apply order**.

Netlify's migration runner sorts migration files **lexicographically by filename**. The skill even states this explicitly ("Files are applied lexicographically, so always configure timestamp prefixes"). But a project whose history has mixed prefixes — for example, an older run of migrations written with `prefix: 'unix'` and a newer run with `prefix: 'timestamp'` — puts the 10-digit unix names **before** the 14-digit timestamp names lexicographically, even though the unix files were generated later chronologically:

```
1771681020_solid_timeslip.sql      <- applied first (wrong)
1772373023_bent_captain_america.sql
1776100778_cooing_echo.sql
20260214140526_clean_blue_shield.sql  <- creates the `tasks` table, applied later (wrong)
...
```

`1771681020_solid_timeslip.sql` runs before `20260214140526_clean_blue_shield.sql` (which creates the `tasks` table), so the `ALTER TABLE` hits a table that doesn't exist yet.

This does **not** surface locally with `drizzle-kit migrate` because Drizzle applies migrations in `idx` order from `_journal.json`, not by filename. So a divergence between Drizzle Kit's runner and Netlify's migration runner is possible on any project whose filenames don't sort into the same order as the journal.

### Fix

Rename the offending files to timestamp prefixes that preserve the intended apply order, and update `_journal.json` so its `tag` values still match. The `when` values are already authoritative unix-millis timestamps, so they can drive the rename — no guessing:

```bash
# Each tag in _journal.json has a `when` (ms). Convert and rename.
# Example for when=1771681020596:
date -u -r 1771681020 +%Y%m%d%H%M%S   # -> 20260221133700
git mv netlify/db/migrations/1771681020_solid_timeslip.sql \
       netlify/db/migrations/20260221133700_solid_timeslip.sql
git mv netlify/db/migrations/meta/1771681020_snapshot.json \
       netlify/db/migrations/meta/20260221133700_snapshot.json
# ...and patch the tag in _journal.json.
```

The snapshot `id` / `prevId` chain stays intact — those are UUIDs, not derived from filenames.

### Guide checklist for anyone migrating

Before pushing the migration branch, verify that **the lexicographic sort of `netlify/db/migrations/*.sql` matches the `idx` order in `_journal.json`**. If not, rename before pushing. This is the single most effective pre-flight check.

## Rough edges encountered

_(Running log.)_

- `pg_dump` 18 emits `\restrict` / `\unrestrict` psql meta-commands — strip before replay.
- Neon Auth tables (`neon_auth.*`) live in the same database but do not belong in the new application DB — filter by `--schema=public`.
- `@netlify/database@0.6.x` does not export `withNetlifyDatabase` or a `/drizzle` subpath despite the skill showing those imports. Wire Drizzle manually.
- Mixed migration prefixes (unix + timestamp) break the snapshot chain and break Netlify's lexicographic apply order — rename to unified timestamp prefixes before the first migration deploy.
- Tables containing secrets/PII must be excluded from the dump and restored out-of-band.
- Production data should never land in git. The migration runner's "DML migration" pattern is good for small committed data (lookup tables, seeds) but not for real customer/user data.
