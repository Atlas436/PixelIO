// Volume dos sons/arquivos locais do Pixel.OI. Players externos têm controles próprios.
let volume = 0.7;
const listeners = new Set();
export const getVolume = () => volume;
export function setVolume(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return;
  volume = Math.max(0, Math.min(1, parsed));
  for (const listener of listeners) listener(volume);
}
export function subscribeVolume(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
