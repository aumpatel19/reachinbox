# PRD — ReachInbox Full-Stack Email Job Scheduler

**Purpose of this document:** This is the single source of truth for the ReachInbox hiring assignment. It maps every line of the assignment to a concrete decision, so nothing is left to interpretation. Reference it in every prompt ("follow PRD.md section X").

**Rule zero:** Every requirement in the original assignment is either implemented or explicitly listed under "Assumptions & Trade-offs" in the README. Nothing is silently skipped.

---

## 0. Assignment → Requirement Traceability Matrix

Every row here must be checked off before submission.

| # | Assignment requirement (verbatim intent) | Where implemented | Status |
|---|---|---|---|
| B1 | Accept email scheduling requests via API | `POST /api/campaigns` | ☐ |
| B2 | Store them in a relational DB (Postgres) | `emails`, `campaigns` tables | ☐ |
| B3 | Schedule using BullMQ delayed jobs — no cron | `queue.addBulk` with `delay`, jobId = email id | ☐ |
| B4 | Send via Ethereal SMTP from multiple senders | `senders` table, nodemailer per sender | ☐ |
| B5 | Survive restart: future emails still send at correct time | Redis-persisted delayed jobs + boot reconciliation | ☐ |
| B6 | Not duplicated / not restarted from scratch | Unique jobId + atomic DB claim + status guard | ☐ |
| B7 | Configurable worker concurrency, parallel-safe | `WORKER_CONCURRENCY` env; no shared mutable state | ☐ |
| B8 | Minimum delay between individual sends, documented | Per-sender Redis lock, `MIN_DELAY_BETWEEN_EMAILS_MS` | ☐ |
| B9 | Emails-per-hour rate limit, configurable via env | Redis `INCR` counter keyed by `sender + hourWindow` | ☐ |
| B10 | Rate limit safe across multiple workers/instances | Atomic Redis ops, no in-memory counters | ☐ |
| B11 | On limit hit: delay/reschedule to next window, keep order, never drop | `job.moveToDelayed` to next window + overflow index | ☐ |
| B12 | Explain rate limiting approach + trade-offs in README | README §Rate limiting | ☐ |
| B13 | Defined behavior for 1000+ emails at same time | `addBulk` + staggered `scheduled_at` + overflow spill; README worked example | ☐ |
| B14 | No cron (OS or Node libs) | Grep for `cron`, `setInterval` — must be zero | ☐ |
| B15 | Idempotency: same email queue never sent more than once | jobId + claim + unique(campaign_id, to_address) | ☐ |
| F1 | Real Google OAuth, redirect to dashboard | passport-google-oauth20 + Redis-backed session | ☐ |
| F2 | Header shows name, email, avatar; logout | `<Header/>` reads `/api/auth/me` | ☐ |
| F3 | Dashboard: header, Scheduled/Sent tabs, Compose New Email button | `/dashboard` | ☐ |
| F4 | Compose: subject, body, CSV/text upload with detected count, start time, delay, hourly limit, Schedule button | `<ComposeModal/>` | ☐ |
| F5 | Scheduled table: email, subject, scheduled time, status + loading + empty | `<EmailTable variant="scheduled"/>` | ☐ |
| F6 | Sent table: email, subject, sent time, status(sent/failed) + loading + empty | `<EmailTable variant="sent"/>` | ☐ |
| F7 | Match Figma as closely as possible | Figma MCP → tokens → components | ☐ |
| F8 | Clean folder structure, reusable components, DRY, TypeScript types, loading/empty/error UX | §9 | ☐ |
| S1 | Private GitHub repo, access to `Mitrajit` and `Yadav036` | Settings → Collaborators | ☐ |
| S2 | README: run backend, run frontend, Ethereal + env, architecture, features mapped, assumptions | §12 | ☐ |
| S3 | Demo video ≤ 5 min incl. restart scenario | §13 | ☐ |
| S4 | Fill ClickUp submission form | link in assignment | ☐ |
| S5 | No plagiarism — original code | Do not copy public ReachInbox repos | ☐ |

---

## 1. Goals & Non-Goals

**Goal:** A production-shaped email scheduler (API + BullMQ worker + Postgres + Redis + Ethereal) with a Google-authenticated dashboard that matches the provided Figma, survives restarts, is idempotent, and enforces configurable concurrency, per-send delay, and hourly rate limits safely across multiple workers.

