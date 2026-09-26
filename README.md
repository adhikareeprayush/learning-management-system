# Convolution LMS

A learning platform for a single institute: courses and learning paths, YouTube
lesson videos, quizzes and assignments, verifiable certificates, NPR payments
approved from screenshots, and transactional email and newsletters.

- **Stack:** Next.js 16 (App Router), React 19, Prisma 7 on PostgreSQL, better-auth, ImageKit, YouTube Data API, SMTP email
- **Runs on:** Vercel + Supabase, or Docker
- **Needs:** Node 22+, pnpm 10.12.1 (`corepack enable` picks it up from `package.json`)

## Features

### Students

- Browse the catalog with search, category, level and price filters, and view course, learning-path and instructor pages.
- Accounts: register, sign in, forgot/reset password, and email verification. A banner reminds unverified users; with `AUTH_REQUIRE_EMAIL_VERIFICATION=true`, unverified users can't sign in. After signing in, users return to the page they came from.
- Enrollment: free courses enroll directly. For paid courses, the student pays by eSewa, Khalti QR or mobile banking, uploads a screenshot, and is enrolled when an admin approves it. Prices are in NPR only.
- Lessons with YouTube video, text, resources, quizzes and exercises, with progress tracking.
- Assignments with submissions, grades and feedback.
- Certificates:
  - A course certificate needs every lesson completed and every quiz passed.
  - Learning paths issue their own certificates.
  - PDFs carry a public verification link (`/verify/<credential-id>`).
- Payment history with PDF receipts, course reviews, notifications, and profile and settings pages.

### Instructors

- Build courses (modules, lessons, quizzes and file resources) and set an NPR price. Anything under Rs 10 counts as free.
- Upload lesson videos straight from the browser to YouTube (unlisted), and images and documents straight to ImageKit.
- Submit a course for review. The admin publishes it or returns it with a review note, and the instructor is emailed either way.
- Assignments and grading, student rosters, course reviews and analytics.

### Admins

- Dashboard and reports.
- Course review queue: publish, return with notes, or archive.
- Payments: approve or reject screenshots, and issue refunds.
- Users: change roles, suspend or unsuspend, delete or anonymize, and enroll or unenroll users manually.
- Moderate course reviews and manage learning paths.
- Newsletter: manage subscribers and send campaigns in batches, with one-click unsubscribe (RFC 8058 `List-Unsubscribe`).
- Institute settings: name, support email, phone, address, logo and colour, plus a test email.

### Platform

- Contact form. Messages are stored and emailed to `CONTACT_FORM_TO`, or to the support email if that isn't set.
- Notification emails for payments submitted and reviewed, enrollment changes, grades, course review decisions, certificates issued and password changes.
- Sitemap, `robots.txt` and generated Open Graph images.
- Security headers and a Content Security Policy (`next.config.ts`).
- Auth rate limits stored in Postgres, so they hold across serverless instances.
- Row Level Security enabled on every table.
- `GET /api/health` for load balancers.

## Architecture

| Area | Implementation |
|------|----------------|
| Web | Next.js 16.2 App Router, built with webpack (`next build --webpack`), React Compiler, Tailwind CSS 4 |
| Data | Prisma 7 with `@prisma/adapter-pg`. Schema in `schema.prisma`, migrations in `prisma/migrations`, CLI config in `prisma.config.ts`. One pooled client per process (`src/lib/db.ts`, `DB_POOL_MAX`) |
| Auth | better-auth (email + password, sessions, DB-backed rate limits). Suspended users are refused at session creation |
| Routing guard | `src/proxy.ts` sends signed-out visitors from `/student`, `/instructor` and `/admin` to `/login?next=…`. Layouts and page guards do the real checks |
| Images and files | ImageKit. The browser uploads directly with a one-time signature from `/api/upload/imagekit-auth`. In development without keys, files go to `public/uploads` |
| Lesson videos | YouTube Data API v3. The browser uploads to a resumable session created by `/api/upload/youtube/session` |
| Email | nodemailer over SMTP (`src/lib/email.ts`), templates in `src/lib/emails`. Printed to the console in development when SMTP isn't set |
| PDFs | pdf-lib + fontkit, with fonts vendored in `assets/certificate-fonts` |
| Startup | `src/instrumentation.ts` validates the environment (`src/env.ts`) and logs request errors as JSON (route, digest, no query strings) |

