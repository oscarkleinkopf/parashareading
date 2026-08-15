import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema";

// La conexión se configura automáticamente vía NETLIFY_DB_URL en build/functions/dev.
export const db = drizzle({ schema });