**Non-goals (state these in README):** real deliverability (SPF/DKIM), email templating engine, unsubscribe handling, multi-tenant billing, horizontal scaling infra beyond "run N workers".

---

## 2. Locked Tech Decisions (no alternatives — avoids Claude Code guessing)

| Layer | Choice | Why |
|---|---|---|
| Repo | Monorepo: `backend/`, `frontend/`, `docker-compose.yml`, `README.md`, `PRD.md` | Assignment allows either; monorepo is easiest to review |
| Backend runtime | Node 20 LTS, TypeScript (strict), Express 4 | Required |
| Queue | BullMQ v5 + ioredis | Required |
| DB | PostgreSQL 16 + Prisma ORM | Required (Postgres/MySQL); Prisma gives typed models + migrations |
| Mail | nodemailer + Ethereal (`createTestAccount`) | Required |
| Auth | passport-google-oauth20 + express-session + connect-redis | Real OAuth; sessions survive restart because they live in Redis |
| Validation | zod | Typed request validation |
| Logging | pino | Structured logs help in the demo |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Required (React/Next + Tailwind + TS) |
| Data fetching | @tanstack/react-query + axios (withCredentials) | Loading/error states + polling for free |
| CSV parsing | papaparse (client-side) | Show detected count instantly |
| Toasts | sonner (or react-hot-toast) | Error handling requirement |
| Icons | lucide-react (swap to Figma exports if design differs) | |
| Tests | vitest (backend unit tests for rate limiter + CSV parser) | Differentiator |
| Infra | Docker Compose: `redis`, `postgres` (+ optional `backend`, `worker`, `frontend`) | Recommended by assignment |
| Bonus | Bull Board at `/admin/queues` (auth-protected) | Helps demo restart + delayed jobs visually |

Processes: **API server** (`npm run dev`) and **worker** (`npm run worker`) run as separate processes sharing the same codebase. This proves multi-instance safety. Provide `npm run dev:all` (concurrently) for convenience.

---

## 3. Domain Model (Prisma schema — field-level spec)

### `User`
- `id` (uuid, pk), `googleId` (unique), `email` (unique), `name`, `avatarUrl`, `createdAt`

### `Sender`
- `id` (uuid, pk), `name`, `email` (unique), `smtpHost`, `smtpPort` (int), `smtpUser`, `smtpPass`, `createdById` → User, `createdAt`
- Ethereal accounts are created via API and stored here. Seed 2 senders on first boot if table empty (proves "multiple senders").

### `Campaign`
- `id` (uuid, pk), `userId` → User, `senderId` → Sender, `subject`, `body` (text), `startAt` (timestamptz), `delayBetweenMs` (int), `hourlyLimit` (int, nullable → falls back to env), `totalRecipients` (int), `createdAt`

### `Email`
- `id` (uuid, pk), `campaignId` → Campaign, `senderId` → Sender, `toAddress`, `subject`, `body`, `sequenceIndex` (int, position within campaign), `scheduledAt` (timestamptz), `status` enum `SCHEDULED | PROCESSING | SENT | FAILED`, `attempts` (int, default 0), `lastError` (text, nullable), `sentAt` (nullable), `previewUrl` (nullable — Ethereal message URL), `jobId` (string), `createdAt`, `updatedAt`
- Constraints: `@@unique([campaignId, toAddress])`, `@@index([status, scheduledAt])`, `@@index([campaignId])`

Status semantics: `SCHEDULED` = waiting in Redis; `PROCESSING` = claimed by a worker; `SENT` = SMTP accepted; `FAILED` = exhausted attempts (SMTP/network error). Rate-limit deferrals do **not** change status — email stays `SCHEDULED` with an updated `scheduledAt`.

---

## 4. Backend Architecture

```
frontend ──HTTP──▶ Express API ──▶ Postgres (source of truth: emails, status)
                       │
                       └──▶ BullMQ Queue "email-send" ──▶ Redis (delayed jobs, counters, locks, sessions)
                                                             ▲
                                                             │
                                          Worker (N concurrency, M instances) ── nodemailer ──▶ Ethereal SMTP
```

