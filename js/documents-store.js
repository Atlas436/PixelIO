import {
  parentOf,
  isFolder,
  validateDestination,
  folderTrail,
} from "./file-tree.js";
const listeners = new Set();
let database;
export const newDocumentId = () => crypto.randomUUID();
export const foldText = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function subscribeDocuments(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function emit(store, id) {
  for (const listener of listeners) listener({ store, id });
}
function openDatabase() {
  return (database ||= new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open("pixel-oi-documents", 1);
    } catch {
      reject(
        new Error("O navegador não permitiu abrir o armazenamento local."),
      );
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["notes", "files"])
        if (!db.objectStoreNames.contains(store))
          db.createObjectStore(store, { keyPath: "id" });
    };
    request.onerror = () =>
      reject(new Error("Não foi possível abrir o armazenamento local."));
    request.onblocked = () =>
      reject(new Error("Feche outras abas do Pixel.OI e tente novamente."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = null;
      };
      resolve(db);
    };
  }).catch((error) => {
    database = null;
    throw error;
  }));
}
async function operation(store, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let result, transaction;
    try {
      transaction = db.transaction(store, mode);
      const request = action(transaction.objectStore(store));
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () =>
        reject(
          new Error(
            transaction.error?.name === "QuotaExceededError"
              ? "O espaço deste navegador está cheio. Baixe uma cópia e libere espaço."
              : "Não foi possível salvar a alteração neste navegador.",
          ),
        );
    } catch {
      reject(
        new Error("O armazenamento local está indisponível. Tente novamente."),
      );
    }
  });
}
export const listNotes = () =>
  operation("notes", "readonly", (store) => store.getAll());
export const listFiles = () =>
  operation("files", "readonly", (store) => store.getAll());
export const getNote = (id) =>
  operation("notes", "readonly", (store) => store.get(id));
export async function saveNote(note) {
  await operation("notes", "readwrite", (store) => store.put({ ...note }));
  emit("notes", note.id);
  return note;
}
export async function removeNote(id) {
  await operation("notes", "readwrite", (store) => store.delete(id));
  emit("notes", id);
}
export function validateFilename(value) {
  const name = String(value).trim();
  if (
    !name ||
    name === "." ||
    name === ".." ||
    name.length > 160 ||
    /[\\/:*?"<>|\u0000-\u001f]/.test(name)
  )
    throw new Error(
      "Use um nome de até 160 caracteres, sem barras ou símbolos de caminho.",
    );
  return name;
}
export const noteFilename = (note) =>
  `${(note.title.trim() || "Sem título").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").slice(0, 150)}.txt`;
// Validação e gravação ocorrem na mesma transação para evitar pastas órfãs.
async function changeFiles(action) {
  const db = await openDatabase();
  const result = await new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite"),
      store = transaction.objectStore("files");
    let result, failure;
    store.getAll().onsuccess = (event) => {
      try {
        result = action(event.target.result, store);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () =>
      reject(
        failure ||
          new Error(
            transaction.error?.name === "QuotaExceededError"
              ? "O espaço deste navegador está cheio."
              : "Não foi possível alterar os arquivos neste navegador.",
          ),
      );
  });
  emit("files", result?.id);
  return result;
}
function validateFolderName(entries, name, parentId, exceptId = null) {
  if (
    entries.some(
      (entry) =>
        isFolder(entry) &&
        entry.id !== exceptId &&
        parentOf(entry) === parentId &&
        foldText(entry.name) === foldText(name),
    )
  )
    throw new Error("Já existe uma pasta com esse nome neste local.");
}
export async function addFile(
  blob,
  name,
  { sourceNoteId = null, parentId = null } = {},
) {
  const file = {
    id: newDocumentId(),
    name: validateFilename(name),
    type: blob.type || "application/octet-stream",
    size: blob.size,
    blob,
    sourceNoteId,
    kind: "file",
    parentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return changeFiles((entries, store) => {
    validateDestination(entries, parentId);
    store.add(file);
    return file;
  });
}
export function createFolder(name, parentId = null) {
  name = validateFilename(name);
  return changeFiles((entries, store) => {
    validateDestination(entries, parentId);
    validateFolderName(entries, name, parentId);
    const folder = {
      id: newDocumentId(),
      kind: "folder",
      parentId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.add(folder);
    return folder;
  });
}
export async function renameFile(id, name) {
  name = validateFilename(name);
  return changeFiles((entries, store) => {
    const entry = entries.find((entry) => entry.id === id);
    if (!entry) throw new Error("O item não está mais disponível.");
    if (isFolder(entry)) validateFolderName(entries, name, parentOf(entry), id);
    const updated = { ...entry, name, updatedAt: Date.now() };
    store.put(updated);
    return updated;
  });
}
export async function removeFile(id) {
  return changeFiles((entries, store) => {
    const entry = entries.find((entry) => entry.id === id);
    if (!entry) throw new Error("O item não está mais disponível.");
    if (isFolder(entry) && entries.some((child) => parentOf(child) === id))
      throw new Error(
        "A pasta contém itens. Mova ou exclua o conteúdo antes de apagar a pasta.",
      );
    store.delete(id);
    return entry;
  });
}
export function moveFile(id, parentId = null) {
  return changeFiles((entries, store) => {
    const entry = entries.find((entry) => entry.id === id);
    if (!entry) throw new Error("O item não está mais disponível.");
    validateDestination(entries, parentId, isFolder(entry) ? id : null);
    if (isFolder(entry)) validateFolderName(entries, entry.name, parentId, id);
    const updated = { ...entry, parentId, updatedAt: Date.now() };
    store.put(updated);
    return updated;
  });
}
// Um único commit: qualquer destino inválido cancela todo o lote.
export function moveFiles(ids, parentId = null) {
  return changeFiles((entries, store) => {
    const selected = [...new Set(ids)].map((id) => {
      const entry = entries.find((item) => item.id === id);
      if (!entry)
        throw new Error(
          "Um dos itens não está mais disponível. Atualize a seleção.",
        );
      return entry;
    });
    if (!selected.length) throw new Error("Selecione pelo menos um item.");
    for (const entry of selected)
      validateDestination(entries, parentId, isFolder(entry) ? entry.id : null);
    const roots = selected.filter((entry) => {
      const trail = folderTrail(entries, parentOf(entry)) || [];
      return !trail.some((folder) =>
        selected.some((item) => item.id === folder.id),
      );
    });
    const moved = roots.map((entry) => ({
      ...entry,
      parentId,
      updatedAt: Date.now(),
    }));
    const projected = entries.map(
      (entry) => moved.find((item) => item.id === entry.id) || entry,
    );
    for (const entry of moved)
      if (isFolder(entry))
        validateFolderName(projected, entry.name, parentId, entry.id);
    for (const entry of moved) store.put(entry);
    return moved;
  });
}
export async function exportNote(note) {
  return addFile(
    new Blob([note.body], { type: "text/plain;charset=utf-8" }),
    noteFilename(note),
    { sourceNoteId: note.id },
  );
}
export function downloadDocument(file) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const isTextFile = (file) =>
  file.type.startsWith("text/") ||
  /\.(txt|md|csv|json|log|css|js|html?)$/i.test(file.name);
export const formatBytes = (size) =>
  size < 1024
    ? `${size} B`
    : size < 1048576
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1048576).toFixed(1)} MB`;
