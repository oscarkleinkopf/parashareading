import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Grabaciones reales aportadas por rabinos (o lectores capacitados).
// El audio en sí vive en Netlify Blobs; aquí guardamos solo los metadatos consultables.
export const recordings = pgTable("recordings", {
  id: serial().primaryKey(),
  // Identificador de la parashá tal como lo usa el frontend (p. ej. "bereshit").
  parashaId: varchar("parasha_id", { length: 64 }).notNull(),
  // Aliyá: "1".."7" o "M" (maftir).
  aliyah: varchar("aliyah", { length: 8 }).notNull(),
  // Rango de versículos que cubre la grabación (1-indexado dentro de la aliyá). Null = aliyá completa.
  verseStart: integer("verse_start"),
  verseEnd: integer("verse_end"),
  // Clave del objeto en Netlify Blobs.
  blobKey: text("blob_key").notNull(),
  contentType: varchar("content_type", { length: 64 }).notNull().default("audio/webm"),
  durationMs: integer("duration_ms"),
  // Autor (id/nombre provenientes de Netlify Identity).
  uploaderId: varchar("uploader_id", { length: 128 }),
  uploaderName: varchar("uploader_name", { length: 255 }),
  tradition: varchar("tradition", { length: 32 }).notNull().default("ashkenazi"),
  // Estado de moderación: "pending" | "approved" | "rejected".
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;
