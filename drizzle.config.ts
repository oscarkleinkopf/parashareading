import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  // El deploy de Netlify aplica las migraciones desde este directorio.
  out: "netlify/database/migrations",
});
