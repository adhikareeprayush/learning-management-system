# LMS System

Portfolio / skill-showcase learning platform — demo data, manual payment enrollment, and
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

### Manual payments (eSewa, mobile banking, Khalti QR)

Paid courses require students to pay offline and upload a screenshot. Admins configure payment methods and review submissions under **Admin → Payments**.

1. Student clicks Enroll on a paid course → sees eSewa / mobile banking / Khalti QR details
2. Student pays and uploads a screenshot with optional transaction reference
3. Admin approves → student is enrolled automatically

Seed data includes three demo payment methods. Upload QR images in the admin panel when ready.

## Deploy: Vercel + Supabase

**Database:** [Supabase](https://supabase.com) (managed Postgres). **App:** [Vercel](https://vercel.com).

### 1. Supabase project

1. Create a project at supabase.com
2. In **Project Settings → Database**, copy:
   - **Transaction pooler** URI (port `6543`) → `DATABASE_URL`
   - **Direct connection** URI (port `5432`) → `DIRECT_URL`
3. Append `?pgbouncer=true` to the pooler URL if not present (required for Prisma on serverless)

### 2. Vercel project

Connect the Git repo and set environment variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase transaction pooler URL |
| `DIRECT_URL` | Supabase direct connection URL |
| `BETTER_AUTH_SECRET` | Random 32+ char secret |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | Same as above |
| `IMAGEKIT_*` | ImageKit keys (required for uploads) |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | ImageKit CDN endpoint |

Vercel runs `pnpm vercel-build`, which applies Prisma migrations then builds Next.js.

### 3. First deploy checklist

```bash
# Locally against Supabase (one-time seed)
DATABASE_URL="..." DIRECT_URL="..." pnpm db:migrate:deploy
DATABASE_URL="..." DIRECT_URL="..." pnpm db:seed
pnpm assets:sync-imagekit   # if using ImageKit for static assets
```

After deploy, sign in as `admin@edujarr.com` / `password123` and configure payment methods under **Admin → Payments**.

### Local development

Use Docker Postgres (optional) or point `.env` at your Supabase **direct** URL for local `pnpm dev`:

```bash
docker compose up -d db   # optional local Postgres on port 5435
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```
