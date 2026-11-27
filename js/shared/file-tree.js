// Arquivos antigos sem parentId continuam na raiz; nenhuma migração apaga dados.
export const parentOf = (entry) => entry.parentId ?? null;
export const isFolder = (entry) => entry.kind === "folder";
export function folderTrail(entries, id) {
  const trail = [],
    seen = new Set();
  while (id !== null && id !== undefined) {
    if (seen.has(id)) return null;
    seen.add(id);
    const folder = entries.find((entry) => entry.id === id);
    if (!folder || !isFolder(folder)) return null;
    trail.unshift(folder);
    id = parentOf(folder);
  }
  return trail;
}
export function validateDestination(entries, parentId, movingId = null) {
  const trail = folderTrail(entries, parentId);
  if (!trail) throw new Error("A pasta de destino não está mais disponível.");
  if (trail.some((folder) => folder.id === movingId))
    throw new Error(
      "Uma pasta não pode ficar dentro de si mesma ou de uma subpasta dela.",
    );
}
