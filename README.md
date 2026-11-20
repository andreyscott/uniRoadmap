# Uniroadmap

Study roadmaps for university students: find a course that fits you, then follow a clear
year-by-year path through it.

Built with Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, shadcn/ui,
Prisma 7 and Supabase (Postgres + Auth).

## Getting started

Requires Node.js 20.9 or newer (24 recommended).

```bash
npm install              # also generates the Prisma client
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000. Pages that only show content don't need a database. In development, edits to `content/` show up when you refresh.

### Database setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project, open **Connect → ORMs → Prisma** and copy the two connection strings into
   `.env.local` as `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (port 5432).
3. Create the tables, then load the content:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

The migration enables row-level security on every table, so Supabase's public Data API can't
read or write them. The app only reaches the database through Prisma on the server.

## Scripts

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Start the dev server (Turbopack)                               |
| `npm run build`         | Production build                                               |
| `npm run lint`          | Lint with ESLint                                               |
| `npm run typecheck`     | Type-check with `tsc`                                          |
| `npm test`              | Run the test suite (Vitest)                                    |
| `npm run content:check` | Validate everything in `content/` and print a summary          |
| `npm run db:migrate`    | Apply database migrations                                      |
| `npm run db:seed`       | Copy `content/` into the database (safe to re-run)             |
| `npm run db:studio`     | Browse the database in Prisma Studio                           |

## Adding or editing content

Courses and skill roadmaps are JSON files in `content/`. See [content/README.md](content/README.md)
for the format. After editing, run `npm run content:check`, then `npm run db:seed`.

## Project layout

- `content/`: roadmap content as JSON (the source of truth)
- `prisma/`: database schema, migrations and seed script
- `src/app/`: routes
- `src/components/`: UI (`ui/` is shadcn/ui, `layout/` is the app shell)
- `src/lib/content/`: content schemas (zod) and loaders
- `src/lib/db.ts`: Prisma client
- `tests/`: Vitest tests