### 4.1 Scheduling flow (`POST /api/campaigns`)
1. Validate body with zod: `senderId`, `subject` (1–200), `body` (1–50k), `recipients: string[]` (1–10,000, each valid email, deduped case-insensitively), `startAt` (ISO, ≥ now − 60s), `delayBetweenMs` (≥ 0), `hourlyLimit` (1–10,000, optional).
2. `effectiveDelayMs = max(delayBetweenMs, MIN_DELAY_BETWEEN_EMAILS_MS)`.
3. In one DB transaction: insert `Campaign`, then insert `Email` rows with `scheduledAt = startAt + i × effectiveDelayMs`, `sequenceIndex = i`, `status = SCHEDULED`, `jobId = "email:" + email.id`.
4. After commit: `queue.addBulk(rows.map(e => ({ name: "send", data: { emailId: e.id }, opts: { jobId: e.jobId, delay: max(0, scheduledAt − now), attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: { count: 1000 }, removeOnFail: false } })))`.
5. Job payload contains **only** `emailId`; the worker reads everything else from the DB (so edits/re-runs are safe and jobs stay small).
6. Return `{ campaignId, scheduled: n, skippedInvalid: k, firstSendAt, lastSendAt }`.

Why DB first, then queue: if the process dies between the two, boot reconciliation (§4.4) re-enqueues rows that have no job. If it dies after enqueue but before commit — impossible, since enqueue happens after commit.

### 4.2 Worker (`src/worker/emailWorker.ts`)
```
new Worker("email-send", processor, {
  connection, concurrency: env.WORKER_CONCURRENCY,
})
```
Processor steps for job `{ emailId }`:
1. **Atomic claim:** `UPDATE emails SET status='PROCESSING', attempts=attempts+1 WHERE id=$1 AND status='SCHEDULED' RETURNING *`. If 0 rows → log "already handled" and return (idempotency guard).
2. **Rate limit check** (§4.3). If over limit → revert status to `SCHEDULED`, set new `scheduledAt`, `job.moveToDelayed(newTs, token)`, `throw new DelayedError()`.
3. **Min-delay lock** (§4.3). If lock held → same deferral path with `now + remainingMs`.
4. **Send:** build transporter for `email.sender` (cache transporters per senderId), `sendMail({ from, to, subject, html/text })`.
5. **Success:** `UPDATE emails SET status='SENT', sentAt=now(), previewUrl=nodemailer.getTestMessageUrl(info)`.
6. **Failure:** if `job.attemptsMade < attempts` → set status back to `SCHEDULED`, store `lastError`, rethrow (BullMQ retries with backoff). On final attempt → `status='FAILED'`, `lastError`.
7. Never `throw` for rate-limit deferrals except `DelayedError`; those must not count as failures.

Parallel safety: no module-level counters or arrays; all coordination via Redis/DB; transporter cache is read-only after creation.

### 4.3 Throughput controls
**Concurrency:** `WORKER_CONCURRENCY` (default 5). Multiple worker processes are allowed and expected to be safe.

**Hourly rate limit (per sender, Redis-backed):**
- `windowStart = floor(now / 3600s) × 3600s`
- Key: `rl:sender:{senderId}:{windowStart}`; `INCR` then `EXPIRE 7200` on first increment (use a tiny Lua script or `MULTI` to keep it atomic).
- `limit = min(campaign.hourlyLimit ?? MAX_EMAILS_PER_HOUR_PER_SENDER, MAX_EMAILS_PER_HOUR_PER_SENDER)`.
- If `count > limit`: `DECR` the key, compute `nextWindow = windowStart + 3600s`, `overflowIdx = INCR rl:overflow:{senderId}:{nextWindow}` (EXPIRE 7200), `newTs = nextWindow + overflowIdx × MIN_DELAY_BETWEEN_EMAILS_MS`. Update `emails.scheduledAt = newTs`, status back to `SCHEDULED`, `moveToDelayed(newTs)`. This preserves FIFO order among deferred emails and keeps min spacing in the next window. Never fail or drop.
- Trade-off to state in README: BullMQ's built-in `limiter` is per-queue, not per-sender, so a custom counter was used; the cost is one extra Redis round-trip per send.

**Minimum delay between sends (per sender):**
- Before sending: `SET rl:lock:{senderId} 1 NX PX {MIN_DELAY_BETWEEN_EMAILS_MS}`. If it returns null, read `PTTL` and defer the job by that many ms (+ small jitter 50–200ms to avoid thundering herd). Documented default: **2000 ms between sends per sender**.
- Because `scheduledAt` is already staggered at enqueue time, this lock rarely fires in normal flow; it exists to keep the guarantee under high concurrency and after deferrals.

