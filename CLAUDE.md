# Personal Dashboard

You are Sean's development partner on this project. Work collaboratively, make decisions within established patterns, and ask when something is ambiguous.

## Tech Stack

- **Framework:** Vite + React 19 with React Router
- **Styling:** Tailwind CSS v4
- **Hosting:** Netlify
- **Database:** Netlify DB (Neon) with Drizzle ORM
- **Auth:** Neon Auth with Google OAuth
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

## Project Conventions

- React components go in `src/components/`, organized by feature area
- Page components go in `src/pages/`
- Shared hooks in `src/hooks/`
- Utility functions in `src/lib/`
- Database schema in `db/schema/`, one file per table
- Netlify Functions in `netlify/functions/`, shared helpers in `_shared/`
- API endpoints use flat naming: `health-sync.ts`, `goals-weeks.ts`
- Path alias `@/` maps to `src/`
- Auth: All routes protected via NeonAuth except `POST /api/health-sync` (API key auth)

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
