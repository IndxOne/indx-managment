/* global self */
// Importé dans le service worker généré par Workbox (vite.config.ts,
// workbox.importScripts) : réception des push de relance et clic.
self.addEventListener("push", (event) => {
  // Chrome exige un showNotification() par push reçu (sinon il compte une
  // violation "silencieuse" et finit par rejeter les futurs subscribe()
  // avec "Registration failed - push service error") : on l'appelle donc
  // même si le payload n'est pas du JSON exploitable.
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "INDXONE Projets", {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients[0];
      return open ? open.focus() : self.clients.openWindow("/");
    })
  );
});