**Behavior under load (write this into README verbatim-ish):**
- 1000 emails scheduled for the same time, `MIN_DELAY=2s`, `MAX_PER_HOUR=200`: enqueue staggers them 2s apart (≈33 min of sends). The counter admits 200 in window 1, then emails 201–400 are moved to window 2, 401–600 to window 3, etc. Order is preserved via `sequenceIndex` → `overflowIdx`. Nothing is dropped; the dashboard shows updated scheduled times.
- Multiple workers: all use the same Redis keys, so combined throughput still respects the limit.

### 4.4 Persistence & restart safety
- Delayed jobs live in Redis; a Node restart does not lose them. Sessions also live in Redis, so users stay logged in.
- **Boot reconciliation** (`src/queue/reconcile.ts`, runs on API and worker start):
  1. For each `Email` with `status = SCHEDULED`: `queue.getJob(jobId)`; if missing → re-add with `delay = max(0, scheduledAt − now)`. Handles Redis flush / lost jobs.
  2. For each `Email` with `status = PROCESSING` and `updatedAt < now − STALE_PROCESSING_MS` (default 5 min): reset to `SCHEDULED` and re-add. Handles crash mid-send.
  3. Log counts: `reconciled: X re-enqueued, Y stale reset`.
- Redis should run with `appendonly yes` in docker-compose so even a Redis restart keeps jobs. Mention in README.
- Trade-off to state: crash after SMTP accepted but before DB update could produce one duplicate send on reconciliation (at-least-once). Acceptable for this scope; note it honestly.

### 4.5 Idempotency (three layers)
1. `jobId = "email:{uuid}"` — BullMQ ignores duplicate jobIds.
2. Atomic status claim `SCHEDULED → PROCESSING`.
3. `@@unique([campaignId, toAddress])` + client + server-side dedupe of recipient list.

### 4.6 Hard-constraint self-check (run before submitting)
- `grep -ri "cron" backend/ frontend/ --exclude-dir=node_modules` → zero results.
- `grep -r "setInterval" backend/src` → zero (polling on the frontend is fine; polling on the backend for scheduling is not).
- No in-memory rate counters (no `let sentThisHour = 0`).

---

## 5. API Specification

Base URL: `http://localhost:4000`. All `/api/*` routes except health require an authenticated session (401 otherwise). JSON envelope: success `{ data }`, error `{ error: { code, message, details? } }`.

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/auth/google` | — | 302 to Google |
| GET | `/auth/google/callback` | — | 302 to `FRONTEND_URL/dashboard` (or `/login?error=1`) |
| GET | `/api/auth/me` | — | `{ id, name, email, avatarUrl }` or 401 |
| POST | `/api/auth/logout` | — | `{ ok: true }`, clears session |
| GET | `/api/senders` | — | `Sender[]` (no `smtpPass`) |
| POST | `/api/senders/ethereal` | `{ name? }` | Creates Ethereal test account, stores, returns `Sender` |
| POST | `/api/campaigns` | `{ senderId, subject, body, recipients[], startAt, delayBetweenMs, hourlyLimit? }` | `{ campaignId, scheduled, skippedInvalid, firstSendAt, lastSendAt }` |
| GET | `/api/campaigns` | `?page&limit` | paginated `Campaign[]` with counts by status |
| GET | `/api/emails` | `?status=scheduled\|sent&page=1&limit=25&search=` | `{ items: EmailRow[], total, page, limit }`. `scheduled` = SCHEDULED+PROCESSING ordered by `scheduledAt asc`; `sent` = SENT+FAILED ordered by `sentAt desc` |
| GET | `/api/emails/:id` | — | full `Email` incl. `previewUrl`, `lastError` |
| GET | `/api/health` | — | `{ ok, redis: "up", db: "up", queue: { waiting, delayed, active, completed, failed } }` |
| GET | `/admin/queues` | — | Bull Board UI (session-protected) — bonus |

`EmailRow` type: `{ id, toAddress, subject, scheduledAt, sentAt, status, previewUrl, campaignId }`.

Validation errors → 400 with zod issues. Unknown routes → 404 JSON. Central error middleware; never leak stack traces in production mode.

CORS: `origin: FRONTEND_URL`, `credentials: true`. Session cookie: `httpOnly`, `sameSite: 'lax'`, `secure` in production.

---

## 6. Environment Variables (all in `.env.example`, none hardcoded)

**backend/.env**
```
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
SESSION_SECRET=change-me
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
QUEUE_NAME=email-send
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200
STALE_PROCESSING_MS=300000
JOB_ATTEMPTS=3
ETHEREAL_AUTO_CREATE_SENDERS=2
LOG_LEVEL=info
```
**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```
Load and validate env with zod at startup (`src/config/env.ts`); crash fast on missing values.

