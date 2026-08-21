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
- **Netlify Identity does NOT work under `netlify dev`.** Login/signup/roles only work on a real Netlify deploy — use `npx netlify deploy` for a preview. Locally the auth panel shows a "requires Netlify" message; the synthesized-audio flow still works.
- **Netlify Database**: never apply migrations to a hosted DB by hand — the deploy applies them. For the local `netlify dev` DB use `npm run db:migrate` (`netlify database migrations apply`). `netlify dev` injects its **own** Postgres (`NETLIFY_DB_URL` pointing at a local port such as `localhost:41311`) and **ignores** a `.env` override of that variable. If `GET /api/recordings` fails with `relation "recordings" does not exist`, run `npm run db:migrate` while `netlify dev` is running. After editing `db/schema.ts`, run `npm run db:generate` and commit the new file under `netlify/database/migrations/`.
- **Demo seed (local only):** `GET /api/dev-seed?parasha=Bereshit&aliyah=1` inserts an approved WAV for “voz real” testing. It 404s outside `netlify dev`.
- **CSP**: `connect-src` is `'self' https://www.hebcal.com https://www.sefaria.org` and `media-src` is `'self' blob:`. Any new external endpoint must be added to the CSP in `netlify.toml` or the browser blocks it. Recording audio is served same-origin via `/api/recordings/:id/audio`.
- **Roles**: contributing recordings requires the `rabbi` (or `admin`) role; moderation requires `admin`. The first admin must be invited from the Netlify Identity dashboard (cannot be created in code).
- **Service worker** deliberately does NOT cache `/api/*` or `/.netlify/*`. Bump the `?v=` on assets in `index.html` and the `CACHE_NAME`/precache list in `service-worker.js` together when shipping asset changes, then clear site data once so an old SW does not keep serving stale `recordings.js`.
- **Memorización:** the practice panel toggles `body.hide-phonetics` / `body.hide-translation` and `App.state.loopVerse` (repeat the current verse). They are session-only (not localStorage).
- **Player "Fuente":** `Sintetizado` uses the Web Audio tropes; approved community takes appear as extra options after `GET /api/recordings`. Real audio is verse-level (not word-level). `netlify dev` + `GET /api/dev-seed?parasha=Bereshit&aliyah=1` is enough to test it without Identity.

### Testing / lint / build
- Typecheck backend: `npx tsc --noEmit`.
- Build frontend Identity bundle: `npm run build`.
- No unit-test suite. "Verifying" means: serve with `netlify dev`, pick a Parashá, confirm the word-by-word melody highlight + progress, and (on a deploy) log in as a `rabbi` to record/upload and as `admin` to moderate.
