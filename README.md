# Cantoral de Tora (parashareading)

Aplicacion web estatica para practicar lectura de la Tora (Parasha/Aliya) con:
- texto hebreo
- fonetica en espanol
- traduccion
- reproduccion de tropos/cantileo
- modo de practica verso a verso

## Stack y estructura

- Frontend: HTML + CSS + JavaScript vanilla
- PWA: `manifest.json` y `service-worker.js`
- Despliegue: Netlify (sitio estatico)
- Archivo principal de logica: `app.js`

Archivos clave:
- `index.html`: interfaz principal
- `app.js`: estado global, UI, consumo de APIs, audio y practica
- `trope_synthesizer.js`: sintesis de tropos
- `styles.css`: estilos
- `netlify.toml`: headers, cache y fallback SPA

## Ejecucion local

No requiere instalacion de dependencias.

Opcion rapida con Python:

```bash
python3 -m http.server 4173
```

Luego abre:

```text
http://127.0.0.1:4173
```

## Integraciones externas

La app consume APIs publicas en cliente:

- Hebcal: calculo de Parasha por fecha (`https://www.hebcal.com`)
- Sefaria: texto hebreo y traducciones (`https://www.sefaria.org`)

Notas observadas en la integracion:
- Sefaria puede responder `200` con un objeto que contiene `error`.
- En algunas referencias, `he` y `text` pueden tener longitudes distintas.
- La app ya tiene `try/catch`, pero no valida explicitamente `response.ok` ni `data.error`.

## Despliegue Netlify

Configuracion en `netlify.toml`:
- `publish = "."`
- headers de seguridad (CSP, X-Frame-Options, etc.)
- cache para assets estaticos
- fallback SPA:
  - `from = "/*"`
  - `to = "/index.html"`
  - `status = 200`

## Estado tecnico actual (resumen)

- Repositorio limpio en `main` al momento de revision.
- Proyecto funcional como sitio estatico local (responde `200` en `index.html` y `app.js`).
- Sin tests automatizados detectados.
- Riesgo de mantenibilidad: gran concentracion de logica en `app.js`.

## QA recomendado

Ver checklist manual en:

- `QA_CHECKLIST.md`