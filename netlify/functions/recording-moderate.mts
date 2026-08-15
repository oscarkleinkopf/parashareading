import type { Context, Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index";
import { recordings } from "../../db/schema";
import { currentUser, hasRole, jsonResponse } from "./_shared/auth";

// POST /api/recordings/:id/moderate  { status: "approved" | "rejected" | "pending" }
// Solo administradores pueden moderar.
export default async (req: Request, context: Context) => {
  const user = await currentUser();
  if (!user) return jsonResponse({ error: "No autenticado." }, 401);
  if (!hasRole(user, "admin")) return jsonResponse({ error: "Requiere rol de administrador." }, 403);

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return jsonResponse({ error: "Id inválido." }, 400);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido." }, 400);
  }

  const status = String(body?.status || "");
  if (!["approved", "rejected", "pending"].includes(status)) {
    return jsonResponse({ error: "Estado inválido." }, 400);
  }

  const [updated] = await db
    .update(recordings)
    .set({ status, updatedAt: new Date() })
    .where(eq(recordings.id, id))
    .returning();

  if (!updated) return jsonResponse({ error: "Grabación no encontrada." }, 404);
  return jsonResponse({ recording: { id: updated.id, status: updated.status } });
};

export const config: Config = {
  path: "/api/recordings/:id/moderate",
  method: ["POST"],
};
