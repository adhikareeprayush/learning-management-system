# LMS System

Portfolio / skill-showcase learning platform — demo data, sandbox payments, and
ImageKit-hosted assets. Not intended as a live commercial product.

## Quick start (Docker Postgres + local Next)

Postgres runs in Docker. The Next app uses the host `node_modules` for fast reloads.

```bash
# 1) Start database
docker compose up -d db

# 2) Point .env at Docker Postgres (port 5435 — host 5432 is often busy)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5435/lms

# 3) Migrate + seed
pnpm db:migrate:deploy
pnpm db:seed

# 4) Run the app
pnpm dev
```

App: http://localhost:3005

### Demo accounts (password `password123`)

| Email | Role |
|-------|------|
| alice@example.com | Student |
| instructor@example.com | Instructor |
| admin@edujarr.com | Admin |

### Full Docker (db + web)

```bash
pnpm docker:up      # builds/starts services
pnpm docker:logs
pnpm docker:down
```

`web` mounts the project and runs `next dev` inside `node:22-bookworm-slim`. Prefer the hybrid flow above if image builds are slow.

### Container database seeding

The production image always applies pending migrations at startup, but it does
not seed data by default. This prevents a container restart from overwriting
account credentials with the demo passwords from `seed.ts`.

For a new disposable/demo deployment, opt in for its initial container start:

```bash
SEED_DATABASE_ON_START=true
```

Remove the setting (or set it to `false`) immediately after that initial start.
The local quick-start and `pnpm docker:dev` workflows still run `pnpm db:seed`
explicitly, so the demo-account workflow is unchanged.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next on port 3005 |
| `pnpm db:migrate:deploy` | Apply migrations |
| `pnpm db:seed` | Seed users, 7 courses (54 lessons), 5 roadmaps, newsletter demo data |
| `pnpm assets:sync-imagekit` | Upload `public/images` to ImageKit (`/lms/static/`) |
| `pnpm docker:up` | Compose up |
| `pnpm docker:down` | Compose down |

## Backend API

Mutation routes require a Better Auth session and enforce role and course
ownership checks on the server. The implemented surface covers courses, modules,
lessons, enrollment and progress, assignments, submissions and grading, reviews,
instructor student lists, admin user roles, and media uploads under `/api`.

### Media providers

Non-video assets upload server-side to ImageKit. Lesson videos default to an
unlisted YouTube upload; the returned watch URL works with the existing React
Player component.

Copy the media variables from `.env.example` into `.env.local`. ImageKit needs a
private API key. YouTube uploads require a Google OAuth client and a refresh token
authorized with the `youtube.upload` scope; an API key alone cannot upload videos.
New, unaudited YouTube API projects may have uploads forced to private by Google.

### Production images (ImageKit)

All course thumbnails, avatars, marketing images, and certificate assets resolve
through ImageKit when `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` is set.

Before the first production deploy:

```bash
# 1) Configure ImageKit keys in .env
# 2) Upload bundled static assets once
pnpm assets:sync-imagekit

# 3) Migrate + seed (seed stores ImageKit URLs when the endpoint is set)
pnpm db:migrate:deploy
pnpm db:seed
```

User uploads (profile photos, course thumbnails, submissions) already go through
`/api/upload` → ImageKit at runtime.

### Khalti (sandbox demo only)

Paid courses can demonstrate a Khalti checkout flow using the **sandbox** API on
both localhost and your VPS. Real Khalti production keys are not used.

Optional — add a sandbox key from [test-admin.khalti.com](https://test-admin.khalti.com):

```env
KHALTI_SECRET_KEY=your_sandbox_live_secret_key
```

If the key is omitted, paid courses enroll normally without the payment step.
