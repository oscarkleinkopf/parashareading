// Punto de entrada que empaqueta @netlify/identity para el navegador (sin CDN, CSP-safe).
// esbuild lo compila a assets/netlify-identity.js y lo exponemos en window.NetlifyIdentity
// para que el resto del frontend (vanilla JS) lo consuma sin necesidad de imports.
import {
  getUser,
  isAuthenticated,
  login,
  logout,
  signup,
  onAuthChange,
  handleAuthCallback,
  AUTH_EVENTS,
} from "@netlify/identity";

window.NetlifyIdentity = {
  getUser,
  isAuthenticated,
  login,
  logout,
  signup,
  onAuthChange,
  handleAuthCallback,
  AUTH_EVENTS,
};

// Señal para que el frontend sepa que el SDK ya está disponible.
window.dispatchEvent(new Event("netlify-identity-ready"));
