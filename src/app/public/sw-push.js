/* global self */
// Importé dans le service worker généré par Workbox (vite.config.ts,
// workbox.importScripts) : réception des push de relance et clic.
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
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
