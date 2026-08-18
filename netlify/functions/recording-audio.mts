import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { recordings } from "../../db/schema";
import { canContribute, currentUser } from "./_shared/auth";

// GET /api/recordings/:id/audio
// Transmite el audio desde Netlify Blobs (same-origin, por eso media-src 'self' basta).
// Las grabaciones aprobadas son públicas; las pendientes solo las ve su autor o un admin.
export default async (_req: Request, context: Context) => {
  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return new Response("Bad request", { status: 400 });

  const [row] = await db.select().from(recordings).where(eq(recordings.id, id)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  if (row.status !== "approved") {
    const user = await currentUser();
    const isOwner = user && user.id === row.uploaderId;
    if (!isOwner && !(user && canContribute(user))) {
      return new Response("Not found", { status: 404 });
    }
  }

  const store = getStore({ name: "recordings" });
  // Uploads are capped at 6 MB, so buffering is fine and lets us set Content-Length,
  // which browsers need to compute <audio>.duration and to allow seeking.
  const buffer = await store.get(row.blobKey, { type: "arrayBuffer" });
  if (!buffer) return new Response("Not found", { status: 404 });

  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": row.contentType || "audio/webm",
      "content-length": String(buffer.byteLength),
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=3600",
    },
  });
};

export const config: Config = {
  path: "/api/recordings/:id/audio",
  method: ["GET"],
};
