# Notas técnicas

Sitio estático (HTML/CSS/JS) en Netlify, con Identity, Functions y Postgres (`@netlify/database` + Drizzle) para grabaciones comunitarias.

## Piezas clave

| Pieza | Rol |
| --- | --- |
| `app.js` | Catálogo, UI, Sefaria/Hebcal, tropos, memorización |
| `recordings.js` | Micrófono, versiones por rabino, parches, Identity, moderación |
| `recording-versions.js` | Cómo se elige el clip de cada versículo (parche gana a toma larga) |
| `netlify/functions/*.mts` | API de grabaciones y audio |
| `db/schema.ts` | Tabla `recordings` |

## Memorización

Preferencias en `localStorage` (`cantoralMemorizationPrefs`):

- Niveles guiados: `setHelpLevel('full' | 'noPhonetics' | 'sefer')`
- Ajustes finos: `hidePhonetics`, `hideTranslation`, `hideTropes`, `consonantsOnly`, `loopVerse`

## Audio real

`CantoralRecordings` graba con `MediaRecorder` (o un archivo) y publica vía `POST /api/recordings`. Las tomas de rabino/admin quedan **aprobadas al instante** (referencia pública). Cada `uploaderId` es una versión: si hay un parche más corto y más nuevo para unos versículos, el reproductor lo usa en ese tramo y sigue con el resto.

El CSP permite `media-src 'self' blob:`. El header `Permissions-Policy` habilita `microphone=(self)`.

Helpers de versión (sin DOM): `recording-versions.js`. Tests: `npm test`.

## Local

```bash
npm install
npx netlify dev
```

Sin CLI, el estudio de texto/tropos funciona con `python3 -m http.server`; la biblioteca comunitaria requiere Functions.
