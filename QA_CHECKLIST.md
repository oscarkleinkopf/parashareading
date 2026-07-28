# Checklist de QA

Validación manual orientada al producto: **entrenar una Aliá a la Torá** (lectura + cantileo + memorización) con hebreo básico.

---

## 1) Smoke

- [ ] Servir localmente: `python3 -m http.server 4173`
- [ ] Abrir `http://127.0.0.1:4173` sin errores fatales en consola
- [ ] Cargan `app.js`, `styles.css`, `manifest.json`

## 2) Encontrar la porción (estudiante)

- [ ] Elegir Parashá por nombre y ver banner (hebreo, nombre, referencia, resumen)
- [ ] Buscar por fecha válida y obtener Parashá del Shabat
- [ ] Probar fecha de festividad y revisar lectura especial / mensaje claro
- [ ] Compartir enlace y reabrir el mismo `#Parasha/Aliya`

## 3) Leer la Aliá

- [ ] Cambiar entre Aliyot 1–7 y Maftír
- [ ] Ver hebreo + fonética + traducción en modo paralelo
- [ ] Ajustar tamaño de fuente del hebreo
- [ ] Tocar una palabra con trope y oír el taam

## 4) Audio y cantileo

- [ ] Reproducir / pausar la Aliá
- [ ] Cambiar velocidad y bucle
- [ ] Probar modos: solo tropos / hebreo / fonética español
- [ ] Confirmar degradación amigable si falta voz del sistema

## 5) Memorización (verso a verso)

- [ ] Cambiar a modo flashcard
- [ ] Navegar con botones, flechas y swipe
- [ ] Escuchar el verso actual (botón / espacio)
- [ ] Marcar / desmarcar (botón / tecla `M`)
- [ ] Recargar la página y comprobar que el progreso persiste
- [ ] Usar “continuar desde lo pendiente” y reset de progreso

## 6) Bendiciones y glosario

- [ ] Abrir sección de bendiciones y reproducir práctica
- [ ] Abrir glosario de tropos y escuchar varias tarjetas

## 7) APIs (regresión)

- [ ] Carga dinámica desde Sefaria en una Aliá que no sea Bereshit 1
- [ ] Aviso visible si la traducción no es española
- [ ] Fallo de red o referencia inválida: mensaje en UI, sin romper la app

## 8) Accesibilidad y PWA

- [ ] Controles principales usables por teclado
- [ ] Chips de Aliá actualizan `aria-selected`
- [ ] Manifest y service worker presentes; HTML revalida tras cambios

## 9) Dispositivos

- [ ] Chrome desktop
- [ ] Firefox (flujo base)
- [ ] Safari / iOS (audio y voces)

## 10) Criterio de “listo para practicar”

Una build se considera usable para entrenamiento si un usuario nuevo puede, en menos de 5 minutos:

1. encontrar su Parashá/Aliá,
2. oír al menos un versículo con tropos,
3. marcar un versículo como aprendido en modo verso a verso.
