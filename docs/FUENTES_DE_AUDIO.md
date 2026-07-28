# Fuentes de audio cantado / leído

Cantoral de Torá ya sintetiza **tropos** y puede leer fonética con la voz del navegador. Para entrenar como en la bimá hace falta oír el **texto cantado completo**.

La app permite:

1. **Subir** una grabación del rabino / baal koreh (MP3, M4A, WAV, OGG) — se guarda en el navegador (IndexedDB).
2. **Pegar una URL HTTPS** directa a un archivo de audio.
3. Consultar **fuentes recomendadas** desde el panel de cada Aliá.

---

## Mejor opción pedagógica

Pide a tu **rabino o baal koreh** una grabación de *tu* Aliá con la melodía de tu comunidad.

Ventajas:

- Misma tradición (Ashkenazi oriental/occidental, sefardí, etc.) que oirás el día de la Aliá.
- Ritmo y pronunciación locales.
- Sin problemas de licencia si te la dan para uso personal de estudio.

Guárdala en el panel **Grabación de la Aliá** y elige el modo de audio **Grabación cantada**.

---

## Fuentes públicas útiles

### 1) Sephardic Hazzanut Project (cantado por Aliá)

- Sitio: [sephardichazzanut.com](http://www.sephardichazzanut.com/)
- Tiene MP3 por Parashá y por Aliá (1ª–7ª) en tradición **sefardí**.
- Limitación: el sitio es **HTTP**. Desde un deploy HTTPS no se puede embeber por mixed content.
- Flujo recomendado: descarga el MP3 → **súbelo** en Cantoral de Torá.

### 2) Mechon Mamre / Talking Bibles (hebreo hablado)

- Índice: [Capítulos en MP3](https://www.mechon-mamre.org/p/pt/ptmp3prq.htm)
- Hebreo claro, estilo sefardí de pronunciación.
- **No es cantileo** (no trae melodía de taamim); sirve para oír el texto.
- Sí es **HTTPS**: la app puede sugerir el MP3 del primer capítulo de la Parashá y guardarlo como URL.

Permiso / copyright: grabaciones © Talking Bibles International (1992). Para redistribuir o uso más allá del estudio personal, contacta al titular (`info@talkingbibles.org` según Mechon Mamre).

### 3) Otras referencias (no integradas automáticamente)

| Recurso | Qué ofrece | Nota |
| --- | --- | --- |
| [tikkun.io](https://www.tikkun.io) / proyectos tipo PocketTorah | Tikkun + audio sincronizado | Respeta términos del sitio; no scrapees ni redistribuyas |
| Apps comerciales de leyning (Trope Trainer, etc.) | Melodías Ashkenazi detalladas | Licencia propietaria |
| Grabaciones de tu sinagoga / YouTube de la comunidad | Misma melodía local | Descarga solo si tienes permiso |

No hay hoy una API abierta, libre y completa de leyning Ashkenazi por Aliá que se pueda embeber legalmente en bloque. Por eso la app prioriza **tu grabación** + enlaces/descargas conscientes.

---

## Cómo usarlo en la app

1. Elige Parashá y Aliá.
2. En **Grabación de la Aliá**:
   - sube el archivo, o
   - pega una URL `https://…/archivo.mp3`, o
   - abre **Fuentes recomendadas**.
3. En el reproductor inferior, modo **Grabación cantada**.
4. Ajusta velocidad y bucle como en los tropos.

Las subidas viven **solo en ese navegador/dispositivo**. Si cambias de móvil o borras datos del sitio, hay que volver a cargar el audio.

---

## Futuro posible (compartido en el sitio)

Para que un rabino suba una vez y toda la comunidad practique la misma grabación, haría falta almacenamiento compartido (p. ej. Netlify Blobs + Functions) y control de quién puede subir. No está en esta versión; el flujo local ya permite entrenar sin backend.
