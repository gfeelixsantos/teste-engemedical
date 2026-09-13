/*
 * Service worker base para evitar requisições 404 em ambientes locais e de
 * produção. O cache da aplicação permanece sob responsabilidade do Next.js.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
