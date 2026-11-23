import { iconButton } from "./assets.js";
import {
  listNotes,
  getNote,
  saveNote,
  removeNote,
  exportNote,
  newDocumentId,
  foldText,
  subscribeDocuments,
} from "./documents-store.js";
import { createDocumentDialog } from "./document-dialog.js";
import { notifyApp } from "./notifications.js";

// Rascunhos ainda não gravados sobrevivem ao fechamento da janela nesta sessão.
const drafts = new Map();
let revision = 0;
window.addEventListener("beforeunload", (event) => {
  if (drafts.size) {
    event.preventDefault();
    event.returnValue = "";
  }
});

export function createNotes() {
  const root = document.createElement("div");
  root.className = "document-app notes-app";
  root.innerHTML = `<div class="document-shell">
    <header class="document-heading"><p class="eyebrow">PIXEL.OI / NOTAS</p><h3>Ideias que ficam.</h3><p>Salvamento automático neste navegador.</p></header>
    <div class="document-toolbar"></div>
    <div class="notes-layout"><aside class="document-sidebar"><label class="document-search">Buscar notas<input type="search" id="notes-search" placeholder="Título ou conteúdo"></label><div class="notes-list" aria-label="Suas notas"></div></aside>
    <div class="notes-workspace"><div class="notes-empty">Crie uma nota ou selecione uma da lista.</div><div class="notes-editor" hidden><label for="note-title">Título</label><input id="note-title" placeholder="Sem título" maxlength="120" autocomplete="off"><label class="sr-only" for="note-body">Conteúdo da nota</label><textarea id="note-body" placeholder="Escreva aqui…" spellcheck="true"></textarea><span class="notes-count"></span></div></div></div>
    <p class="document-status" role="status" aria-live="polite">Abrindo suas notas…</p></div>`;
  const shell = root.querySelector(".document-shell"),
    dialog = createDocumentDialog(root, shell);
  const list = root.querySelector(".notes-list"),
    search = root.querySelector("#notes-search");
  const title = root.querySelector("#note-title"),
    body = root.querySelector("#note-body"),
    status = root.querySelector(".document-status");
  let records = new Map(),
    activeId = null,
    disposed = false,
    timer,
    queue = Promise.resolve(),
    loading = 0;
  const queuedRevisions = new Map();
  const message = (text) => {
    if (!disposed) status.textContent = text;
  };
  const report = (error) =>
    message(
      `${error.message}${drafts.size ? " O rascunho ainda está na sessão; não recarregue antes de salvar." : ""}`,
    );
  function action(icon, label, handler) {
    const button = iconButton(icon, label, () =>
      Promise.resolve().then(handler).catch(report),
    );
    button.append(document.createTextNode(label));
    root.querySelector(".document-toolbar").append(button);
    return button;
  }
  const newButton = action("adicionar", "Nova nota", async () => {
    await ready;
    await flush();
    if (disposed) return;
    const note = {
      id: newDocumentId(),
      title: "",
      body: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    records.set(note.id, note);
    drafts.set(note.id, { note, revision: ++revision });
    activeId = note.id;
    search.value = "";
    renderList();
    renderEditor();
    title.focus();
    await flush();
  });
  const saveButton = action("salvar", "Salvar agora", async () => {
    await flush();
    message("Nota salva neste navegador.");
  });
  const exportButton = action("download", "Exportar .txt", async () => {
    const exportedId = activeId;
    await flush();
    const note = records.get(exportedId);
    if (!note || disposed) return;
    const file = await exportNote(note);
    message(
      `${file.name} salvo em Arquivos. Você pode baixar para o computador por lá.`,
    );
  });
  const deleteButton = action("excluir", "Excluir nota", async () => {
    const note = records.get(activeId);
    if (!note) return;
    if (
      !(await dialog.confirm(
        "Excluir nota?",
        `Excluir “${note.title.trim() || "Sem título"}”? As cópias já exportadas em Arquivos serão mantidas.`,
      )) ||
      disposed
    )
      return;
    await flush();
    await removeNote(note.id);
    drafts.delete(note.id);
    records.delete(note.id);
    if (activeId === note.id) activeId = null;
    renderList();
    renderEditor();
    message("Nota excluída.");
  });
  action("arquivo", "Abrir Arquivos", () =>
    root.dispatchEvent(new CustomEvent("pixel:open-files", { bubbles: true })),
  );
  function renderList() {
    if (disposed) return;
    list.replaceChildren();
    const query = foldText(search.value);
    const notes = [...records.values()]
      .filter((note) => foldText(`${note.title} ${note.body}`).includes(query))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    for (const note of notes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "document-list-button";
      button.dataset.noteId = note.id;
      button.classList.toggle("selected", note.id === activeId);
      button.setAttribute("aria-pressed", String(note.id === activeId));
      const heading = document.createElement("strong");
      heading.textContent = note.title.trim() || "Sem título";
      const snippet = document.createElement("span");
      snippet.textContent =
        note.body.replace(/\s+/g, " ").slice(0, 80) || "Nota vazia";
      button.append(heading, snippet);
      button.addEventListener("click", () => openNote(note.id).catch(report));
      list.append(button);
    }
    if (!notes.length) {
      const empty = document.createElement("p");
      empty.className = "document-empty";
      empty.textContent = query
        ? "Nenhuma nota encontrada."
        : "Suas notas vão aparecer aqui.";
      list.append(empty);
    }
  }
  function renderEditor() {
    if (disposed) return;
    const note = records.get(activeId);
    root.querySelector(".notes-editor").hidden = !note;
    root.querySelector(".notes-empty").hidden = !!note;
    saveButton.disabled = exportButton.disabled = deleteButton.disabled = !note;
    if (note) {
      title.value = note.title;
      body.value = note.body;
      root.querySelector(".notes-count").textContent =
        `${note.body.length} caracteres`;
    }
  }
  async function refresh() {
    const token = ++loading;
    try {
      const saved = await listNotes();
      if (disposed || token !== loading) return;
      records = new Map(saved.map((note) => [note.id, note]));
      for (const [id, draft] of drafts) records.set(id, draft.note);
      renderList();
    } catch (error) {
      if (!disposed) {
        for (const [id, draft] of drafts) records.set(id, draft.note);
        renderList();
        report(error);
      }
    }
  }
  function flush() {
    clearTimeout(timer);
    const draft = drafts.get(activeId);
    if (!draft) return queue;
    if (queuedRevisions.get(activeId) === draft.revision) return queue;
    const { note, revision: version } = draft;
    queuedRevisions.set(note.id, version);
    message("Salvando…");
    queue = queue
      .catch(() => {})
      .then(() => saveNote({ ...note }))
      .then(() => {
        if (drafts.get(note.id)?.revision === version) drafts.delete(note.id);
        if (activeId === note.id && !drafts.has(note.id))
          message("Nota salva neste navegador.");
      })
      .catch((error) => {
        report(error);
        throw error;
      })
      .finally(() => {
        if (queuedRevisions.get(note.id) === version)
          queuedRevisions.delete(note.id);
      });
    return queue;
  }
  async function openNote(id) {
    await ready;
    await flush();
    if (disposed) return;
    if (!records.has(id)) {
      const note = await getNote(id);
      if (note) records.set(id, note);
    }
    if (!records.has(id)) {
      message("Essa nota não está mais disponível.");
      return;
    }
    activeId = id;
    renderList();
    renderEditor();
    body.focus();
    message(drafts.has(id) ? "Alterações ainda não salvas." : "Nota aberta.");
  }
  function edited() {
    const previous = records.get(activeId);
    if (!previous) return;
    const note = {
      ...previous,
      title: title.value,
      body: body.value,
      updatedAt: Date.now(),
    };
    records.set(note.id, note);
    drafts.set(note.id, { note, revision: ++revision });
    root.querySelector(".notes-count").textContent =
      `${note.body.length} caracteres`;
    renderList();
    message("Salvando…");
    clearTimeout(timer);
    timer = setTimeout(() => flush().catch(() => {}), 250);
  }
  title.addEventListener("input", edited);
  body.addEventListener("input", edited);
  search.addEventListener("input", renderList);
  const unsubscribe = subscribeDocuments((change) => {
    if (change.store === "notes") refresh();
  });
  const ready = refresh().then(() => {
    renderEditor();
    if (status.textContent === "Abrindo suas notas…")
      message(
        records.size
          ? "Selecione uma nota ou crie outra."
          : "Crie sua primeira nota.",
      );
  });
  root.openNote = (id) => openNote(id).catch(report);
  root.dispose = () => {
    disposed = true;
    clearTimeout(timer);
    unsubscribe();
    dialog.cancel();
    flush().catch(() =>
      notifyApp(
        "notes",
        "Uma nota não pôde ser salva. Reabra Notas para recuperar o rascunho desta sessão.",
      ),
    );
  };
  renderEditor();
  return root;
}
