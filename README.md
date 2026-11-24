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

### Sign-in setup (Supabase Auth)

Students sign in with a one-time email link (no passwords). Progress is saved per account.

1. Copy the project URL and publishable key from **Project Settings → API Keys** into
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Use the publishable key (`sb_publishable_...`), never the secret key. Anything in a
   `NEXT_PUBLIC_` variable is sent to every browser, so `npm run dev` and `npm run build` stop
   with an error naming the variable if a secret key is found in one.
2. In **Authentication → URL Configuration**, set the Site URL to your live address and add
   these redirect URLs: `http://localhost:3000/**` and `https://<your-domain>/**`.
3. Recommended: in **Authentication → Emails → Magic Link**, change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`.
   The default template also works, but only when the link is opened in the same browser that
   asked for it, which often isn't true on phones (email apps open links in their own browser).
4. Supabase's built-in email sender only delivers to your project's team members and is
   heavily rate-limited. Before real students sign in, connect your own SMTP provider under
   **Authentication → Emails → SMTP Settings**.
5. Run `npm run db:migrate` and `npm run db:seed` so progress has topics to point at.

Pages stay prerendered: the browser reads the session to show the right UI, and the server
re-checks it in `/api/progress` and in the Server Action that saves progress. There's no
proxy (middleware): nothing server-rendered reads the session, and the browser client refreshes
its own tokens.

### Universities and the admin area

Each university can have its own version of a course: its department, UTME subject combination,
admission notes and curriculum (module codes, titles, credit units and semesters, year by year).
Students find them at `/universities`. This data lives in the database, not in `content/`, and is
edited by people at `/admin`:

- **Admins** edit every university, add universities and manage who has access at `/admin/people`.
  Anyone whose email is in `ADMIN_EMAILS` is always an admin; that's how the first admin gets in.
- **Editors** can only edit the universities they've been given.
- Changes go live straight away. Every change is listed at `/admin/history` with who made it, and
  the latest change to anything can be undone.
- `content/universities.json` is a starter list. The seed adds any university that's missing and
  never overwrites one that already exists, so admin edits are safe.

Please enter course codes, units and cut-offs from official departmental handbooks. Wrong numbers
mislead students choosing a school.

## Scripts

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Start the dev server (Turbopack)                               |
| `npm run build`         | Production build                                               |
| `npm run lint`          | Lint with ESLint                                               |
| `npm run typecheck`     | Type-check with `tsc`                                          |
| `npm test`              | Run the test suite (Vitest). Set `TEST_DATABASE_URL` to a throwaway, migrated and seeded database to also run the progress database tests |
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
