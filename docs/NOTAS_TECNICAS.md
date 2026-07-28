# Notas técnicas

Documento para quien mantiene o despliega Cantoral de Torá. El producto de cara al usuario está descrito en el [README](../README.md) y en la [guía de uso](GUIA_DE_USO.md).

---

## Arquitectura

Aplicación **estática** (HTML/CSS/JS) sin bundler ni framework.

```text
index.html
  ├── styles.css
  ├── trope_synthesizer.js   # Web Audio: motivos de tropos
  ├── app.js                 # estado, UI, APIs, práctica, memorización
  ├── manifest.json
  └── service-worker.js
```

- Estado de UI y reproducción: objeto `App` en `app.js`.
- Catálogo de 54 Parashot y mapa de Aliyot: datos embebidos en `app.js`.
- Una Aliá de alta fidelidad (Bereshit 1) vive en `localDatabase` para uso offline inmediato.
- El resto de textos se pide a Sefaria en tiempo de ejecución.
- Progreso de memorización: `localStorage` clave `cantoralPracticeProgress`.

---

## APIs externas

Permitidas en la CSP de `netlify.toml` (`connect-src`):

| Servicio | Uso |
| --- | --- |
| Hebcal | Parashá del Shabat a partir de una fecha |
| Sefaria | Texto hebreo y traducción por referencia de Aliá |

Comportamientos a tener en cuenta:

- Sefaria puede devolver HTTP `200` con cuerpo `{ "error": "..." }` — conviene tratar `data.error` además de `try/catch`.
- `he` y `text` a veces no tienen la misma longitud; la UI rellena huecos con un mensaje de traducción no disponible.
- Preferencia de versiones en español vía parámetro `ven` (según libro); si no hay versión ES, se muestra aviso.

---

## Audio

1. **Tropos** — `TropeSynthesizer` (Web Audio API) con motivos por taam.
2. **Voz** — `speechSynthesis` del navegador (`he-IL` o `es-ES` según modo).
3. Cola de reproducción por versículo: detecta marcas de cantileación Unicode y programa motivos + karaoke de palabras.

Sin voz hebrea/española instalada, la app degrada el modo de audio y notifica al usuario.

---

## Rutas y compartir

Hash routing:

```text
#ParashaId/aliyah
```

Ejemplo: `#Yitro/4` → Parashat Yitró, 4ª Aliá.

El botón de compartir usa `navigator.share` o copia al portapapeles.

---

## Netlify

Ver `netlify.toml`:

- Publicación del directorio raíz (sin build).
- Headers de seguridad (CSP, frame deny, etc.).
- Caché agresiva en `.js` / `.css`; revalidación en HTML, SW y manifest.
- Rewrite `/* → /index.html` (200) para deep links / SPA.

Variables de entorno: no se requieren para el flujo actual (APIs públicas desde el cliente).

---

## Desarrollo local

```bash
python3 -m http.server 4173
```

No hay `package.json` ni tests automatizados. Usar [QA_CHECKLIST.md](../QA_CHECKLIST.md) antes de publicar cambios grandes.

---

## Deuda técnica conocida

- Gran parte de la lógica vive en un solo `app.js` (catálogo + UI + APIs + audio).
- Sin suite de tests; la calidad se apoya en checklist manual.
- Manejo de errores de Sefaria mejorable (`response.ok` / `data.error`).
- Cobertura offline limitada (PWA cachea assets; textos dinámicos dependen de red).

Prioridad de mejoras sugeridas (producto):

1. Robustecer errores de APIs con mensajes claros al estudiante.
2. Expandir datos locales / caché de Aliyot ya estudiadas (memorización sin red).
3. Modularizar `app.js` sin cambiar el flujo pedagógico.
