# CNCR Watcher

A hosted concours tracker for Moroccan Ministry of Health recruitment notices, focused on radiology technologist opportunities.

## What It Does

- Scrapes official ministry pages for linked concours PDFs.
- Cross-checks emploi-public.ma concours detail pages for CHU listings such as `ممرض من الدرجة الأولى - سُلمْ 10`.
- Stores discoveries in Neon Postgres through Drizzle.
- Uses Gemini to extract structured data from scanned Arabic/French PDFs.
- Validates dates, seat counts, radiology rows, and same-day conflicts.
- Optionally checks list-style PDFs for your candidate name.
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
- `CANDIDATE_FULL_NAME`: optional name to check in lists, results, assignments, and planning PDFs.

## Database

Run the included first migration against Neon:

```bash
pnpm db:migrate
```

The initial SQL migration is in `drizzle/0000_initial.sql`.

## Local Moroccan-IP Watcher

The ministry site can block requests from IPs outside Morocco, so the primary watcher is a tiny Windows scheduled one-shot that runs from your Moroccan connection. It starts, checks the ministry, processes pending PDFs, updates Neon, sends Telegram alerts, records a heartbeat, and exits.

Local `.env` needs:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CANDIDATE_FULL_NAME` if you want name-check Telegram alerts
- `LOCAL_WATCHER_ID=windows-home`
- `LOCAL_PROCESS_LIMIT=2`
- `WATCHER_STALE_MINUTES=45`
- `TEST_CANDIDATE_PDF` and `TEST_CANDIDATE_FULL_NAME` only when running the optional name-check test

Test one run:

```bash
pnpm watch:once
```

Run the safer pre-drop system check:

```bash
pnpm system:check
```

This verifies parser behavior for future concours, ignored old concours, update labels such as `Planning` and `Liste définitive`, no-attachment fallback, and heartbeat access. To test Gemini name matching against a real old PDF without writing to the database, set `TEST_CANDIDATE_PDF` to a PDF URL or local file path and `TEST_CANDIDATE_FULL_NAME` to the name to search.

Install the Windows scheduled task:

```powershell
.\scripts\install-windows-watcher.ps1
```

The task runs every 10 minutes through a hidden `wscript.exe` launcher, wakes the computer when Windows allows it, writes detailed JSON-line style run logs to `logs/watcher.log`, records run history in Neon, and stores secrets only in local `.env`. Newly inserted documents are prioritized for processing in the same run before older pending backlog. Remove it with:

```powershell
.\scripts\uninstall-windows-watcher.ps1
```

If the PC is fully shut down, scraping pauses. The UI shows watcher health, and the hosted stale monitor can send Telegram after 45 minutes without a successful local run.

When schema changes are added, run:

```bash
pnpm db:migrate
```

The current watcher history migration is `drizzle/0004_watcher_runs.sql`.

## Hosted Jobs

### Cloudflare Worker

Set these Worker secrets/vars:

- `INGEST_ENDPOINT`: `https://your-vercel-app.vercel.app/api/ingest/links`
- `INGEST_TOKEN`: same value as the Vercel `INGEST_TOKEN`

Deploy:

```bash
pnpm worker:deploy
```

The Worker is no longer trusted for production scraping because the ministry site can block non-Moroccan egress. `GET /` on the Worker is still a health check; `POST /` remains an optional legacy trigger.

### GitHub Actions

Add repository secrets:

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional repository variable:

- `GEMINI_MODEL`

The workflow in `.github/workflows/process-pdfs.yml` is manual-only now. It is useful for diagnostics, but it is not production coverage because GitHub-hosted runners may not have Moroccan egress.

### Trigger.dev Stale Monitor

Trigger.dev no longer scrapes the ministry. It checks the local watcher heartbeat every 30 minutes and sends Telegram if the Windows runner becomes stale. Set:

- `TRIGGER_PROJECT_REF` locally and in Trigger.dev
- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `WATCHER_STALE_MINUTES=45`
- `LOCAL_WATCHER_ID=windows-home`

Deploy the monitor:

```bash
pnpm deploy:trigger
```

The scheduled task is `concours-watcher-stale-monitor`.

## Useful Commands

```bash
pnpm lint
pnpm build
pnpm discover
pnpm process:pending
pnpm system:check
pnpm watch:once
pnpm exec wrangler deploy --dry-run
```
