# קול תורה — Cantoral de Torá

**Plataforma de entrenamiento** para personas que quieren subir a hacer una **Aliá a la Torá** y leer por sí mismas.

Está pensada para quien tiene un **nivel básico de hebreo** (reconoce letras y puede seguir vocalización) y necesita practicar, cantilar y **memorizar su porción** con apoyo en español.

---

## ¿Para quién es?

- Quien prepara su **Bar/Bat Mitzvá** y debe leer una Aliá.
- Quien recibe una Aliá en Shabat o festividad y quiere practicar en casa.
- Quien ya lee un poco de hebreo y quiere ganar seguridad con **texto + fonética + audio**.
- Quien necesita **memorizar versículo a versículo** antes del día de la lectura.

No sustituye a un maestro o baal koreh. Complementa la práctica personal entre clases.

---

## Qué problema resuelve

Leer en la bimá exige tres cosas a la vez: reconocer el hebreo, seguir el ritmo del cantileo y recordar la porción. Muchas personas se quedan solo con una grabación o un PDF, y eso no alcanza para entrenar.

Cantoral de Torá reúne en un solo lugar:

| Necesidad | Cómo ayuda la app |
| --- | --- |
| Encontrar *mi* lectura | Buscar por Parashá o por fecha de Bar/Bat Mitzvá |
| Entender el texto | Hebreo + fonética en español + traducción |
| Aprender el cantileo | Tropos Ashkenazi con audio interactivo |
| Memorizar | Modo verso a verso, marcar progreso y repetir |
| Ensayar el ritual | Bendiciones antes y después de la Aliá |

---

## Cómo entrenar (flujo recomendado)

1. **Elige tu porción**  
   Por nombre (las 54 Parashot) o por fecha del Bar/Bat Mitzvá / Shabat.
2. **Selecciona la Aliá**  
   1ª a 7ª, o Maftír, según lo que te hayan asignado.
3. **Lee en paralelo**  
   Hebreo a la derecha, fonética y sentido en español a la izquierda.
4. **Escucha y canta**  
   Reproduce la Aliá con tropos; toca una palabra para oír su taam.
5. **Memoriza verso a verso**  
   Cambia al modo flashcard, marca lo que ya sabes y vuelve a lo pendiente.
6. **Practica las bendiciones**  
   Ensaya Birkat HaTorá antes y después de subir.

Consejo: practica primero con fonética + audio, luego solo hebreo, y por último intenta sin mirar.

---

## Funciones principales

- Catálogo completo de las **54 Parashot** (Bereshit → Vezot Haberajá).
- División por **Aliyot** con límites de lectura.
- **Fonética orientada al español** generada a partir del hebreo vocalizado.
- **Traducción** (español cuando Sefaria lo ofrece; aviso si cae a inglés).
- Reproductor de **cantileo Ashkenazi** (tropos / taamim).
- Modos de audio: solo tropos, hebreo hablado, fonética en español, o **grabación cantada completa**.
- **Subida de grabaciones** del rabino / baal koreh (por Aliá) y soporte de URL HTTPS.
- Catálogo de [fuentes de audio](docs/FUENTES_DE_AUDIO.md) para practicar el texto cantado.
- **Modo verso a verso** (flashcards) con teclado y gestos en móvil.
- **Progreso de práctica** guardado en el navegador (versículos marcados).
- Glosario interactivo de tropos.
- Bendiciones de la Torá para ensayar el ritual.
- Compartir enlace directo a tu Parashá/Aliá.
- Instalable como **PWA** (uso en móvil casi como app).

---

## Ejecutar en local

No hace falta instalar dependencias. Desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Abre [http://127.0.0.1:4173](http://127.0.0.1:4173).

---

## Estructura del proyecto

| Archivo | Rol |
| --- | --- |
| `index.html` | Interfaz de estudio y práctica |
| `app.js` | Lógica principal: Parashot, Aliyot, APIs, audio, memorización |
| `trope_synthesizer.js` | Síntesis de tropos Ashkenazi |
| `chanted_recordings.js` | Biblioteca local de grabaciones cantadas (IndexedDB + URL) |
| `styles.css` | Estilos |
| `manifest.json` / `service-worker.js` | PWA |
| `netlify.toml` | Despliegue y headers en Netlify |

Documentación adicional:

- [Guía de uso para quien practica](docs/GUIA_DE_USO.md)
- [Fuentes de audio cantado](docs/FUENTES_DE_AUDIO.md)
- [Notas técnicas para quien desarrolla](docs/NOTAS_TECNICAS.md)
- [Checklist de QA](QA_CHECKLIST.md)

---

## Despliegue

Sitio estático listo para Netlify (`publish = "."` en `netlify.toml`), con headers de seguridad, caché de assets y fallback SPA a `index.html`.

---

## Licencia y uso

Proyecto educativo. Los textos de Torá se obtienen de fuentes públicas (p. ej. Sefaria) y el calendario de lecturas puede apoyarse en Hebcal. Respeta los términos de esos servicios si redistribuyes o despliegas tu propia instancia.
