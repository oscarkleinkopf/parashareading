import type { Config } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";
import { canContribute, currentUser, jsonResponse } from "./_shared/auth";
import {
  alignTranscriptToVerses,
  clampRange,
  parseVerseJson,
  vocabFromVerses,
} from "./_shared/align";

const MAX_BYTES = 6 * 1024 * 1024;

function envGet(name: string): string {
  try {
    const n = (globalThis as { Netlify?: { env?: { get?: (k: string) => string | undefined } } }).Netlify;
    if (n?.env?.get) return n.env.get(name) || "";
  } catch {
    /* ignore */
  }
  return process.env[name] || "";
}

function extractTranscriptFromInteractions(payload: any): string {
  const chunks: string[] = [];
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (const step of steps) {
    const content = Array.isArray(step?.content) ? step.content : [];
    for (const part of content) {
      if (typeof part?.text === "string" && part.text.trim()) chunks.push(part.text.trim());
    }
  }
  if (typeof payload?.text === "string") chunks.push(payload.text);
  return chunks.join(" ").trim();
}

async function transcribeWith35(audioB64: string, mimeType: string, vocab: string[]): Promise<{ transcript: string; model: string } | null> {
  const key = envGet("GEMINI_API_KEY");
  if (!key) return null;
  let base = envGet("GOOGLE_GEMINI_BASE_URL") || "https://generativelanguage.googleapis.com";
  base = base.replace(/\/$/, "");
  const url = /\/v1(beta)?$/i.test(base) ? `${base}/interactions` : `${base}/v1beta/interactions`;

  const body = {
    model: "gemini-3.5-transcribe",
    input: [{ type: "audio", data: audioB64, mime_type: mimeType }],
    generation_config: {
      transcription_config: {
        language_codes: ["he", "iw"],
        custom_vocabulary: vocab.slice(0, 80),
        mode: { type: "verbatim" },
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("gemini-3.5-transcribe failed:", res.status, errText.slice(0, 300));
    return null;
  }
  const payload = await res.json();
  const transcript = extractTranscriptFromInteractions(payload);
  if (!transcript) return null;
  return { transcript, model: "gemini-3.5-transcribe" };
}

type ModelGuess = {
  transcript?: string;
  verseStart?: number | null;
  verseEnd?: number | null;
  confidence?: number;
};

function parseModelJson(text: string): ModelGuess | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function transcribeWithFlash(
  audioB64: string,
  mimeType: string,
  verses: string[],
): Promise<{ transcript: string; guess: ModelGuess | null; model: string } | null> {
  const key = envGet("GEMINI_API_KEY");
  if (!key) return null;

  const listed = verses
    .map((v, i) => `${i + 1}. ${v}`)
    .join("\n")
    .slice(0, 12000);

  const prompt = `Eres un ayudante de leyning (lectura cantada de la Torá en hebreo).
El audio es hebreo cantilado (a menudo ashkenazi). Puede haber errores de lectura.
Versículos de esta Aliá (numerados, 1-indexados):
${listed}

Transcribe lo que se cantó y di qué rango de versículos cubre el audio.
Responde SOLO JSON, sin markdown:
{"transcript":"...hebreo...","verseStart":N,"verseEnd":N,"confidence":0.0}
Si no se entiende el audio, usa null en verseStart y verseEnd.`;

  const ai = new GoogleGenAI({});
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview"];
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { text: prompt },
          { inlineData: { mimeType, data: audioB64 } },
        ],
      });
      const text = (response as { text?: string }).text || "";
      const guess = parseModelJson(text);
      const transcript = (guess && guess.transcript) || text;
      if (transcript && transcript.length > 4) {
        return { transcript, guess, model };
      }
    } catch (err) {
      console.warn("generateContent failed for", model, err);
    }
  }
  return null;
}

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const user = await currentUser();
  if (!user) return jsonResponse({ error: "No autenticado." }, 401);
  if (!canContribute(user)) return jsonResponse({ error: "Requiere rol de rabino." }, 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ error: "Se esperaba multipart/form-data." }, 400);
  }

  const file = form.get("audio");
  if (!(file instanceof File)) return jsonResponse({ error: "Falta el archivo de audio." }, 400);
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return jsonResponse({ error: "La grabación supera el límite de 6 MB." }, 413);
  }

  const verses = parseVerseJson(String(form.get("verses") || "[]"));
  if (!verses.length) {
    return jsonResponse({ error: "Faltan los versículos de la Aliá." }, 400);
  }

  const mimeType = file.type || "audio/webm";
  const audioB64 = Buffer.from(buffer).toString("base64");
  const vocab = vocabFromVerses(verses);

  let transcript = "";
  let modelUsed = "";
  let modelGuess: ModelGuess | null = null;

  try {
    const t35 = await transcribeWith35(audioB64, mimeType, vocab);
    if (t35) {
      transcript = t35.transcript;
      modelUsed = t35.model;
    }
  } catch (err) {
    console.warn("transcribeWith35 threw", err);
  }

  if (!transcript) {
    try {
      const flash = await transcribeWithFlash(audioB64, mimeType, verses);
      if (flash) {
        transcript = flash.transcript;
        modelUsed = flash.model;
        modelGuess = flash.guess;
      }
    } catch (err) {
      console.warn("transcribeWithFlash threw", err);
    }
  }

  if (!transcript) {
    return jsonResponse({
      detected: false,
      reason: "ai_unavailable",
      message: "No se pudo transcribir el audio. Marca el tramo a mano.",
    }, 200);
  }

  const local = alignTranscriptToVerses(transcript, verses);
  let verseStart: number | null = null;
  let verseEnd: number | null = null;
  let score = 0;
  let source = "none";

  if (local) {
    verseStart = local.verseStart;
    verseEnd = local.verseEnd;
    score = local.score;
    source = "align";
  }

  const gStart = modelGuess && Number.isFinite(Number(modelGuess.verseStart)) ? Number(modelGuess.verseStart) : null;
  const gEnd = modelGuess && Number.isFinite(Number(modelGuess.verseEnd)) ? Number(modelGuess.verseEnd) : null;
  if (gStart && gEnd) {
    const clamped = clampRange(gStart, gEnd, verses.length);
    const gConf = typeof modelGuess?.confidence === "number" ? modelGuess.confidence : 0;
    if (!local || local.score < 0.28 || gConf >= 0.7) {
      verseStart = clamped.verseStart;
      verseEnd = clamped.verseEnd;
      score = Math.max(score, gConf);
      source = local ? "model+align" : "model";
    }
  }

  if (!verseStart || !verseEnd) {
    return jsonResponse({
      detected: false,
      reason: "no_match",
      transcript,
      model: modelUsed,
      message: "No se reconoció el tramo. Marca los versículos a mano.",
    }, 200);
  }

  const range = clampRange(verseStart, verseEnd, verses.length);
  return jsonResponse({
    detected: true,
    verseStart: range.verseStart,
    verseEnd: range.verseEnd,
    score,
    source,
    model: modelUsed,
    transcript,
  });
};

export const config: Config = {
  path: "/api/recordings/align",
  method: ["POST"],
};
