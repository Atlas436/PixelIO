import { iconButton, pixelArt } from "./assets.js";
import {
  listFiles,
  addFile,
  renameFile,
  removeFile,
  saveNote,
  newDocumentId,
  foldText,
  subscribeDocuments,
  isTextFile,
  formatBytes,
  downloadDocument,
} from "./documents-store.js";
import { createDocumentDialog } from "./document-dialog.js";

export function createFiles() {
  const root = document.createElement("div");
  root.className = "document-app files-app";
  root.innerHTML = `<div class="document-shell">
    <header class="document-heading"><p class="eyebrow">PIXEL.OI / ARQUIVOS</p><h3>Seu espaço de arquivos.</h3><p>Notas exportadas e arquivos importados, salvos neste navegador.</p></header>
    <div class="document-toolbar"><label class="document-import"><span>Importar arquivos</span><input type="file" id="files-import" multiple></label><label class="document-search">Buscar arquivos<input type="search" id="files-search" placeholder="Nome do arquivo"></label></div>
    <div class="files-layout"><div class="files-list" aria-label="Arquivos salvos"></div><section class="file-details" aria-label="Detalhes do arquivo"><p class="document-empty">Selecione um arquivo para abrir.</p></section></div>
    <p class="document-status" role="status" aria-live="polite">Abrindo seus arquivos…</p></div>`;
  const shell = root.querySelector(".document-shell"),
    dialog = createDocumentDialog(root, shell);
  const list = root.querySelector(".files-list"),
    details = root.querySelector(".file-details"),
    status = root.querySelector(".document-status"),
    search = root.querySelector("#files-search");
  root.querySelector(".document-import").prepend(pixelArt("upload"));
  let records = [],
    selectedId = null,
    disposed = false,
    refreshVersion = 0,
    previewVersion = 0,
    imageURL = null;
  const message = (text) => {
    if (!disposed) status.textContent = text;
  };
  const report = (error) => message(error.message);
  function clearPreview() {
    previewVersion++;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = null;
  }
  function renderList() {
    if (disposed) return;
    list.replaceChildren();
    const query = foldText(search.value);
    const files = records
      .filter((file) => foldText(file.name).includes(query))
      .sort((a, b) => b.createdAt - a.createdAt);
    for (const file of files) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "document-list-button";
      button.dataset.fileId = file.id;
      button.classList.toggle("selected", selectedId === file.id);
      button.setAttribute("aria-pressed", String(selectedId === file.id));
      const name = document.createElement("strong");
      name.textContent = file.name;
      const size = document.createElement("span");
      size.textContent = `${formatBytes(file.size)}${file.sourceNoteId ? " · Exportado do Notas" : ""}`;
      button.append(name, size);
      button.addEventListener("click", () => {
        selectedId = file.id;
        renderList();
        showDetails(file);
      });
      list.append(button);
    }
    if (!files.length) {
      const empty = document.createElement("p");
      empty.className = "document-empty";
      empty.textContent = query
        ? "Nenhum arquivo encontrado."
        : "Exporte uma nota em .txt ou importe arquivos do seu computador.";
      list.append(empty);
    }
  }
  async function refresh() {
    const version = ++refreshVersion;
    try {
      const files = await listFiles();
      if (disposed || version !== refreshVersion) return;
      records = files;
      renderList();
      if (selectedId && !records.some((file) => file.id === selectedId)) {
        selectedId = null;
        clearPreview();
        details.replaceChildren();
        const text = document.createElement("p");
        text.className = "document-empty";
        text.textContent = "Selecione um arquivo para abrir.";
        details.append(text);
      }
    } catch (error) {
      report(error);
    }
  }
  function showDetails(file) {
    if (disposed) return;
    clearPreview();
    const version = previewVersion;
    details.replaceChildren();
    const heading = document.createElement("h4");
    heading.textContent = file.name;
    const meta = document.createElement("p");
    meta.className = "file-meta";
    meta.textContent = `${formatBytes(file.size)} · ${new Date(file.updatedAt).toLocaleString("pt-BR")}`;
    const preview = document.createElement("div");
    preview.className = "file-preview";
    const actions = document.createElement("div");
    actions.className = "file-actions";
    const download = iconButton("download", "Baixar no computador", () =>
      downloadDocument(file),
    );
    download.append(document.createTextNode("Baixar no computador"));
    const remove = iconButton("excluir", "Excluir arquivo", async () => {
      if (
        !(await dialog.confirm(
          "Excluir arquivo?",
          `Excluir “${file.name}” do Pixel.OI? A nota original e cópias no computador não serão apagadas.`,
        )) ||
        disposed
      )
        return;
      try {
        await removeFile(file.id);
        await refresh();
        message("Arquivo excluído.");
      } catch (error) {
        report(error);
      }
    });
    remove.append(document.createTextNode("Excluir"));
    actions.append(download, remove);
    const rename = document.createElement("form");
    rename.className = "file-rename";
    const label = document.createElement("label");
    label.textContent = "Nome do arquivo";
    label.htmlFor = "file-rename-name";
    const input = document.createElement("input");
    input.id = "file-rename-name";
    input.value = file.name;
    input.maxLength = 160;
    input.required = true;
    const commit = iconButton("editar", "Salvar nome");
    commit.type = "submit";
    commit.append(document.createTextNode("Salvar nome"));
    rename.append(label, input, commit);
    rename.addEventListener("submit", async (event) => {
      event.preventDefault();
      commit.disabled = true;
      try {
        await renameFile(file.id, input.value);
        await refresh();
        const updated = records.find((item) => item.id === file.id);
        if (updated) showDetails(updated);
        message("Nome atualizado.");
      } catch (error) {
        report(error);
        input.setAttribute("aria-invalid", "true");
      } finally {
        commit.disabled = false;
      }
    });
    details.append(heading, meta, actions, preview, rename);
    if (isTextFile(file) && file.size <= 1048576) {
      preview.textContent = "Abrindo texto…";
      file.blob
        .text()
        .then((text) => {
          if (disposed || version !== previewVersion) return;
          const pre = document.createElement("pre");
          pre.textContent = text;
          preview.replaceChildren(pre);
        })
        .catch(() => {
          if (!disposed && version === previewVersion)
            preview.textContent = "Não foi possível abrir este texto.";
        });
      const edit = iconButton("editar", "Abrir cópia no Notas", async () => {
        edit.disabled = true;
        try {
          const note = {
            id: newDocumentId(),
            title: file.name.replace(/\.txt$/i, ""),
            body: await file.blob.text(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await saveNote(note);
          if (!disposed)
            root.dispatchEvent(
              new CustomEvent("pixel:open-note", {
                bubbles: true,
                detail: { id: note.id },
              }),
            );
        } catch (error) {
          report(error);
        } finally {
          edit.disabled = false;
        }
      });
      edit.append(document.createTextNode("Abrir cópia no Notas"));
      actions.prepend(edit);
    } else if (/^image\/(png|jpeg|gif|webp|bmp|avif)$/.test(file.type)) {
      imageURL = URL.createObjectURL(file.blob);
      const image = document.createElement("img");
      image.className = "file-preview-image";
      image.alt = file.name;
      image.src = imageURL;
      image.onerror = () => {
        if (!disposed && version === previewVersion)
          preview.textContent = "Não foi possível visualizar esta imagem.";
      };
      preview.append(image);
    } else {
      preview.textContent = isTextFile(file)
        ? "Texto grande demais para visualizar aqui. Baixe uma cópia para abrir."
        : "Este formato pode ser baixado para abrir no seu computador.";
    }
  }
  root
    .querySelector("#files-import")
    .addEventListener("change", async (event) => {
      const files = [...event.target.files];
      event.target.value = "";
      let count = 0;
      for (const file of files) {
        try {
          await addFile(file, file.name);
          count++;
        } catch (error) {
          message(`${count} arquivo(s) importado(s). ${error.message}`);
          return;
        }
      }
      message(`${count} arquivo(s) importado(s).`);
    });
  search.addEventListener("input", renderList);
  const unsubscribe = subscribeDocuments((change) => {
    if (change.store === "files") refresh();
  });
  refresh().then(() => {
    if (status.textContent === "Abrindo seus arquivos…")
      message(
        "Arquivos ficam neste navegador. Baixe cópias do que quiser guardar fora do Pixel.OI.",
      );
  });
  root.dispose = () => {
    disposed = true;
    refreshVersion++;
    unsubscribe();
    dialog.cancel();
    clearPreview();
  };
  return root;
}
