// Shows a reminder. The server sends the Declarative Web Push shape, which iOS can show by
// itself; other browsers hand the same JSON to this worker. No fetch handler: nothing is cached.
self.addEventListener("push", (event) => {
  const { title, body, tag, navigate } = event.data.json().notification;
  event.waitUntil(self.registration.showNotification(title, { body, tag, data: navigate }));
});

// The path only, so a tap opens the origin this worker runs on.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(new URL(event.notification.data).pathname));
});
