import { getUser } from "@netlify/identity";

// getUser() lee el JWT de la petición actual (cabecera Authorization / cookie nf_jwt).
// Devuelve null si no hay sesión válida.
export async function currentUser() {
  try {
    return await getUser();
  } catch {
    return null;
  }
}

export function userRoles(user: any): string[] {
  // El User tipado de @netlify/identity expone `roles` (derivado de app_metadata.roles).
  if (user && Array.isArray(user.roles)) return user.roles;
  if (user && user.appMetadata && Array.isArray(user.appMetadata.roles)) return user.appMetadata.roles;
  return [];
}

export function hasRole(user: any, role: string): boolean {
  return userRoles(user).includes(role);
}

// Puede aportar grabaciones cualquier usuario con rol "rabbi" o "admin".
export function canContribute(user: any): boolean {
  return hasRole(user, "rabbi") || hasRole(user, "admin");
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
