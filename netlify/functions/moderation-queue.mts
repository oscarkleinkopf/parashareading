import type { Context, Config } from "@netlify/functions";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db/index";
import { recordings } from "../../db/schema";
import { currentUser, hasRole, jsonResponse } from "./_shared/auth";

// GET /api/moderation/recordings?status=pending
// Cola de moderación: lista grabaciones por estado (solo admin).
export default async (req: Request, _context: Context) => {
  const user = await currentUser();
  if (!user) return jsonResponse({ error: "No autenticado." }, 401);
  if (!hasRole(user, "admin")) return jsonResponse({ error: "Requiere rol de administrador." }, 403);

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";

  const rows = await db
    .select()
    .from(recordings)
    .where(eq(recordings.status, status))
    .orderBy(desc(recordings.createdAt));

  const items = rows.map((r) => ({
    id: r.id,
    parashaId: r.parashaId,
    aliyah: r.aliyah,
    verseStart: r.verseStart,
    verseEnd: r.verseEnd,
    uploaderName: r.uploaderName,
    tradition: r.tradition,
    status: r.status,
    createdAt: r.createdAt,
    audioUrl: `/api/recordings/${r.id}/audio`,
  }));

  return jsonResponse({ recordings: items });
};

export const config: Config = {
  path: "/api/moderation/recordings",
  method: ["GET"],
};
