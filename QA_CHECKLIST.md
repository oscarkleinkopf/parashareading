# QA Checklist (Manual)

## 1) Smoke local

- [ ] Servir el sitio localmente (`python3 -m http.server 4173`)
- [ ] Abrir `http://127.0.0.1:4173`
- [ ] Confirmar carga visual sin errores fatales
- [ ] Confirmar carga de `app.js`, `styles.css`, `manifest.json`

## 2) Flujo principal de lectura

- [ ] Seleccionar Parasha por nombre desde dropdown
- [ ] Validar render de banner (nombre, hebreo, referencia)
- [ ] Cambiar entre aliyot y confirmar recarga del texto
- [ ] Confirmar que los botones de reproduccion responden

## 3) Flujo por fecha (Hebcal)

- [ ] Buscar una fecha valida y confirmar parasha encontrada
- [ ] Probar una fecha especial/festiva y revisar fallback de lectura especial
- [ ] Confirmar mensajes de error amigables en casos sin datos

## 4) Flujo de textos (Sefaria)

- [ ] Confirmar carga de hebreo para una aliya no local
- [ ] Confirmar fonetica generada
- [ ] Confirmar traduccion (espanol si existe, fallback cuando no)
- [ ] Verificar comportamiento cuando Sefaria responde `error`

## 5) Modo practica

- [ ] Cambiar a modo verso a verso
- [ ] Navegar con botones prev/next
- [ ] Probar teclado (`<-`, `->`, espacio, `m`)
- [ ] Marcar/desmarcar versiculos y validar persistencia

## 6) Accesibilidad basica

- [ ] Navegacion por teclado en controles principales
- [ ] `aria-selected` cambia en chips de aliyot
- [ ] Botones interactivos activables por Enter/Espacio

## 7) PWA y cache

- [ ] Confirmar presencia de `manifest.json`
- [ ] Confirmar registro de service worker
- [ ] Validar que actualizaciones de HTML revalidan correctamente

## 8) Compatibilidad minima

- [ ] Chrome (desktop)
- [ ] Safari/iOS (voz hebreo/espanol cuando exista)
- [ ] Firefox (flujo base)

## 9) Errores y observabilidad

- [ ] Revisar consola del navegador durante uso normal
- [ ] Confirmar que fallos de red no rompen toda la UI
- [ ] Confirmar mensajes de error claros al usuario final