## Local development

```bash
pnpm install              # also runs `prisma generate`
cp .env.example .env      # the defaults work with the Docker database below
pnpm docker:up            # Postgres 16 on localhost:5435
pnpm docker:mail          # optional: Mailpit (SMTP :1025, inbox http://localhost:8025)
pnpm db:migrate:deploy
pnpm db:seed              # demo institute, users, courses, payments
pnpm dev                  # http://localhost:3005
```

To send email to Mailpit instead of the console, set `SMTP_HOST=127.0.0.1` and `SMTP_PORT=1025` in `.env`.

After editing `schema.prisma`, create a migration with `pnpm db:migrate`, which runs `prisma migrate dev`.

### Demo accounts

`pnpm db:seed` creates these accounts, all with the password `password123`:

| Email | Role |
|-------|------|
| alice@example.com, bob@example.com, carol@example.com | Student |
| instructor@example.com | Instructor |
| admin@convolutionlabs.com | Admin |

The login page and FAQ list them only when `NEXT_PUBLIC_DEMO_MODE=true`. Enable that for demo deployments only.

Never seed a real database. Under `NODE_ENV=production` the seed refuses to run unless `SEED_DEMO=true`.

## Email

`src/lib/email.ts` picks a mode:

| Mode | When | Behaviour |
|------|------|-----------|
| `smtp` | `SMTP_HOST` is set | Sends through the SMTP server; `EMAIL_FROM` is required |
| `console` | development without SMTP, or `EMAIL_TRANSPORT=console` | Prints the subject, links and text to the server log |
| `disabled` | production without SMTP | Drops mail with a warning |

In `disabled` mode, users can't reset passwords, verification isn't enforced, and the contact form is off.

Check a configuration with `pnpm email:test you@example.com`, or use **Admin → Settings → Send test email**.

Any SMTP provider works. Common settings:

