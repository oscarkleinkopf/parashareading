import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index";
import { recordings } from "../../db/schema";

// Dev-only seeder for local `netlify dev`: inserts one approved demo recording
// so "voz real" playback can be exercised without Identity.
// Guarded to deploy.context === "dev" so preview/prod return 404.
function makeWav(seconds: number, freq: number, sampleRate = 8000): Buffer {
  const samples = seconds * sampleRate;
  const dataLen = samples * 2; // 16-bit mono
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < samples; i++) {
    // Gentle amplitude + slow pitch drift so it sounds like chanting, not a flat beep.
    const t = i / sampleRate;
    const f = freq + Math.sin(t * 1.5) * 12;
    const amp = 0.28 * (0.6 + 0.4 * Math.sin(t * 2));
    const v = Math.round(Math.sin(2 * Math.PI * f * t) * amp * 32767);
    buf.writeInt16LE(v, 44 + i * 2);
  }
  return buf;
}

export default async (req: Request, context: Context) => {
  // Solo en `netlify dev`. Nunca en preview/producción.
  if (context.deploy?.context !== "dev") {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const parasha = url.searchParams.get("parasha") || "Bereshit";
  const aliyah = url.searchParams.get("aliyah") || "1";

  // Idempotent: clear previous demo rows for this parasha/aliyah first.
  await db.delete(recordings).where(and(
    eq(recordings.parashaId, parasha),
    eq(recordings.aliyah, aliyah),
    inArray(recordings.uploaderId, ["demo", "demo-a", "demo-b"]),
  ));

  const store = getStore({ name: "recordings" });
  const stamp = Date.now();

  async function insertClip(opts: {
    start: number;
    end: number;
    freq: number;
    seconds: number;
    uploaderId: string;
    uploaderName: string;
    createdAt: Date;
    suffix: string;
  }) {
    const wav = makeWav(opts.seconds, opts.freq);
    const blobKey = `${parasha}/${aliyah}/${opts.uploaderId}-${opts.suffix}-${stamp}`;
    await store.set(blobKey, new Uint8Array(wav) as unknown as ArrayBuffer, {
      metadata: { contentType: "audio/wav" },
    });
    const [created] = await db.insert(recordings).values({
      parashaId: parasha,
      aliyah,
      verseStart: opts.start,
      verseEnd: opts.end,
      blobKey,
      contentType: "audio/wav",
      durationMs: opts.seconds * 1000,
      uploaderId: opts.uploaderId,
      uploaderName: opts.uploaderName,
      tradition: "ashkenazi",
      status: "approved",
      createdAt: opts.createdAt,
    }).returning();
    return created;
  }

  // Dos rabinos + un parche del primero (versículo 2) para probar el selector de versiones.
  const seeded = [
    await insertClip({
      start: 1, end: 3, freq: 210, seconds: 6,
      uploaderId: "demo-a", uploaderName: "Rabino Demo A",
      createdAt: new Date("2026-01-01T00:00:00Z"), suffix: "full",
    }),
    await insertClip({
      start: 2, end: 2, freq: 330, seconds: 2,
      uploaderId: "demo-a", uploaderName: "Rabino Demo A",
      createdAt: new Date("2026-02-01T00:00:00Z"), suffix: "patch",
    }),
    await insertClip({
      start: 1, end: 3, freq: 160, seconds: 6,
      uploaderId: "demo-b", uploaderName: "Rabino Demo B",
      createdAt: new Date("2026-01-15T00:00:00Z"), suffix: "full",
    }),
  ];

  return new Response(JSON.stringify({ seeded }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = { path: "/api/dev-seed" };