Google Cloud Console setup (document in README): OAuth consent screen (External, test users = your Gmail), OAuth client type Web, Authorized JS origin `http://localhost:3000`, Authorized redirect URI `http://localhost:4000/auth/google/callback`.

---

## 7. Backend Folder Structure

```
backend/
  prisma/schema.prisma, migrations/, seed.ts
  src/
    config/env.ts, logger.ts
    db/prisma.ts
    redis/client.ts
    queue/emailQueue.ts        # Queue instance + addEmailJobs()
    queue/reconcile.ts         # boot reconciliation
    worker/emailWorker.ts      # Worker + processor
    services/rateLimiter.ts    # hourly counter + overflow slot (+ Lua)
    services/sendLock.ts       # per-sender min-delay lock
    services/mailer.ts         # transporter cache, sendEmail()
    services/campaignService.ts, emailService.ts, senderService.ts
    auth/passport.ts, session.ts, requireAuth.ts
    routes/auth.routes.ts, senders.routes.ts, campaigns.routes.ts, emails.routes.ts, health.routes.ts
    middleware/errorHandler.ts, validate.ts
    types/index.ts
    app.ts (express app), server.ts (API entry), workerMain.ts (worker entry)
  tests/rateLimiter.test.ts, recipients.test.ts
  Dockerfile, package.json, tsconfig.json, .env.example
```

---

## 8. Frontend Specification

### 8.1 Routes
- `/login` — full-page per Figma; "Continue with Google" button → `${API_URL}/auth/google`. If already authenticated → redirect `/dashboard`.
- `/dashboard` — protected. On mount call `/api/auth/me`; 401 → redirect `/login`. Show skeleton while checking.
- `/` → redirect based on auth.

### 8.2 Dashboard layout (follow Figma; this is the fallback structure)
- **Header:** logo/product name left; right side avatar (img), name, email, and a Logout control (button or dropdown item per Figma). Logout → `POST /api/auth/logout` → `/login`.
- **Tabs:** `Scheduled Emails` | `Sent Emails` (URL-synced via `?tab=` so refresh keeps tab). Show counts in tab labels if Figma has them.
- **Primary button:** `Compose New Email` → opens `ComposeModal` (or routes to `/compose` if Figma shows a page — decide from Figma).
- **Table area:** `EmailTable` with columns per tab; pagination (25/page); search input if Figma has one.
- **Polling:** react-query `refetchInterval: 5000` on the active tab so emails visibly move from Scheduled → Sent during the demo.

### 8.3 Compose (`ComposeModal`)
Fields and behavior:
- **Sender** select (from `/api/senders`; button "Create Ethereal sender" if list is empty). Skip the select only if Figma has no sender field — then default to first sender and note it.
- **Subject** (required, ≤200).
- **Body** (textarea, required).
- **Leads file** — accept `.csv,.txt`. Parse with papaparse; collect every cell/line, trim, lowercase, validate with RFC-ish regex, dedupe. Show: "**N** email addresses detected" + "K invalid/duplicate skipped" + file name. Support drag-and-drop if Figma shows a dropzone.
- **Start time** — `datetime-local`, default now + 5 min, min = now; convert to ISO UTC before sending; show timezone hint.
- **Delay between emails** — number input (seconds in UI → ms to API), default 2, min = env min (surface `MIN_DELAY_BETWEEN_EMAILS_MS` via `/api/health` or hardcode display default).
- **Hourly limit** — number, default 200, min 1.
- **Schedule** button — disabled until valid; loading spinner while posting; on success: toast "Scheduled N emails", close modal, invalidate `emails` query, switch to Scheduled tab. On error: toast with server message; keep modal open.
- **Cancel/close** resets form.

