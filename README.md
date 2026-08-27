# קול תורה — Cantoral de Torá

**Plataforma de entrenamiento** para personas que quieren subir a hacer una **Aliá a la Torá** y leer por sí mismas.

Está pensada para quien tiene un **nivel básico de hebreo** y necesita practicar, cantilar y **memorizar su porción** con apoyo en español.

No sustituye a un maestro o baal koreh. Complementa la práctica entre clases.

---

## Cómo entrenar

1. Elige tu Parashá (por nombre o por fecha de Bar/Bat Mitzvá).
2. Selecciona la Aliá (1ª–7ª o Maftír).
3. Estudia hebreo + fonética + traducción.
4. Sube de nivel: **Con ayuda → Sin fonética → Como el Sefer**.
5. Escucha tropos sintéticos o una **grabación cantada** (tuya, del rabino o de la comunidad).
6. Ensaya las bendiciones de antes y después.

---

## Funciones

- 54 Parashot, Aliyot y modo verso a verso (flashcards).
- Memorización progresiva (3 niveles) más ajustes finos (ocultar tropos, traducción, repetir versículo).
- Grabación con **micrófono**, subida de archivos y biblioteca comunitaria (rabinos con Netlify Identity + moderación).
- Fuente de audio: síntesis de tropos o voz real sincronizada por versículo.
- PWA instalable.

Guías:

- [Uso para quien practica](docs/GUIA_DE_USO.md)
- [Fuentes de audio](docs/FUENTES_DE_AUDIO.md)
- [Notas técnicas](docs/NOTAS_TECNICAS.md)
- [QA](QA_CHECKLIST.md)

---

## Local

```bash
python3 -m http.server 4173
```

Para Identity, Functions y grabaciones comunitarias:

```bash
npm install
npx netlify dev
```
