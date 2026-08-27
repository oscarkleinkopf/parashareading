# Notas técnicas

Sitio estático (HTML/CSS/JS) en Netlify, con Identity, Functions y Postgres (`@netlify/database` + Drizzle) para grabaciones comunitarias.

## Piezas clave

| Pieza | Rol |
| --- | --- |
| `app.js` | Catálogo, UI, Sefaria/Hebcal, tropos, memorización |
| `recordings.js` | Micrófono, listado, voz real, Identity, moderación |
| `netlify/functions/*.mts` | API de grabaciones y audio |
| `db/schema.ts` | Tabla `recordings` |

## Memorización

Preferencias en `localStorage` (`cantoralMemorizationPrefs`):

- Niveles guiados: `setHelpLevel('full' | 'noPhonetics' | 'sefer')`
- Ajustes finos: `hidePhonetics`, `hideTranslation`, `hideTropes`, `consonantsOnly`, `loopVerse`

## Audio real

`CantoralRecordings` graba con `MediaRecorder` y publica vía `/api/recordings`. El CSP permite `media-src 'self' blob:`. El header `Permissions-Policy` habilita `microphone=(self)`.

## Local

```bash
npm install
npx netlify dev
```

Sin CLI, el estudio de texto/tropos funciona con `python3 -m http.server`; la biblioteca comunitaria requiere Functions.
