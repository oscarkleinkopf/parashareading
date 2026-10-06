# Material de terceros / Third-party material

Este repositorio incluye o referencia material que **no** es de propiedad de Osias Kleinkopf. Ese material **no** queda cubierto por `LICENSE` (ni por `LICENSE-CONTENT.md`, si existe). Se rige por la licencia o los términos de su titular.

This repository includes or references material not owned by Osias Kleinkopf. Such material is NOT covered by `LICENSE` (or `LICENSE-CONTENT.md`) and remains under its owners' licenses or terms.

## Inventario

| Material | Ubicación en el repo | Origen / titular | Licencia o términos | Notas |
|---|---|---|---|---|
| Texto hebreo de la Torá y signos de cantilación (te'amim) | No hay un corpus aparte. En tiempo de ejecución: `app.js` (`https://www.sefaria.org/api/texts/`). Copia offline de Bereshit 1:1–1:8 con te'amim en `app.js` (`localDatabase`). Nombres hebreos de las parashot en `app.js`. Hebreo de las bendiciones en `index.html`. | Sefaria API (pie de `index.html` y `app.js`). La copia offline y las bendiciones no citan edición: por confirmar | Por confirmar | Ver también `docs/FUENTES_DE_AUDIO.md` |
| Traducciones pedidas a Sefaria (español o inglés de respaldo) | No se versionan. `app.js` (`fetchAndDisplayDynamicSefariaText`) | Sefaria. Títulos pedidos en el código: «El Pentateuco Con El Comentario de Rabí Shelomó Itzjakí (Rashí) [es]», «Alfredo cerhy [es]», «Sefaria Community Translation [es]», o la versión por defecto | Por confirmar | No son el contenido propio de CC BY-NC-SA |
| Grabaciones cantadas (rabino, comunidad, usuarios) | No se versionan en el repo (las sube cada usuario; el backend está en `netlify/functions/recordings.mts` y `netlify/functions/recording-audio.mts`) | Cada persona que graba | Todos los derechos de sus autores; requieren consentimiento | Excluidas de MIT y de CC BY-NC-SA |
| Tropos sintéticos / voces TTS | Voces: `app.js` (`speechSynthesis`). Melodía: `trope_synthesizer.js` (el código es propio y queda bajo MIT) | Navegador / proveedor TTS. La escala del sintetizador se describe en el código como cantilación ashkenazí tradicional | Términos del proveedor de la voz. Titular de las melodías tradicionales: por confirmar |  |
| Datos de calendario | `app.js` (`https://www.hebcal.com/hebcal`) | Hebcal API (pie de `index.html`) | Por confirmar |  |
| Fuentes tipográficas | `styles.css` (import desde `fonts.googleapis.com`: Inter, Outfit, Tinos, Frank Ruhl Libre). `index.html` nombra SBL Hebrew, Taamey Ashkenaz y Ezra SIL como reserva; no hay archivos de fuente en el repo | Google Fonts. Las otras tres no están empaquetadas | Por confirmar |  |
| Audio público solo referenciado | `docs/FUENTES_DE_AUDIO.md` | Mechon Mamre / Talking Bibles, Sephardic Hazzanut, tikkun.io | Por confirmar | El doc pide respetar sus términos; no se embeben en el repo |

## Categorías a revisar

- **Textos tradicionales o de terceros** (p. ej. Torá, brajot, tefilot, citas, traducciones ajenas).
- **Datos** (APIs, datasets, tablas oficiales).
- **Audio** (música, grabaciones de personas, tropos/melodías).
- **Imágenes e ilustraciones** (de terceros, stock o generadas por IA con términos del proveedor).
- **Fuentes tipográficas e íconos.**
- **Marcas y logotipos** de terceros: se usan solo como referencia y no se licencian.
- **Dependencias de software:** ver `package.json` / lockfile. Cada paquete conserva su propia licencia.

Si eres titular de algún material incluido y quieres que se corrija la atribución o se retire, escribe a través de https://aqabank.cl.