### 8.4 Tables
- Scheduled: Email | Subject | Scheduled time (local, `MMM d, yyyy h:mm a`) | Status badge (`Scheduled`, `Processing`).
- Sent: Email | Subject | Sent time | Status badge (`Sent` green / `Failed` red). Row click or an icon opens `previewUrl` in a new tab (Ethereal preview) — small but impressive.
- **Loading state:** skeleton rows (not a spinner only).
- **Empty state:** illustration/icon + copy per Figma ("No scheduled emails yet" / "No sent emails yet") + Compose CTA.
- **Error state:** inline error with Retry button + toast.
- Pagination controls at bottom.

### 8.5 Component library (`components/ui`) — reusable, typed, no duplication
`Button` (variants primary/secondary/ghost, loading prop), `Input`, `Textarea`, `Select`, `Modal`, `Tabs`, `Table` (generic with `columns` config), `Badge` (status → color map), `Skeleton`, `EmptyState`, `Avatar`, `FileDropzone`, `Pagination`, `Toaster`.

Feature components: `Header`, `EmailTable`, `ComposeModal`, `AuthGuard`, `LoginCard`.

### 8.6 Frontend folder structure
```
frontend/
  app/(auth)/login/page.tsx, (app)/dashboard/page.tsx, layout.tsx, providers.tsx
  components/ui/*, components/dashboard/*, components/compose/*
  lib/api.ts (axios instance), lib/queries.ts (react-query hooks), lib/parseRecipients.ts, lib/format.ts
  types/api.ts (mirrors backend response types), types/ui.ts
  styles/globals.css, tailwind.config.ts (Figma tokens)
  .env.example
```
TypeScript: `strict: true`, no `any`, every API response typed in `types/api.ts`, every component has a props interface.

---

## 9. Figma Fidelity Process (using Figma MCP in Claude Code)

1. Connect the Figma MCP (remote server `https://mcp.figma.com/mcp` or `claude plugin install figma@claude-plugins-official`). Verify with `/mcp` that it's connected. If it fails within 15 minutes, fall back to full-frame screenshots pasted into Claude Code.
2. Paste the Figma file link. Ask Claude Code to list every frame/page (login, dashboard, compose, empty states, tables, any dropdowns/toasts).
3. **Extract tokens first:** colors, font family/sizes/weights, spacing scale, radii, shadows → write into `tailwind.config.ts` (`theme.extend`) and load the font (Google Fonts or `next/font`).
4. **Build `components/ui` from Figma components** before pages. One component at a time; render in a scratch page and compare visually.
5. **Build pages frame-by-frame** using `get_design_context` on each frame. Match layout, spacing, and hierarchy exactly; use exported SVG assets for logos/illustrations.
6. **Side-by-side check:** screenshot each app screen next to the Figma frame; fix diffs. Put 2–3 of these side-by-sides in the README.
7. Any state not in Figma (loading, error, toast) is designed in the same token system and listed under "Assumptions".

Definition of "exact": a reviewer opening the app and the Figma sees the same structure, colors, typography, spacing, and component styling. Sub-pixel differences are fine; different layout is not.

---

## 10. Docker & Local Run

`docker-compose.yml` services: `postgres:16` (volume, healthcheck), `redis:7` (`--appendonly yes`, volume, healthcheck), optional `backend`, `worker`, `frontend` built from Dockerfiles with `depends_on` healthchecks.

Local dev (README "Quick start"):
```
docker compose up -d postgres redis
cd backend && cp .env.example .env && npm i && npx prisma migrate dev && npx prisma db seed && npm run dev   # API
cd backend && npm run worker                                                                                  # worker (2nd terminal)
cd frontend && cp .env.example .env.local && npm i && npm run dev                                              # UI
```
Scripts: `dev`, `worker`, `dev:all`, `build`, `start`, `start:worker`, `test`, `lint`, `prisma:migrate`, `seed`.

Repo hygiene: `.gitignore` covers `node_modules`, `.env*` (except `.env.example`), `dist`, `.next`. **Never commit secrets.** ESLint + Prettier configured. Commit history: 15+ meaningful commits over the 48 h, not one dump.

---

## 11. Testing & Acceptance Criteria

