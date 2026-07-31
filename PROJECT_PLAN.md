# Legacy Hill Estimator — Remodel Bid App

## Context

The goal: a solo-hosted web app that turns a recorded site-visit walkthrough
into a client-ready, branded PDF estimate, with your own price list as the
primary cost source and AI filling gaps.

Confirmed workflow (from requirements gathering):

1. Record a site visit (phone voice memo, outside the app).
2. Upload the audio to the app → app transcribes it (e.g. Whisper API).
3. AI drafts a structured **scope of work** from the transcript (rooms /
   tasks / items) — **you review and edit** before anything gets priced.
4. App prices each scope line: looks up your own price list first
   (materials + labor, editable in-app); where there's no match, **AI
   estimates a cost and flags it** as "AI-estimated — verify" so it's never
   silently mixed in with your real numbers.
5. Markup/margin % (a default you can override per job) is applied to
   material+labor to get client price per line.
6. You review/adjust the priced estimate, then export a **branded PDF**
   (placeholder branding for now — logo/company info swapped in later) to
   send to the client.
7. Jobs/clients and their estimates are saved with history (draft / sent /
   won / lost) so you can revisit or duplicate past estimates.

## Tech Stack

- **Next.js 16 (App Router, TypeScript)** — single codebase for UI + API
  routes, straightforward to host.
- **PostgreSQL via Prisma ORM 7** — relational fit for jobs → scope items →
  price list → estimates. Hosted Postgres (e.g. Neon/Supabase) pairs
  naturally with a Vercel-style deploy. Local dev uses a local Postgres
  instance so the schema stays Postgres-native (real enums, etc.) instead of
  SQLite.
- **Vercel** for hosting (matches "hosted online, just me").
- **Anthropic API (Claude)** for: transcript → structured scope draft, and
  AI cost-estimation fallback.
- **Transcription**: OpenAI Whisper API (or equivalent) for audio → text.
  Kept as an isolated service call so it can be swapped later.
- **PDF generation**: `@react-pdf/renderer` (build the estimate as React
  components, render server-side to PDF) — avoids a headless-browser
  dependency.
- **Auth**: minimal single-user password/session auth (jose-signed session
  cookie, bcrypt-hashed password in the `User` table) — no multi-tenant
  complexity needed yet, but keeps the hosted app from being wide open.

## Data Model (see `prisma/schema.prisma`)

- `User` — single admin login (email + bcrypt password hash).
- `Settings` — singleton: company info for the PDF template, default markup %.
- `Client` — name, contact info, address.
- `Job` — belongs to Client; site address, status (DRAFT/SENT/WON/LOST).
- `SiteVisit` — belongs to Job; audio file reference, transcript text,
  transcription status.
- `ScopeItem` — belongs to Job; room/area, description, quantity/unit,
  category, sourced from AI draft, editable.
- `PriceListItem` — your own catalog: name, category, unit, material cost,
  labor cost, notes. Editable via in-app UI.
- `Estimate` — snapshot/version of a Job's priced line items + totals,
  generated PDF reference, sent date.
- `EstimateLineItem` — belongs to Estimate/ScopeItem; resolved material cost
  + labor cost (from PriceListItem match, or `aiEstimated: true` with a
  Claude-generated cost + confidence note), markup %, computed client price.

## Implementation Phases

1. **Scaffold** ✅ — Next.js + TypeScript + Prisma + Postgres connection,
   auth, base layout/navigation.
2. **Price List module** ✅ — schema + CRUD UI.
3. **Client/Job module** ✅ — create/list jobs, job detail shell, status
   tracking, Settings page.
4. **Audio upload + transcription** ✅ — file upload, calls OpenAI's
   `/v1/audio/transcriptions` (whisper-1), stores transcript, shows status.
   Storage: local disk in dev (gitignored `uploads/`), switches to Vercel
   Blob automatically when `BLOB_READ_WRITE_TOKEN` is set (see
   `src/lib/storage.ts`). The transcript is always editable by hand, so a
   failed/unavailable transcription call isn't a dead end.
5. **AI scope drafting** ✅ — Claude call (tool-use, forced structured
   output) turns the transcript into scope items; editable review UI.
6. **Pricing engine** ✅ — one Claude call per "Generate estimate": given the
   full price list catalog + scope items, Claude either matches a scope item
   to a real catalog entry (costs come from the DB, not the AI) or supplies
   its own material/labor cost estimate flagged `aiEstimated` with a
   confidence note. Markup % applied per job (falls back to Settings
   default). Editing a line item by hand clears the AI flag.
7. **PDF estimate generation** ✅ — `@react-pdf/renderer`, served at
   `/api/estimates/[id]/pdf`.
8. **Deploy** — hosted Postgres (Neon/Supabase) + Vercel deployment. Not
   done yet; only run against a local dev Postgres so far.

### Notes from building phases 4–6

- OpenAI's API was unreachable from the sandbox this was built in (network
  policy blocked `api.openai.com`; `api.anthropic.com` was allowed), so the
  transcription call is implemented against OpenAI's documented REST API
  but could only be verified end-to-end for its failure path (graceful
  `FAILED` status + error message + manual transcript fallback). It should
  work as-is once deployed; test it for real after deploying or by running
  locally somewhere with normal internet access.
- Server actions that call the AI APIs need Node's fetch to see
  `HTTPS_PROXY`. In this sandbox that required `NODE_USE_ENV_PROXY=1`; not
  relevant outside a proxied environment like this one.

Each phase is a separate PR-sized chunk so the app stays testable and
demoable incrementally.

## Open items for a later phase (not blocking)

- Real branding assets (swap placeholders once logo/company details are
  ready) — see Settings page.
- Whether to add spreadsheet import/export for the price list later.
- Multi-user/team accounts if this ever grows beyond solo use.
