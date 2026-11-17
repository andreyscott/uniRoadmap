# Roadmap content

All course and skill content lives here as JSON. Adding a new course means adding a file;
no code changes needed.

```
content/
├── faculties.json      # faculty ids, names, line colours
├── quiz.json           # Course Finder questions and tag weights
├── courses/<slug>.json # one degree roadmap per file
└── skills/<slug>.json  # non-degree skill roadmaps
```

Files are validated against zod schemas in `src/lib/content/` at build time and by
`npm run db:seed`, so a typo fails loudly instead of shipping a broken page.

Node ids (e.g. `cs-y1-discrete-math`) are permanent: user progress is stored against them.
Rename a title freely, but never change or reuse an id.

The schema and the first three courses are added in the "schema + seed" step.