**Automated (vitest):**
- `rateLimiter.test.ts`: (a) admits `limit` sends in a window, (b) the `limit+1`th is deferred to next window, (c) two concurrent callers never exceed the limit (use real Redis in test or ioredis-mock).
- `parseRecipients.test.ts`: dedupe, invalid rows skipped, count correct.

**Manual acceptance (must all pass before recording video):**
1. Login with Google → lands on dashboard with name/email/avatar; logout works; refresh keeps session.
2. Compose with 5 recipients, start = now+2 min, delay 2s, limit 200 → Scheduled tab shows 5 rows with staggered times.
3. Wait → rows move to Sent with correct times; preview links open Ethereal.
4. **Restart test:** schedule 5 emails 3 min out → `Ctrl+C` API and worker → wait 60 s → restart both → all 5 send at original times, none duplicated (verify DB `SENT` count = 5 and Ethereal shows 5).
5. **Redis flush test (bonus):** schedule → `redis-cli FLUSHALL` → restart → reconciliation re-enqueues; still no duplicates.
6. **Rate limit test:** set limit to 3, schedule 6 → 3 send now, 3 get `scheduledAt` moved to next hour (visible in Scheduled tab + Bull Board delayed list) — none FAILED.
7. **Concurrency test:** `WORKER_CONCURRENCY=1` vs `5` with 20 emails and delay 0 → per-sender min gap still ≥ 2 s (check `sentAt` diffs).
8. **Two workers:** run `npm run worker` twice → no email sent twice (`SELECT toAddress, count(*) FROM emails GROUP BY 1 HAVING count(*)>1` returns nothing; every `SENT` row has exactly one preview URL).
9. **Idempotent enqueue:** call `addEmailJobs` twice for the same emails → queue count unchanged.
10. Empty states render on a fresh DB; loading skeletons visible on slow network (throttle in DevTools); an API failure shows a toast + retry.
11. `grep` checks in §4.6 pass. `npm run build` passes for both apps with zero TS errors.

---

## 12. README Outline (must contain every item the assignment lists)

1. Title, one-paragraph overview, screenshots (login, dashboard scheduled, sent, compose) + Figma side-by-sides.
2. Tech stack table.
3. Architecture diagram + "How scheduling works" (numbered flow from §4.1).
4. "How persistence on restart is handled" (§4.4) incl. Redis AOF and reconciliation.
5. "Idempotency" (§4.5).
6. "Rate limiting, delay & concurrency" — key names, defaults (`min 2 s between sends`, `200/hour/sender`, `concurrency 5`), why custom counter vs BullMQ limiter, multi-worker safety, order preservation, worked 1000-email example.
7. Quick start: Docker, backend, worker, frontend. Google OAuth setup steps. Ethereal setup (auto-created via `POST /api/senders/ethereal` or seed; where to see previews).
8. Env variables table (name, default, purpose).
9. API reference (table from §5).
10. Features implemented — checklist mapped to assignment (Backend: scheduler, persistence, rate limiting, concurrency; Frontend: login, dashboard, compose, tables, states).
11. Testing: how to run tests + manual scenario steps.
12. Assumptions, shortcuts, trade-offs (at-least-once edge case, per-sender vs global, timezone = UTC stored / local displayed, hourlyLimit capped by env, etc.).
13. Demo video link.

---

## 13. Demo Video Script (≤ 5 min; rehearse once, record once)

Setup before recording: fresh DB (or clean tab), two terminals visible (API + worker), Bull Board open, small limits ready. Use a screen recorder with mic.

| Time | Show |
|---|---|
| 0:00–0:30 | Login with Google → dashboard header (name/email/avatar) |
| 0:30–1:15 | Compose: upload CSV → "N emails detected", set start = now+2 min, delay 2 s, limit 200 → Schedule → toast |
| 1:15–1:30 | Scheduled tab populated with staggered times; Bull Board shows delayed jobs |
| 1:30–3:00 | **Restart:** `Ctrl+C` both processes, show terminal quiet for ~30 s, restart, show reconciliation log line, watch emails send at original times → Sent tab fills, open one Ethereal preview |
| 3:00–4:00 | **Rate limit:** set limit 3, schedule 6 → 3 send, 3 rescheduled to next window (Scheduled tab times + Bull Board delayed). Show `WORKER_CONCURRENCY` in env and log lines proving parallel processing with 2 s spacing |
| 4:00–4:40 | Empty state (switch to a fresh view or filter), loading skeleton, one error toast (stop API briefly) |
| 4:40–5:00 | README scroll: architecture, features table |

