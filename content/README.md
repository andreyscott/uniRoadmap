# Roadmap content

All course and skill content lives here as JSON. Adding a course means adding a file; no code
changes needed.

```
content/
├── faculties.json        # faculties and their line colour
├── courses/<id>.json     # one degree per file (the filename must match "id")
└── skills/<id>.json      # non-degree skill roadmaps
```

The full schema, with comments, is in [`src/lib/content/schemas.ts`](../src/lib/content/schemas.ts).

## Workflow

1. Edit or add a file.
2. Run `npm run content:check`. It tells you exactly which field is wrong.
3. Run `npm run db:seed` to copy the changes into the database.

## Courses

| Field               | Notes                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| `id`                | URL slug, e.g. `computer-science` → `/courses/computer-science`              |
| `faculty`           | An `id` from `faculties.json`                                                |
| `summary`           | One sentence (≤200 chars), used on cards and as the meta description         |
| `overview`          | A few paragraphs separated by blank lines (`\n\n`)                           |
| `durationYears`     | Typical length; must equal the number of roadmap stages                      |
| `difficulty`        | `beginner`, `intermediate` or `advanced`                                     |
| `entryRequirements` | List of `{ exam, subjects, notes? }`; `exam` is `olevel`, `utme`, `alevel` or `us-highschool` |
| `careers`           | List of `{ title, description }`                                             |
| `tags`              | Quiz matching weights from 1 to 3, e.g. `{ "maths": 3, "helping-people": 1 }`. Allowed tags are listed in `schemas.ts` |
| `roadmap`           | Optional. A course without one is still listed and matched by the quiz       |

## Roadmaps

A roadmap has `stages` (numbered 1..n, e.g. one per year) and `nodes`:

| Field         | Notes                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| `id`          | **Permanent and unique across all files.** Convention: `<prefix>-y<year>-<topic>`, e.g. `cs-y1-discrete-math` |
| `type`        | `core`, `elective` or `optional-skill`                                          |
| `stage`       | Which stage (year) it belongs to                                                |
| `parent`      | Optional id of the topic it builds on (same roadmap, same or earlier stage)     |
| `keyConcepts` | At least two                                                                    |
| `resources`   | At least one free resource: `{ title, url (https), type }`, where `type` is `video`, `course`, `book`, `article` or `tool` |

Nodes appear in the order they're written within each stage. The first core node of each stage
is also the stop shown for that year on the home page, so list the topic that best defines the
year first.

**Never rename or reuse a node id.** User progress is stored against it. You can change a
node's title, description or position freely. If you delete a node, the seed script warns
instead of deleting it from the database; run `npm run db:seed -- --prune` to remove it
(this also deletes users' progress on it).

## Checking links

Prefer stable sources (OpenStax, MIT OpenCourseWare, Khan Academy, university pages, official
standards bodies) and open each link before adding it.
