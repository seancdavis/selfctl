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
- **Drag-and-drop:** @dnd-kit (core, sortable, utilities)

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
/goals/weekly/current                Active week (find by date range, or "no active week" page)
/goals/weekly/new                    Week Wizard (editable label/dates, generate new week)
/goals/weekly/:weekLabel             Week View (task list, inline edit label/dates, adjacent-week nav)
  /tasks/new                         → Task add modal (nested)
  /tasks/:taskId                     → Task edit modal (nested, notes, status, delete)
/goals/backlog                       Backlog list
  /new                               → Backlog add modal (nested)
  /:itemId                           → Backlog edit modal (nested, notes, move-to-week, delete)
/goals/recurring                     Recurring Tasks (CRUD, pause/resume)
  /new                               → Recurring task add modal (nested)
  /:taskId                           → Recurring task edit modal (nested)
/settings/categories                 Categories (CRUD, tag management)
  /new                               → Category add modal (nested)
  /:id                               → Category edit modal (nested, tags, delete)
```

### Key Files

- `src/App.tsx` — Routes, auth gating, providers
- `src/hooks/useAuth.ts` — Auth flow (Neon Auth → bypass fallback)
- `src/hooks/useAsyncData.ts` — Generic data fetching hook with refetch (background, no loading flash) and setData
- `src/hooks/usePageTitle.ts` — Dynamic `<title>` (`Page | Dashboard`)
- `src/hooks/useDarkMode.ts` — Dark mode with localStorage + system preference
- `src/lib/api.ts` — API client with typed endpoints for health, goals, weeks, tasks, backlog, notes, recurring, categories, tags
- `src/lib/scores.ts` — Week completion scoring and staleness styling
- `src/lib/dates.ts` — Week label helpers (YYYY-NN format), date suggestions for wizard
- `src/lib/health-stats.ts` — Weight data aggregation (weekly/monthly averages)
- `src/contexts/CategoriesContext.tsx` — Shared categories data
- `src/components/layout/` — AppLayout, Sidebar, Header (dark mode toggle)
- `src/components/health/WeightChart.tsx` — Recharts line chart for weight trends
- `src/components/ui/Modal.tsx` — Shared modal overlay (Escape/backdrop close)
- `src/components/ui/AutoResizeTextarea.tsx` — Auto-growing textarea for markdown
- `src/components/goals/NotesSection.tsx` — Shared notes UI (add + list) for task/backlog modals
- `src/components/goals/TagSelector.tsx` — Tag toggle/create UI filtered by category

### API Endpoints (Netlify Functions)

- `POST /api/health-sync` — iOS health data sync (API key auth via `HEALTH_SYNC_API_KEY`)
- `assistant.ts` — AI assistant endpoints (API key auth via `ASSISTANT_API_KEY`; see `docs/assistant-api.md`)
- `GET /api/health/weight?days=N` — Weight entries (days=0 for all-time)
- `GET /api/auth-check` — Auth status check (bypass support)
- `goals-weeks.ts` — Week CRUD + list + task reorder + find-active + PATCH (label/dates) + overlap validation
- `goals-weeks-new.ts` — Week generation wizard data + create (accepts label, startDate, endDate)
- `goals-tasks.ts` — Task CRUD + toggle status + tags
- `goals-backlog.ts` — Backlog CRUD + move to week + tags
- `goals-notes.ts` — Notes CRUD (for tasks and backlog items)
- `goals-recurring.ts` — Recurring tasks CRUD + toggle active + tags
- `goals-categories.ts` — Categories CRUD + description field
- `goals-tags.ts` — Tags CRUD (scoped to categories)
- `goals-follow-ups.ts` — Follow-ups list
- `goals-attachments.ts` / `goals-upload.ts` — File attachments via Netlify Blobs

### Database Schema (`db/schema/`)

One file per table: `weight-entries`, `weeks` (UUID PK + label), `tasks` (UUID weekId FK), `backlog-items`, `notes`, `recurring-tasks`, `categories`, `tags`, `follow-ups`, `attachments`, `approved-users`, `user-profiles`

**Weeks architecture:** Weeks use UUID primary keys internally. The `label` column (e.g., `2026-08`) is the user-facing identifier used in URLs and API lookups. Dates (startDate, endDate) are user-settable, not derived from the label. Overlap validation prevents conflicting date ranges.

## Project Conventions

- React components in `src/components/`, organized by feature area
- Page components in `src/pages/`, mirroring route structure
- Shared hooks in `src/hooks/`
- Utility functions in `src/lib/`
- Documentation in `docs/` (public API docs)
- Database schema in `db/schema/`, one file per table, re-exported from `db/schema/index.ts`
- Netlify Functions in `netlify/functions/`, shared helpers in `_shared/`
- API endpoints use flat naming: `health-sync.ts`, `goals-weeks.ts`
- Path alias `@/` maps to `src/`
- Auth: All routes protected via Neon Auth except `POST /api/health-sync` (API key auth via `HEALTH_SYNC_API_KEY`) and `/api/assistant/*` (API key auth via `ASSISTANT_API_KEY`)
- Dark mode: Layout shell (sidebar, header, main container) has dark classes; page content does not yet
- Page titles set via `usePageTitle` hook in each page component

### Click-to-Edit Modal Pattern

All list pages use a consistent URL-routed modal pattern:
- Parent page renders list + `<Outlet context={{ refetch, data, setData }} />`
- Child routes render modal components via nested `<Route>` in App.tsx
- Modal uses `useParams()` for new vs edit, `useOutletContext()` for optimistic updates
- Rows are fully clickable (`onClick → navigate`), no per-row action buttons
- Toast feedback on all mutations via `useToast()`
- `AutoResizeTextarea` for markdown fields
- Tags: stored as `text[]` on tasks/backlog items/recurring tasks, managed via `TagSelector` component scoped to category (uses `<div>` not `<form>` to avoid nested form issues)

### Optimistic Updates

- Mutations should optimistically update local state via `setData`/`setTasks` before or after the API call, then `refetch` in the background to sync
- `useAsyncData.refetch()` does NOT show loading spinner — only the initial fetch shows loading
- New task creation: API response is inserted into the task list immediately; background refetch syncs server state

### Task Reordering (Week View)

- Uses `@dnd-kit` with `DndContext` + `SortableContext` per category group
- `SortableTaskRow` component with grip handle (`GripVertical`) as drag handle
- `PointerSensor` with `distance: 5` activation constraint to prevent accidental drags on click
- Reordering stays within category boundaries (each category has its own `DndContext`)
- `groupedTasks` memo sorts by `sortOrder` — optimistic `sortOrder` updates render immediately

### Markdown Rendering

- Rendered HTML containers use `markdown-content` CSS class for list/paragraph styling
- Styles defined in `src/index.css`: dashes for `<ul>`, no left margin, compact spacing

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
