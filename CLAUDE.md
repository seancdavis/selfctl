# Personal Dashboard

You are Sean's development partner on this project. Work collaboratively, make decisions within established patterns, and ask when something is ambiguous.

## Tech Stack

- **Framework:** Vite 7 + React 19 with React Router
- **Styling:** Tailwind CSS v4
- **Hosting:** Netlify
- **Database:** Netlify DB (Neon) with Drizzle ORM
- **Auth:** Neon Auth with Google OAuth (currently broken — see Known Issues)
- **Charting:** Recharts
- **Icons:** Lucide React
- **Markdown:** marked

## Development

### Local Development

```bash
# Start dev server (Netlify Vite plugin injects environment)
npm run dev # runs: vite
```

### Database Commands

```bash
# Generate migration after schema changes
npm run db:generate

# Run migrations (preview branch)
npm run db:migrate

# Run migrations (production - requires confirmation)
npm run db:migrate:prod

# Open Drizzle Studio
npm run db:studio
```

## Known Issues

### Neon Auth broken on c-3 cluster

Neon Auth is on the `c-3` cluster (`ep-steep-term-ajzuikc7.neonauth.c-3.us-east-2.aws.neon.tech`) which has an unregistered Google OAuth redirect URI. This causes `redirect_uri_mismatch` errors. Reported to Neon Discord. Cannot disable/re-enable auth in Neon dashboard currently.

**Workaround:** Server-side `BYPASS_AUTH=true` env var (set in Netlify for dev context, and in `.env.local` for local dev). The auth flow:
1. Frontend tries Neon Auth session first
2. If that fails, falls back to `GET /api/auth-check` which returns a mock user when `BYPASS_AUTH=true`
3. `requireAuth()` in functions also bypasses DB approval check when `BYPASS_AUTH=true`

When Neon Auth is fixed, remove `BYPASS_AUTH` from env vars and the bypass logic in `auth-check.ts` and `_shared/auth.ts`.

## Project Structure

### Routes (in App.tsx)

```
/                                    Dashboard
/health                              Weight & Body (time periods, aggregation)
/goals/weekly                        Weekly Goals list
/goals/weekly/new                    Week Wizard (generate new week)
/goals/weekly/:weekId                Week View (task list with checkboxes)
/goals/weekly/:weekId/tasks/:taskId  Task Detail (notes, status toggle)
/goals/backlog                       Backlog list
/goals/backlog/:itemId               Backlog Item Detail (notes, move to week)
/goals/recurring                     Recurring Tasks (CRUD, pause/resume)
/settings/categories                 Categories (CRUD)
```

### Key Files

- `src/App.tsx` — Routes, auth gating, providers
- `src/hooks/useAuth.ts` — Auth flow (Neon Auth → bypass fallback)
- `src/hooks/useAsyncData.ts` — Generic data fetching hook with refetch and setData
- `src/hooks/usePageTitle.ts` — Dynamic `<title>` (`Page | Dashboard`)
- `src/hooks/useDarkMode.ts` — Dark mode with localStorage + system preference
- `src/lib/api.ts` — API client with typed endpoints for health, goals, weeks, tasks, backlog, notes, recurring, categories
- `src/lib/scores.ts` — Week completion scoring and staleness styling
- `src/lib/dates.ts` — Week ID helpers (YYYY-WNN format)
- `src/lib/health-stats.ts` — Weight data aggregation (weekly/monthly averages)
- `src/contexts/CategoriesContext.tsx` — Shared categories data
- `src/components/layout/` — AppLayout, Sidebar, Header (dark mode toggle)
- `src/components/health/WeightChart.tsx` — Recharts line chart for weight trends

### API Endpoints (Netlify Functions)

- `POST /api/health-sync` — iOS health data sync (API key auth via `HEALTH_SYNC_API_KEY`)
- `GET /api/health/weight?days=N` — Weight entries (days=0 for all-time)
- `GET /api/auth-check` — Auth status check (bypass support)
- `goals-weeks.ts` — Week CRUD + list
- `goals-weeks-new.ts` — Week generation wizard data + create
- `goals-tasks.ts` — Task CRUD + toggle status
- `goals-backlog.ts` — Backlog CRUD + move to week
- `goals-notes.ts` — Notes CRUD (for tasks and backlog items)
- `goals-recurring.ts` — Recurring tasks CRUD + toggle active
- `goals-categories.ts` — Categories CRUD
- `goals-follow-ups.ts` — Follow-ups list
- `goals-attachments.ts` / `goals-upload.ts` — File attachments via Netlify Blobs

### Database Schema (`db/schema/`)

One file per table: `weight-entries`, `weeks`, `tasks`, `backlog-items`, `notes`, `recurring-tasks`, `categories`, `follow-ups`, `attachments`, `approved-users`, `user-profiles`

## Project Conventions

- React components in `src/components/`, organized by feature area
- Page components in `src/pages/`, mirroring route structure
- Shared hooks in `src/hooks/`
- Utility functions in `src/lib/`
- Database schema in `db/schema/`, one file per table, re-exported from `db/schema/index.ts`
- Netlify Functions in `netlify/functions/`, shared helpers in `_shared/`
- API endpoints use flat naming: `health-sync.ts`, `goals-weeks.ts`
- Path alias `@/` maps to `src/`
- Auth: All routes protected via Neon Auth except `POST /api/health-sync` (API key auth)
- Dark mode: Layout shell (sidebar, header, main container) has dark classes; page content does not yet
- Page titles set via `usePageTitle` hook in each page component

## Skills Reference

When working on specific areas, reference these skills:

- `/skills/vite-best-practices` - Vite + React patterns
- `/skills/auth-design` - Authentication implementation
- `/skills/data-storage` - Database patterns with Drizzle
- `/skills/routing-design` - URL structure with React Router
- `/skills/feedback` - Toast notifications
- `/skills/forms` - Form handling patterns
- `/skills/netlify-functions` - API endpoint patterns
- `/skills/component-design` - Component organization
- `/skills/logging-and-monitoring` - Server-side logging
- `/skills/file-storage` - Netlify Blobs for attachments

## Commit Guidelines

- Make atomic commits with clear messages
- Use conventional commit format: `type: description`
- Types: feat, fix, refactor, docs, style, test, chore
