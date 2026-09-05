# Edujarr LMS

Single-institute learning platform: courses, roadmaps, lesson videos, and
manual screenshot payments.

## Quick start

```bash
docker compose up -d db

# .env — DATABASE_URL=postgresql://postgres:postgres@localhost:5435/lms
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

App: http://localhost:3005

### Demo accounts (`password123`)

| Email | Role |
|-------|------|
| alice@example.com | Student |
| instructor@example.com | Instructor |
| admin@edujarr.com | Admin |

### Full Docker

```bash
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

Set `SEED_DATABASE_ON_START=true` only for a fresh disposable container so demo
passwords are not reapplied on every restart.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Next on port 3005 |
| `pnpm db:migrate:deploy` | Apply migrations |
| `pnpm db:seed` | Demo users, courses, roadmaps |
| `pnpm assets:sync-imagekit` | Upload `public/images` to ImageKit |
| `pnpm youtube:setup` | OAuth refresh token for lesson uploads |
| `pnpm youtube:verify` | Check YouTube credentials |

## Media

- **Images / screenshots** → ImageKit (`IMAGEKIT_*` in `.env`)
- **Lesson videos** → YouTube unlisted uploads

```bash
pnpm youtube:setup
pnpm youtube:verify
```

Requirements: YouTube Data API v3, OAuth Web client, consent screen in
**Production** (Testing tokens expire in ~7 days), redirect URI
`http://localhost:8765/oauth2callback`.

On Vercel, the browser uploads directly to YouTube after
`POST /api/upload/youtube/session` (avoids the serverless body limit).

Add your production URL under Google OAuth **Authorized JavaScript origins**.

## Course payments

Students pay via eSewa / mobile banking / Khalti QR, upload a screenshot, and an
admin approves enrollment under **Admin → Payments**.

## Deploy (Vercel + Supabase)

1. Apply migrations locally: `pnpm db:migrate:deploy`
2. Set on Vercel:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase pooler port `6543` + `?pgbouncer=true` |
| `BETTER_AUTH_SECRET` | 32+ chars |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Production URL |
| `IMAGEKIT_*` / `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` | Uploads + CDN |
| `YOUTUBE_CLIENT_ID` / `SECRET` / `REFRESH_TOKEN` | Lesson videos |

```bash
pnpm db:seed                 # first time only
pnpm assets:sync-imagekit    # optional
git push
```
