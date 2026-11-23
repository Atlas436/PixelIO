// Dados locais compartilhados pelos apps Notas e Arquivos. Nenhum arquivo é enviado.
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
      transaction.onerror = () => {}; // O resultado da transação é tratado em onabort.
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
export async function addFile(blob, name, { sourceNoteId = null } = {}) {
  const file = {
    id: newDocumentId(),
    name: validateFilename(name),
    type: blob.type || "application/octet-stream",
    size: blob.size,
    blob,
    sourceNoteId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await operation("files", "readwrite", (store) => store.add(file));
  emit("files", file.id);
  return file;
}
export async function renameFile(id, name) {
  name = validateFilename(name);
  // Leitura e alteração na mesma transação para não recriar um arquivo já excluído.
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("files", "readwrite");
    const store = transaction.objectStore("files");
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result)
        store.put({ ...request.result, name, updatedAt: Date.now() });
      else transaction.abort();
    };
    transaction.oncomplete = resolve;
    transaction.onabort = () =>
      reject(
        new Error(
          "Não foi possível renomear. O arquivo pode ter sido removido.",
        ),
      );
    transaction.onerror = () => {};
  });
  emit("files", id);
}
export async function removeFile(id) {
  await operation("files", "readwrite", (store) => store.delete(id));
  emit("files", id);
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
