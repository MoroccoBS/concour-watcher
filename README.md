# CNCR Watcher

A hosted concours tracker for Moroccan Ministry of Health recruitment notices, focused on radiology technologist opportunities.

## What It Does

- Scrapes official ministry pages for linked concours PDFs.
- Stores discoveries in Neon Postgres through Drizzle.
- Uses Gemini to extract structured data from scanned Arabic/French PDFs.
- Validates dates, seat counts, radiology rows, and same-day conflicts.
- Sends Telegram alerts for new PDFs and processed radiology matches.
- Presents a public read-only web UI with protected admin edits.

## Local Development

```bash
pnpm install
pnpm dev:3000
```

The UI falls back to a demo Errachidia ITS notice when `DATABASE_URL` is not set.

## Environment

Copy `.env.example` to `.env.local` for local app development, and set equivalent secrets in Vercel/GitHub/Cloudflare:

- `DATABASE_URL`: Neon Postgres connection string.
- `ADMIN_TOKEN`: token used in the UI to edit status and notes.
- `INGEST_TOKEN`: shared secret for Cloudflare Worker to call `/api/ingest/links`.
- `JOB_TOKEN`: optional secret for `/api/jobs/process-pending`.
- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: Telegram alerts.

## Database

Run the included first migration against Neon:

```bash
pnpm db:migrate
```

The initial SQL migration is in `drizzle/0000_initial.sql`.

## Hosted Jobs

### Cloudflare Worker

Set these Worker secrets/vars:

- `INGEST_ENDPOINT`: `https://your-vercel-app.vercel.app/api/ingest/links`
- `INGEST_TOKEN`: same value as the Vercel `INGEST_TOKEN`

Deploy:

```bash
pnpm worker:deploy
```

The Worker runs every 30 minutes and triggers the Vercel ingest endpoint. Vercel performs the ministry-page scrape and writes new links to Neon.

### GitHub Actions

Add repository secrets:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional repository variable:

- `GEMINI_MODEL`

The workflow in `.github/workflows/process-pdfs.yml` runs every 3 hours and can be triggered manually.

## Useful Commands

```bash
pnpm lint
pnpm build
pnpm discover
pnpm process:pending
pnpm exec wrangler deploy --dry-run
```
