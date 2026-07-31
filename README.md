# Legacy Hill Estimator

A remodel bid app: record a site visit, transcribe it, draft a scope of work,
price it against your own price list (with AI filling gaps), and export a
branded PDF estimate to send to the client.

See `PROJECT_PLAN.md` for the overall architecture and phased roadmap.

## Status

Built so far:

- Single-user auth (login/logout, session cookie)
- Price List CRUD (your material + labor cost catalog)
- Client/Job creation and a Jobs dashboard
- Settings (company info + default markup %)
- Site-visit audio upload + transcription (OpenAI Whisper), with a manual
  transcript editor as a fallback/correction path
- AI scope-of-work drafting from a transcript (Claude), editable before pricing
- Pricing engine: matches scope items to your price list, falls back to an
  AI cost estimate (clearly flagged "AI-estimated — verify") when there's no
  catalog match, applies markup %
- Branded PDF estimate export + "mark as sent" status tracking

Not yet done:

- Real company branding (logo, address, etc. — currently placeholders in Settings)

## Getting Started

### Prerequisites

- Node.js 20.9+
- A PostgreSQL database

### Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — your Postgres connection string
   - `SESSION_SECRET` — generate with `openssl rand -base64 32`
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — your login credentials
   - `ANTHROPIC_API_KEY`, `TRANSCRIPTION_API_KEY`, `BLOB_READ_WRITE_TOKEN` — needed for later phases, can stay blank for now

2. Install dependencies and set up the database:

   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with the
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in `.env`.

### Useful commands

- `npm run build` — production build
- `npm run lint` — ESLint
- `npx prisma studio` — browse/edit the database directly
- `npx prisma migrate dev --name <description>` — create a new migration after editing `prisma/schema.prisma`

## Deployment (Vercel)

1. **Import the repo**: in Vercel, "Add New" → "Project" → import
   `liltjhill/legacyhillestimator`. It's a standard Next.js app, so the
   framework preset auto-detects; leave Build Command on its default (it
   picks up `npm run build`, which runs `prisma generate && prisma migrate
   deploy && prisma db seed && next build` — migrations and the admin-user
   seed happen automatically on every deploy, and both are safe to re-run).

2. **Add Postgres**: Project → Storage → create a Postgres database (or
   connect Neon/Supabase from the Marketplace). Whatever env var name the
   integration creates, also add one named exactly `DATABASE_URL` with the
   **pooled** connection string (not the direct one — serverless functions
   open many short-lived connections, and node-postgres needs the pooler).

3. **Add Blob storage**: Project → Storage → create a Blob store and
   connect it to the project. This auto-injects `BLOB_READ_WRITE_TOKEN`.
   This step isn't optional — without it, audio uploads write to local disk,
   which doesn't exist/persist on Vercel's serverless filesystem.

4. **Set the remaining environment variables** (Project → Settings →
   Environment Variables): `SESSION_SECRET` (`openssl rand -base64 32`),
   `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`,
   `TRANSCRIPTION_API_KEY`.

5. **Deploy**, then sign in at the deployed URL with
   `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`.

Audio uploads go straight from the browser to Vercel Blob (see
`src/app/api/site-visit/blob-upload/route.ts`) rather than through a server
action, since Vercel's serverless functions cap request bodies around
4.5MB — well under what a multi-minute site-visit recording needs.
