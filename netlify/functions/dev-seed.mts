import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { and, eq } from "drizzle-orm";
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
    eq(recordings.uploaderId, "demo"),
  ));

  const seconds = 6;
  const wav = makeWav(seconds, 210);
  const blobKey = `${parasha}/${aliyah}/demo-${Date.now()}`;
  const store = getStore({ name: "recordings" });
  await store.set(blobKey, new Uint8Array(wav) as unknown as ArrayBuffer, { metadata: { contentType: "audio/wav" } });

  const [created] = await db.insert(recordings).values({
    parashaId: parasha,
    aliyah: aliyah,
    verseStart: 1,
    verseEnd: 3,
    blobKey,
    contentType: "audio/wav",
    durationMs: seconds * 1000,
    uploaderId: "demo",
    uploaderName: "Rabino Demo",
    tradition: "ashkenazi",
    status: "approved",
  }).returning();

  return new Response(JSON.stringify({ seeded: created }), {
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = { path: "/api/dev-seed" };