Upload unlisted to YouTube/Loom; link in README and form.

---

## 14. Submission Checklist

- ☐ Private GitHub repo; collaborators `Mitrajit` and `Yadav036` added (verify accepted-or-pending shows).
- ☐ README complete per §12; `.env.example` in both apps; no secrets in history (`git log -p | grep -i secret`).
- ☐ `npm run build` + `npm test` green; `docker compose up` works from clean clone (test in a fresh folder).
- ☐ Video ≤ 5:00, link works in incognito.
- ☐ ClickUp form filled with repo link, video link, notes.
- ☐ Assumptions/trade-offs section written.
- ☐ Traceability matrix (§0) fully ticked.

---

## 15. 48-Hour Execution Plan (Claude Code playbook)

Work in phases; do not start a phase until the previous phase's verification passes. Give Claude Code this PRD path in every prompt.

| Phase | Hours | Prompt to Claude Code (summarized) | Verify |
|---|---|---|---|
| 0 | 0–1 | "Read PRD.md. Scaffold monorepo per §2/§7/§8.6, docker-compose (§10), env loading (§6), Prisma schema (§3), ESLint/Prettier." | `docker compose up`, `prisma migrate dev` OK |
| 1 | 1–6 | "Implement §4.1 campaign creation, §4.2 worker, §4.3 rate limiter + lock, §4.4 reconcile, §5 routes, health, mailer with Ethereal, seed 2 senders." | Postman: schedule 3 → sent with previews |
| 2 | 6–8 | "Add Google OAuth per §2/§5 with Redis sessions; protect /api." | Login flow works in browser |
| 3 | 8–10 | Restart + rate-limit + two-worker tests from §11 | All pass; fix before moving on |
| 4 | 10–12 | vitest tests + Bull Board | `npm test` green |
| 5 | 12–14 | Figma MCP: tokens → tailwind config; build `components/ui` (§8.5, §9) | Components match Figma |
| 6 | 14–24 | Login page, dashboard, tables with loading/empty/error, polling | Side-by-side with Figma |
| 7 | 24–28 | Compose modal with CSV parsing, validation, toasts | End-to-end from UI |
| 8 | 28–32 | Polish: pagination, search, preview links, responsive basics, README screenshots | Full manual acceptance §11 |
| 9 | 32–38 | README (§12), assumptions, side-by-sides | Fresh-clone run works |
| 10 | 38–42 | Rehearse + record video (§13) | ≤5 min, restart shown |
| 11 | 42–46 | Repo access, form, final grep checks (§4.6), buffer | §14 all ticked |
| — | 46–48 | Buffer. Do not add features. | — |

**Working rules with Claude Code:** one phase per prompt; ask it to run the app and the checks itself; review every generated file and ask "why" on anything unclear (you will be asked to explain this code in the interview); never paste code from other candidates' repos; commit after each phase with a descriptive message.

---

## 16. Assumptions & Trade-offs to Publish (starter list — expand as you build)

- Rate limit is per-sender (assignment allows global or per-sender); global cap = env × number of senders. Per-campaign `hourlyLimit` cannot exceed env cap.
- Delivery semantic is at-least-once with a narrow window (crash between SMTP accept and DB update); mitigated by atomic claim + reconciliation threshold.
- Times stored in UTC, displayed in the browser's local timezone.
- Recipients are deduped per campaign; the same address across different campaigns is allowed.
- Body is sent as HTML with a plain-text fallback.
- No cron anywhere; the only time-based mechanism is BullMQ delayed jobs; reconciliation runs once at process boot, not on a timer.
- Ethereal accounts are auto-created and stored in DB for convenience; credentials are shown only in server logs at creation.
- Retry policy: 3 attempts, exponential backoff 5 s; failures beyond that are marked FAILED and visible in the Sent tab.

## 17. Design Source

Figma: https://www.figma.com/design/kOTwGlESjijCYnMgtHfvfU/Outbox-Labs-Assignment?node-id=59-4050&p=f&t=Yu6MMbmrjzJpV5L2-0

## 18. Git / Commit Policy

- Commit author must be the user only. Do **not** add Claude, Claude Code, or any AI co-author trailer to commit messages when pushing to GitHub for this project.
