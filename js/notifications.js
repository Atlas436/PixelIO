// Avisos internos do Pixel.OI: não usam permissões de notificações do computador.
const entries = [];
const listeners = new Set();
let nextId = 0;

export function getNotifications() {
  return entries.map((entry) => ({ ...entry }));
}
export function subscribeNotifications(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emit(type, entry) {
  for (const listener of listeners) listener(type, entry);
}
export function notifyApp(appId, message) {
  const entry = { id: ++nextId, appId, message: String(message), read: false };
  entries.unshift(entry);
  entries.splice(20);
  emit("new", { ...entry });
}
export function markNotificationsRead() {
  for (const entry of entries) entry.read = true;
  emit("read");
}
