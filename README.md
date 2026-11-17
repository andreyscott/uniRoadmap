# Uniroadmap

Study roadmaps for university students: find a course that fits you, then follow a clear
year-by-year path through it.

Built with Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4 and shadcn/ui.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Command         | What it does                       |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the dev server (Turbopack)   |
| `npm run build` | Production build                   |
| `npm start`     | Serve the production build         |
| `npm run lint`  | Lint with ESLint                   |

## Project layout

- `content/`: roadmap content as JSON (see `content/README.md`)
- `src/app/`: routes
- `src/components/ui/`: shadcn/ui primitives
- `src/components/layout/`: header, footer, theme toggle
- `src/lib/`: shared helpers and site config
