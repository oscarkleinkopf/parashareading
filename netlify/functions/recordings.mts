import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { recordings, type NewRecording } from "../../db/schema";
import { canContribute, currentUser, jsonResponse } from "./_shared/auth";

const STORE_NAME = "recordings";
const MAX_BYTES = 6 * 1024 * 1024; // límite de payload buffered de una Function (6 MB)

export default async (req: Request, _context: Context) => {
  if (req.method === "GET") return listRecordings(req);
  if (req.method === "POST") return uploadRecording(req);
  return new Response("Method not allowed", { status: 405 });
};

// GET /api/recordings?parasha=<id>&aliyah=<1..7|M>
// Devuelve solo las grabaciones aprobadas para esa parashá/aliyá.
async function listRecordings(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parasha = url.searchParams.get("parasha");
  const aliyah = url.searchParams.get("aliyah");
  if (!parasha || !aliyah) {
    return jsonResponse({ error: "Faltan parámetros 'parasha' y 'aliyah'." }, 400);
  }

  try {
    const rows = await db
      .select()
      .from(recordings)
      .where(and(
        eq(recordings.parashaId, parasha),
        eq(recordings.aliyah, aliyah),
        eq(recordings.status, "approved"),
      ))
      .orderBy(desc(recordings.createdAt));

    // No exponemos blobKey; en su lugar entregamos una URL de streaming same-origin.
    const items = rows.map((r) => ({
      id: r.id,
      parashaId: r.parashaId,
      aliyah: r.aliyah,
      verseStart: r.verseStart,
      verseEnd: r.verseEnd,
      durationMs: r.durationMs,
      uploaderName: r.uploaderName,
      tradition: r.tradition,
      createdAt: r.createdAt,
      audioUrl: `/api/recordings/${r.id}/audio`,
    }));

    return jsonResponse({ recordings: items });
  } catch (err) {
    // Sin DB local migrada (o Identity/DB aún no provisionada) degradamos a lista vacía
    // en vez de un 500 crudo que rompe el panel de la comunidad.
    console.error("listRecordings failed:", err);
    return jsonResponse({ recordings: [], warning: "backend_unavailable" }, 200);
  }
}

// POST /api/recordings  (multipart/form-data)
// Campos: audio (File), parasha, aliyah, verseStart?, verseEnd?, durationMs?, tradition?
async function uploadRecording(req: Request): Promise<Response> {
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
  const parasha = String(form.get("parasha") || "");
  const aliyah = String(form.get("aliyah") || "");
  if (!(file instanceof File)) return jsonResponse({ error: "Falta el archivo de audio." }, 400);
  if (!parasha || !aliyah) return jsonResponse({ error: "Faltan 'parasha' y 'aliyah'." }, 400);

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return jsonResponse({ error: "La grabación supera el límite de 6 MB." }, 413);
  }

  const contentType = file.type || "audio/webm";
  const blobKey = `${parasha}/${aliyah}/${crypto.randomUUID()}`;

  const store = getStore({ name: STORE_NAME });
  await store.set(blobKey, buffer, {
    metadata: { contentType, uploadedAt: new Date().toISOString() },
  });

  const toInt = (v: FormDataEntryValue | null) => {
    const n = parseInt(String(v ?? ""), 10);
    return isNaN(n) ? null : n;
  };

  const row: NewRecording = {
    parashaId: parasha,
    aliyah,
    verseStart: toInt(form.get("verseStart")),
    verseEnd: toInt(form.get("verseEnd")),
    blobKey,
    contentType,
    durationMs: toInt(form.get("durationMs")),
    uploaderId: user.id,
    uploaderName: user.name || user.email || "Rabino",
    tradition: String(form.get("tradition") || "ashkenazi"),
    status: "pending",
  };

  const [created] = await db.insert(recordings).values(row).returning();
  return jsonResponse({ recording: { id: created.id, status: created.status } }, 201);
}

export const config: Config = {
  path: "/api/recordings",
  method: ["GET", "POST"],
};
