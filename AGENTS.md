# AGENTS.md

## Cursor Cloud specific instructions

### What this is
`Cantoral de Torá` is a Spanish-language PWA to learn to read and chant a Torah portion (read + listen to memorize). The frontend is **vanilla HTML/CSS/JS** (no framework). It now also has a **Netlify backend** for community recordings by rabbis (Identity + Functions + Blobs + Database). Deploy target is Netlify (`netlify.toml`).

### Layout
- Frontend (served statically from repo root): `index.html`, `app.js` (main logic + trope player), `trope_synthesizer.js` (Web Audio melody), `recordings.js` (auth + community recordings UI), `styles.css`, `service-worker.js`, `manifest.json`.
- `assets/netlify-identity.js` is the **built** browser bundle of `@netlify/identity` (source: `frontend/identity-entry.mjs`, built by `npm run build` with esbuild). It is committed so dev works without a build; the Netlify deploy also rebuilds it via the `[build]` command.
- Backend: `netlify/functions/*.mts` (recordings list/upload, audio streaming, moderation), `db/schema.ts` + `db/index.ts` (Drizzle), `drizzle.config.ts`, migrations in `netlify/database/migrations/`.

### Running in dev
Install deps with `npm install`. Then:
- Full stack (functions + Blobs sandbox + static): `npx netlify dev` (serves on 8888; applies `netlify.toml` headers/CSP/redirects).
- Static-only quick check: `python3 -m http.server 8080` (no functions, no CSP).

Build the Identity bundle when its source changes: `npm run build`.

### Important non-obvious caveats
- **Netlify Identity does NOT work under `netlify dev`.** Login/signup/roles only work on a real Netlify deploy — use `npx netlify deploy` for a preview. Locally the auth panel shows a "requires Netlify" message and the recordings API returns empty; the app still works for the synthesized-audio flow.
- **Netlify Database**: never apply migrations to a hosted DB by hand — the deploy applies them. For the local dev DB use `npm run db:migrate` (alias for `netlify database migrations apply`). After editing `db/schema.ts`, run `npm run db:generate` and commit the new file under `netlify/database/migrations/`. Requires `netlify database` provisioning (needs a Netlify login), so the DB-backed endpoints won't run in a bare local sandbox.
- **CSP**: `connect-src` is `'self' https://www.hebcal.com https://www.sefaria.org` and `media-src` is `'self' blob:`. Any new external endpoint must be added to the CSP in `netlify.toml` or the browser blocks it. Recording audio is streamed same-origin via a Function (`/api/recordings/:id/audio`) so `media-src 'self'` covers it; `blob:` covers `MediaRecorder` previews.
- **Roles**: contributing recordings requires the `rabbi` (or `admin`) role; moderation requires `admin`. The first admin must be invited from the Netlify Identity dashboard (cannot be created in code).
- **Service worker** deliberately does NOT cache `/api/*` or `/.netlify/*` (auth/uploads/moderation must be live). Bump the `?v=` on assets in `index.html` and the `CACHE_NAME`/precache list in `service-worker.js` together when shipping asset changes.

### Testing / lint / build
- Typecheck backend: `npx tsc --noEmit`.
- Build frontend Identity bundle: `npm run build`.
- No unit-test suite. "Verifying" means: serve with `netlify dev`, pick a Parashá, confirm the word-by-word melody highlight + progress, and (on a deploy) log in as a `rabbi` to record/upload and as `admin` to moderate.