| Provider | `SMTP_HOST` | `SMTP_PORT` / `SMTP_SECURE` | `SMTP_USER` | `SMTP_PASSWORD` |
|----------|-------------|-----------------------------|-------------|-----------------|
| Gmail / Google Workspace | `smtp.gmail.com` | `465` / `true` (or `587` / `false`) | your address | an [App Password](https://myaccount.google.com/apppasswords) (needs 2-Step Verification) |
| Zoho Mail | `smtp.zoho.com` (`smtp.zoho.eu`, `smtp.zoho.in`, … for your data centre) | `465` / `true` | your address | account or app-specific password |
| Brevo | `smtp-relay.brevo.com` | `587` / `false` | the SMTP login from Brevo → SMTP & API | an SMTP key |
| Resend | `smtp.resend.com` | `465` / `true` | `resend` | an API key |

Provider notes:

- **`EMAIL_FROM`:** Gmail and Zoho only send from the mailbox itself or a verified alias. Brevo and Resend need a verified sender or domain.
- **Deliverability:** add the provider's SPF and DKIM records, plus a DMARC record, to your domain.
- **Gmail limits:** about 500 messages a day on free accounts, which is too few for newsletters.

Newsletters are sent `NEWSLETTER_BATCH_SIZE` messages at a time (default 25, max 200). Each batch is one request to `src/app/api/admin/newsletter/campaigns`, so it stays under the 60-second function limit.

## Deployment: Vercel + Supabase

### 1. Database

In Supabase, open **Connect** and copy two connection strings:

- `DATABASE_URL`: the **transaction pooler** (port `6543`) with `?pgbouncer=true` appended. The app uses this for queries.
- `DIRECT_URL`: the **session pooler** (port `5432`). `prisma.config.ts` prefers it for the CLI, because migrations don't work through the transaction pooler.

Avoid `db.<ref>.supabase.co`. It is IPv6-only and unreachable from many networks.

The migrations enable Row Level Security on every table and add no policies. Supabase's Data API (the `anon` and `authenticated` roles) therefore can't read or write anything. The app connects as the table owner, so RLS doesn't affect it. Only add policies if you deliberately want to expose tables through the Data API.

### 2. Environment variables

Set these in Vercel for Production (and Preview, if you use previews):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Pooler URL (`:6543`, `?pgbouncer=true`) |
| `DIRECT_URL` | yes on Vercel | Session pooler URL (`:5432`), used by `prisma migrate deploy` |
| `BETTER_AUTH_SECRET` | yes | `openssl rand -base64 32`. Also signs newsletter unsubscribe links, so rotating it breaks the links in newsletters already sent |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | yes | Public URL, e.g. `https://lms.example.com` |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` | for uploads | Without them, uploads are disabled in production |
| `IMAGEKIT_URL_ENDPOINT`, `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | for uploads | Read at build time as well (CSP `img-src`, client URLs) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | recommended | See [Email](#email) |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` | for video uploads | See [Lesson videos](#lesson-videos-youtube) |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | no | `true` blocks unverified sign-ins; only enforced when email can be sent |
| `CONTACT_FORM_TO` | no | Contact form inbox; defaults to the institute's support email |
| `NEWSLETTER_BATCH_SIZE` | no | Default 25, max 200 |
| `NEXT_PUBLIC_DEMO_MODE` | no | `true` only for demos |
| `DB_POOL_MAX` | no | Connections per instance (default 3 on Vercel) |
| `BETTER_AUTH_TRUSTED_ORIGINS`, `DEFAULT_ORG_SLUG`, `IMAGEKIT_MAX_UPLOAD_MB`, `YOUTUBE_MAX_UPLOAD_MB` | no | See `.env.example` |

`NEXT_PUBLIC_*` values and the ImageKit endpoint are compiled in at build time, so redeploy after changing them.

On startup, `src/env.ts` checks this configuration. Without the required values, a production server exits (under `next start` or Docker) or fails every request (on Vercel). Missing uploads or email only log warnings.

### 3. Build and migrations

`vercel.json` runs `pnpm vercel-build`, which does three things:

1. Runs `prisma generate`.
2. Runs `prisma migrate deploy` (through `DIRECT_URL`), but only when `VERCEL_ENV=production`.
3. Runs `next build`.

Preview deployments never migrate. Point them at a separate database, such as a Supabase branch, if their schema can differ from production.

`vercel.json` also allows 60-second functions for the YouTube upload session, the server upload fallback and newsletter sending.

Uploads don't go through Vercel's 4.5 MB request body limit: images and documents go from the browser to ImageKit, and videos go from the browser to YouTube.

### 4. First admin

Don't run `pnpm db:seed` against production. From your machine, with the production `DATABASE_URL` or `DIRECT_URL`:

```bash
DATABASE_URL='postgresql://…:5432/postgres' \
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' ADMIN_NAME='Your Name' \
pnpm admin:create
```

The command does the following:

- Uses the same institute as the app: the one with slug `DEFAULT_ORG_SLUG` (default `convolution-labs`), otherwise the oldest one, otherwise a new one. The migrations already create a placeholder called "Edujarr Demo Institute", so rename it under **Admin → Settings**.
- Creates a verified admin account. `ADMIN_PASSWORD` must be at least 12 characters.
- Leaves an existing account unchanged. Run `pnpm admin:create --reset-password` to promote it and set the new password; that also lifts any suspension and signs out its sessions.

## Deployment: Docker

The `Dockerfile` builds a production image:

- Based on `node:22-bookworm-slim`, running as the non-root `node` user.
- Includes the Prisma CLI and migrations, the seed and admin scripts, and the certificate/OG fonts.
- Has a `HEALTHCHECK` on `/api/health`.
- Builds with BuildKit or the legacy builder.

On start, `docker/entrypoint.sh` runs these steps in order:

1. Waits for the database.
2. Runs `prisma migrate deploy`.
3. Seeds demo data, only if both `SEED_DATABASE_ON_START=true` and `SEED_DEMO=true`.
4. Runs `admin:create` if `ADMIN_EMAIL` is set. This is safe on every restart, because it leaves an existing account alone.
5. Starts `next start` on `PORT` (default 3005).

Public values are compiled in, so pass them as build args:

| Build arg | Notes |
|-----------|-------|
| `NEXT_PUBLIC_APP_URL` | Public URL |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_URL_ENDPOINT` | ImageKit origin for client URLs and the CSP |
| `NEXT_PUBLIC_DEMO_MODE` | `true` only for demo images |
| `NODE_OPTIONS` | Build heap, default `--max-old-space-size=4096` |

### With the bundled Postgres

```bash
cp .env.example .env    # fill in secrets, URLs, ImageKit, SMTP; set ADMIN_* for the first start
docker compose -f docker-compose.prod.yml up -d --build
```

The app listens on `127.0.0.1:3005`. Put a TLS-terminating reverse proxy such as Caddy or nginx in front of it; the app sends HSTS. Set `POSTGRES_PASSWORD` in `.env`, and remove `ADMIN_PASSWORD` once the admin exists.

### With an external database

```bash
docker build -t lms-web \
  --build-arg NEXT_PUBLIC_APP_URL=https://lms.example.com \
  --build-arg NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id .
docker run -d --init --name lms-web -p 127.0.0.1:3005:3005 --env-file .env lms-web
```

For Supabase, set both `DATABASE_URL` (pooler) and `DIRECT_URL`, because the entrypoint's migrations use `DIRECT_URL`.

### Production-like local run

`pnpm docker:web` builds the image and runs it against the `db` and `mail` compose services on http://localhost:3005 (stop `pnpm dev` first). It reads `BETTER_AUTH_SECRET`, `IMAGEKIT_*` and `ADMIN_*` from `.env`, and sends email to Mailpit. For demo data, run `SEED_DATABASE_ON_START=true SEED_DEMO=true pnpm docker:web`.

## Lesson videos (YouTube)

```bash
pnpm youtube:setup    # OAuth flow → prints YOUTUBE_REFRESH_TOKEN
pnpm youtube:verify
```

Setup in Google Cloud:

1. Enable the YouTube Data API v3.
2. Create an OAuth **Web** client with the redirect URI `http://localhost:8765/oauth2callback`.
3. Publish the consent screen to **Production**. Tokens issued in Testing mode expire after about 7 days.
4. Add your production URL under the OAuth client's **Authorized JavaScript origins**.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Dev server on port 3005 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm vercel-build` | Vercel build (migrates only when `VERCEL_ENV=production`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests |
| `pnpm db:generate` | `prisma generate` (also runs on `postinstall`) |
| `pnpm db:migrate` | Create and apply a migration in development |
| `pnpm db:migrate:deploy` | Apply pending migrations |
| `pnpm db:seed` | Demo data (refuses under `NODE_ENV=production` unless `SEED_DEMO=true`) |
| `pnpm admin:create` | Create the institute and first admin from `ADMIN_*` (`--reset-password` to update) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm email:test <to>` | Send a test email with the current configuration |
| `pnpm assets:sync-imagekit` | Upload `public/images` to ImageKit |
| `pnpm imagekit:verify` / `pnpm youtube:verify` | Check credentials |
| `pnpm youtube:setup` | Get a YouTube refresh token |
| `pnpm docker:up` / `docker:mail` / `docker:web` | Start Postgres / Mailpit / the production image locally |
| `pnpm docker:dev` | Postgres + migrate + seed + `pnpm dev` |
| `pnpm docker:down` / `docker:logs` | Stop the compose services / follow the database logs |

## Testing and CI

- **Unit tests:** `pnpm test` runs the Vitest suites in `tests/unit`. They cover pricing, upload and media URL validation, safe redirects, email rendering and modes, unsubscribe tokens, form guards, certificates, organization settings, catalog sorting, payments and env validation. They use no database or network.
- **`.github/workflows/ci.yml`** runs on every push to `main` and every pull request:
  - **check:** install (frozen lockfile), `prisma generate`, typecheck, lint, tests, and `next build` with placeholder env vars.
  - **database:** against a Postgres 16 service, it applies the migrations and checks that `schema.prisma` matches them (`prisma migrate diff --exit-code`). It then checks that the production seed guard refuses, runs the demo seed twice (`SEED_DEMO=true`), and runs `admin:create` repeatedly to catch migration, seed and bootstrap regressions.

pnpm only runs dependency install scripts for the packages listed under `onlyBuiltDependencies` in `pnpm-workspace.yaml`: Prisma's engines and esbuild. If you add a dependency that needs its build script, add it there.
