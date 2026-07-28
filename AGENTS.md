# AGENTS.md

## Cursor Cloud specific instructions

### What this is
`Cantoral de Torá` is a **pure static, client-side PWA** (vanilla HTML/CSS/JS, no framework, no bundler). There is **no `package.json`, no build step, no backend, and no database**. Deploy target is Netlify (`netlify.toml`, `publish = "."`).

### Running in dev
No install is required. Serve the repo root over HTTP (not `file://`, so the service worker / `fetch` / manifest work):
- Faithful to prod (applies `netlify.toml` headers, CSP, SPA redirect): `npx -y netlify-cli dev --port 8888`
- Zero-install fallback: `python3 -m http.server 8080`

Then open the served URL. There are no dev/build/test npm scripts to run.

### External dependencies (required for full functionality)
The app fetches directly from two public APIs from the browser; **outbound network access is required** to exercise it end to end (no API keys needed):
- Hebcal (`https://www.hebcal.com`) — resolves a date → Parashá.
- Sefaria (`https://www.sefaria.org`) — fetches Hebrew text + translation.

The production CSP in `netlify.toml` restricts `connect-src` to exactly these two hosts. `netlify dev` enforces that CSP, so any **new** external endpoint must be added there or browser requests will be blocked. A plain `python -m http.server` does not apply the CSP.

### Testing / lint / build
There is no test suite, linter config, or build. "Verifying" means serving the site and confirming the core flow: enter a date (or pick a Parashá), and confirm Hebrew text + phonetics + translation load from the external APIs.
