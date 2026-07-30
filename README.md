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

Not yet built (needs API keys you provide — see below):

- Site-visit audio upload + transcription
- AI scope-of-work drafting from a transcript
- Pricing engine (price-list lookup + AI fallback) and branded PDF export

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

## Deployment

Designed to deploy to Vercel with a hosted Postgres database (e.g. Neon or
Supabase) and Vercel Blob for audio file storage.
