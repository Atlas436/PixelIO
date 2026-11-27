import {
  isImage,
  imageAccept,
  validateImage,
  imageUrls,
  noteHtml,
} from "./images.js";
import { iconButton } from "./assets.js";
import {
  listNotes,
  listFiles,
  addFile,
  downloadDocument,
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
    <div class="notes-workspace"><div class="notes-empty">Crie uma nota ou selecione uma da lista.</div><div class="notes-editor" hidden><label for="note-title">Título</label><input id="note-title" placeholder="Sem título" maxlength="120" autocomplete="off"><label class="sr-only" for="note-body">Conteúdo da nota</label><textarea id="note-body" placeholder="Escreva aqui…" spellcheck="true"></textarea><span class="notes-count"></span><section class="note-images" aria-label="Imagens da nota"></section></div></div></div>
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
  const attachmentUrls = imageUrls(),
    pickerUrls = imageUrls();
  let pickerVersion = 0;
  const imageInput = document.createElement("input");
  imageInput.type = "file";
  imageInput.multiple = true;
  imageInput.accept = imageAccept;
  imageInput.hidden = true;
  root.append(imageInput);
  const picker = document.createElement("section");
  picker.className = "note-image-picker";
  picker.hidden = true;
  root.querySelector(".notes-workspace").prepend(picker);
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
      `${file.name} salvo em Arquivos (somente texto). Para incluir imagens, use Exportar com imagens.`,
    );
  });
  const imageButton = action("upload", "Imagem do PC", () =>
    imageInput.click(),
  );
  const galleryButton = action("arquivo", "Imagem da Galeria", async () => {
    const noteId = activeId,
      token = ++pickerVersion;
    pickerUrls.clear();
    picker.replaceChildren();
    picker.hidden = false;
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Cancelar seleção";
    close.onclick = closePicker;
    picker.append(close);
    const heading = document.createElement("p");
    heading.textContent =
      "Selecione uma imagem da Galeria. Uma cópia será inserida ao fim da nota.";
    picker.append(heading);
    const files = await listFiles();
    if (disposed || noteId !== activeId || token !== pickerVersion) return;
    const grid = document.createElement("div");
    grid.className = "gallery-grid";
    for (const file of files.filter(isImage)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gallery-thumb";
      b.dataset.pickImage = file.id;
      const img = document.createElement("img");
      img.src = pickerUrls.create(file.blob);
      img.alt = "";
      const name = document.createElement("span");
      name.textContent = file.name;
      b.append(img, name);
      b.onclick = async () => {
        b.disabled = true;
        try {
          await validateImage(file.blob);
          if (disposed || token !== pickerVersion || activeId !== noteId)
            return;
          attachImages(noteId, [
            { id: newDocumentId(), name: file.name, blob: file.blob },
          ]);
          closePicker();
        } catch (e) {
          report(e);
          b.disabled = false;
        }
      };
      grid.append(b);
    }
    if (!grid.children.length)
      grid.textContent =
        "A Galeria está vazia. Importe uma imagem do PC ou adicione imagens em Arquivos.";
    picker.append(grid);
  });
  const htmlButton = action("download", "Exportar com imagens", async () => {
    const id = activeId;
    await flush();
    const note = records.get(id);
    if (!note || disposed) return;
    const blob = await noteHtml(note);
    const name = `${(note.title.trim() || "Sem título").replace(/[\\/:*?"<>|]/g, "-")}.html`;
    const file = await addFile(blob, name, { sourceNoteId: id });
    message(`${file.name} salvo em Arquivos. O HTML inclui texto e imagens.`);
  });
  function closePicker() {
    pickerVersion++;
    picker.hidden = true;
    picker.replaceChildren();
    pickerUrls.clear();
  }
  function attachImages(id, images) {
    updateImages(id, (previous) => [...previous, ...images]);
  }
  function updateImages(id, transform, redraw = true) {
    const previous = records.get(id);
    if (!previous || disposed) return;
    const note = {
      ...previous,
      images: transform(previous.images || []),
      updatedAt: Date.now(),
    };
    records.set(id, note);
    drafts.set(id, { note, revision: ++revision });
    if (activeId === id && redraw) renderImages();
    renderList();
    if (redraw) flush(id).catch(() => {});
    else {
      clearTimeout(timer);
      timer = setTimeout(() => flush(id).catch(() => {}), 250);
    }
  }
  function renderImages() {
    attachmentUrls.clear();
    const host = root.querySelector(".note-images");
    host.replaceChildren();
    const note = records.get(activeId);
    if (!note) return;
    for (const image of note.images || []) {
      const figure = document.createElement("figure");
      figure.dataset.attachmentId = image.id;
      const img = document.createElement("img");
      img.src = attachmentUrls.create(image.blob);
      img.alt = image.caption || image.name;
      const caption = document.createElement("figcaption");
      caption.textContent = image.name;
      const label = document.createElement("label");
      label.textContent = "Legenda";
      const captionInput = document.createElement("input");
      captionInput.className = "note-image-caption";
      captionInput.maxLength = 300;
      captionInput.value = image.caption || "";
      captionInput.placeholder = "Adicione uma legenda…";
      label.append(captionInput);
      captionInput.addEventListener("input", () => {
        img.alt = captionInput.value || image.name;
        updateImages(
          note.id,
          (images) =>
            images.map((item) =>
              item.id === image.id
                ? { ...item, caption: captionInput.value }
                : item,
            ),
          false,
        );
      });
      const order = document.createElement("div");
      for (const [step, text] of [
        [-1, "Subir imagem"],
        [1, "Descer imagem"],
      ]) {
        const button = iconButton("seta", text, () => {
          updateImages(note.id, (images) => {
            const result = [...images],
              from = result.findIndex((item) => item.id === image.id),
              to = from + step;
            if (from < 0 || to < 0 || to >= result.length) return result;
            [result[from], result[to]] = [result[to], result[from]];
            return result;
          });
          const moved = host.querySelector(
            `[data-attachment-id="${image.id}"]`,
          );
          const next = moved?.querySelector(`[aria-label="${text}"]`);
          (next && !next.disabled
            ? next
            : moved?.querySelector("input")
          )?.focus();
        });
        button.append(document.createTextNode(text));
        const index = note.images.findIndex((item) => item.id === image.id);
        button.disabled =
          index + step < 0 || index + step >= note.images.length;
        order.append(button);
      }
      const download = iconButton("download", "Baixar imagem", () =>
        downloadDocument(image),
      );
      download.append(document.createTextNode("Baixar imagem"));
      const remove = iconButton(
        "excluir",
        "Remover imagem da nota",
        async () => {
          const id = note.id;
          if (
            !(await dialog.confirm(
              "Remover imagem?",
              `Remover “${image.name}” desta nota? O original na Galeria será mantido.`,
            )) ||
            disposed
          )
            return;
          updateImages(id, (images) =>
            images.filter((item) => item.id !== image.id),
          );
        },
      );
      remove.append(document.createTextNode("Remover imagem"));
      figure.append(img, caption, label, order, download, remove);
      host.append(figure);
    }
  }
  imageInput.onchange = async () => {
    const id = activeId,
      files = [...imageInput.files];
    imageInput.value = "";
    if (!id) return;
    // Valida o lote antes de anexar, preservando a nota escolhida no início.
    try {
      const images = [];
      for (const file of files) {
        await validateImage(file);
        images.push({ id: newDocumentId(), name: file.name, blob: file });
      }
      attachImages(id, images);
    } catch (e) {
      report(e);
    }
  };
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
    saveButton.disabled =
      exportButton.disabled =
      deleteButton.disabled =
      imageButton.disabled =
      galleryButton.disabled =
      htmlButton.disabled =
        !note;
    closePicker();
    renderImages();
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
  function flush(id = activeId) {
    if (id === activeId) clearTimeout(timer);
    const draft = drafts.get(id);
    if (!draft) return queue;
    if (queuedRevisions.get(id) === draft.revision) return queue;
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
    closePicker();
    attachmentUrls.clear();
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
