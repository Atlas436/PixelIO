import { isImage } from "./images.js";
import { iconButton, pixelArt } from "./assets.js";
import {
  listFiles,
  createFolder,
  moveFile,
  moveFiles,
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
import { parentOf, isFolder, folderTrail } from "./file-tree.js";
import { createDocumentDialog } from "./document-dialog.js";

export function createFiles() {
  const root = document.createElement("div");
  root.className = "document-app files-app";
  root.innerHTML = `<div class="document-shell">
    <header class="document-heading"><p class="eyebrow">PIXEL.OI / ARQUIVOS</p><h3>Seu espaço de arquivos.</h3><p>Notas exportadas e arquivos importados, salvos neste navegador.</p></header>
    <div class="document-toolbar"><label class="document-import"><span>Importar arquivos</span><input type="file" id="files-import" multiple></label><label class="document-search">Buscar arquivos<input type="search" id="files-search" placeholder="Nesta pasta"></label></div>
    <form id="new-folder-form" class="new-folder-form" hidden><label for="new-folder-name">Nome da nova pasta</label><input id="new-folder-name" maxlength="160" required autocomplete="off"><button type="submit">Criar pasta</button><button type="button" data-folder-cancel>Cancelar</button></form>
    <nav class="files-path" aria-label="Caminho da pasta"></nav>
    <div class="files-bulk" aria-label="Seleção de arquivos"></div>
    <div class="files-layout"><div class="files-list" aria-label="Arquivos salvos"></div><section class="file-details" aria-label="Detalhes do arquivo"><p class="document-empty">Selecione um arquivo ou pasta para abrir.</p></section></div>
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
    currentFolderId = null,
    disposed = false,
    refreshVersion = 0,
    previewVersion = 0,
    imageURL = null;
  const checked = new Set();
  let moving = false;
  const message = (text) => {
    if (!disposed) status.textContent = text;
  };
  const report = (error) => message(error.message);
  function clearPreview() {
    previewVersion++;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = null;
  }
  const newFolderForm = root.querySelector("#new-folder-form");
  const back = iconButton("seta", "Voltar pasta", () => {
    const folder = records.find((entry) => entry.id === currentFolderId);
    openFolder(folder ? parentOf(folder) : null);
  });
  back.append(document.createTextNode("Voltar"));
  const newFolder = iconButton("pasta", "Nova pasta", () => {
    newFolderForm.hidden = false;
    root.querySelector("#new-folder-name").focus();
  });
  newFolder.append(document.createTextNode("Nova pasta"));
  root.querySelector(".document-toolbar").prepend(back, newFolder);
  root.querySelector("[data-folder-cancel]").addEventListener("click", () => {
    newFolderForm.hidden = true;
    newFolder.focus();
  });
  newFolderForm.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      newFolderForm.hidden = true;
      newFolder.focus();
    }
  });
  newFolderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const commit = newFolderForm.querySelector('[type="submit"]');
    commit.disabled = true;
    const parent = currentFolderId;
    try {
      const folder = await createFolder(
        root.querySelector("#new-folder-name").value,
        parent,
      );
      if (disposed) return;
      newFolderForm.reset();
      newFolderForm.hidden = true;
      if (currentFolderId === parent) {
        selectedId = folder.id;
        await refresh();
        showDetails(folder);
      }
      message(`Pasta “${folder.name}” criada.`);
    } catch (error) {
      report(error);
    } finally {
      commit.disabled = false;
    }
  });
  function clearDetails() {
    clearPreview();
    details.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "document-empty";
    empty.textContent = "Selecione um arquivo ou pasta para abrir.";
    details.append(empty);
  }
  function renderPath() {
    const nav = root.querySelector(".files-path");
    nav.replaceChildren();
    const trail = folderTrail(records, currentFolderId) || [];
    for (const entry of [{ id: null, name: "Arquivos" }, ...trail]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = entry.name;
      button.disabled = entry.id === currentFolderId;
      if (button.disabled) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => openFolder(entry.id));
      nav.append(button);
    }
    back.disabled = currentFolderId === null;
  }
  function openFolder(id) {
    if (disposed) return;
    if (!folderTrail(records, id)) {
      message("A pasta não está mais disponível.");
      return;
    }
    checked.clear();
    currentFolderId = id;
    selectedId = null;
    search.value = "";
    newFolderForm.hidden = true;
    clearDetails();
    renderPath();
    renderList();
    message(
      id === null
        ? "Pasta inicial."
        : "Duplo clique para abrir uma subpasta, ou selecione e use Abrir pasta.",
    );
  }
  function renderBulk() {
    root.classList.toggle("has-bulk-selection", checked.size > 0);
    const bar = root.querySelector(".files-bulk");
    bar.replaceChildren();
    const count = document.createElement("span");
    count.textContent = `${checked.size} selecionado(s)`;
    const all = document.createElement("button");
    all.type = "button";
    all.textContent = "Selecionar visíveis";
    all.disabled = moving;
    all.onclick = () => {
      for (const file of records.filter(
        (file) =>
          parentOf(file) === currentFolderId &&
          foldText(file.name).includes(foldText(search.value)),
      ))
        checked.add(file.id);
      renderList();
    };
    const clear = document.createElement("button");
    clear.type = "button";
    clear.textContent = "Limpar seleção";
    clear.disabled = !checked.size || moving;
    clear.onclick = () => {
      checked.clear();
      renderList();
    };
    bar.append(count, all, clear);
    if (!checked.size) return;
    const label = document.createElement("label");
    label.textContent = "Mover selecionados para ";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Destino dos selecionados");
    select.disabled = moving;
    const targets = [
      { id: null, trail: [] },
      ...records.filter(isFolder).map((folder) => ({
        id: folder.id,
        trail: folderTrail(records, folder.id),
      })),
    ];
    for (const target of targets) {
      if (
        !target.trail ||
        target.id === currentFolderId ||
        target.trail.some((folder) => checked.has(folder.id))
      )
        continue;
      const option = document.createElement("option");
      option.value = target.id || "";
      option.textContent = [
        "Arquivos",
        ...target.trail.map((folder) => folder.name),
      ].join(" / ");
      select.append(option);
    }
    label.append(select);
    const move = iconButton("seta", "Mover selecionados", async () => {
      const ids = [...checked],
        destination = select.value || null;
      moving = true;
      renderList();
      try {
        await moveFiles(ids, destination);
        checked.clear();
        selectedId = null;
        clearDetails();
        await refresh();
        message(`${ids.length} item(ns) movido(s).`);
      } catch (error) {
        report(error);
      } finally {
        moving = false;
        if (!disposed) renderList();
      }
    });
    move.append(document.createTextNode("Mover selecionados"));
    move.disabled = moving || !select.options.length;
    bar.append(label, move);
  }
  function renderList() {
    if (disposed) return;
    for (const id of checked)
      if (
        !records.some(
          (file) => file.id === id && parentOf(file) === currentFolderId,
        )
      )
        checked.delete(id);
    renderBulk();
    list.replaceChildren();
    const query = foldText(search.value);
    const files = records
      .filter(
        (file) =>
          parentOf(file) === currentFolderId &&
          foldText(file.name).includes(query),
      )
      .sort(
        (a, b) =>
          Number(isFolder(b)) - Number(isFolder(a)) ||
          (isFolder(a) && isFolder(b)
            ? a.name.localeCompare(b.name, "pt-BR")
            : b.createdAt - a.createdAt),
      );
    for (const file of files) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "document-list-button";
      button.dataset.fileId = file.id;
      if (isFolder(file)) {
        button.dataset.folderId = file.id;
        button.classList.add("folder-entry");
      }
      button.classList.toggle("selected", selectedId === file.id);
      button.setAttribute("aria-pressed", String(selectedId === file.id));
      const name = document.createElement("strong");
      name.textContent = file.name;
      const size = document.createElement("span");
      size.textContent = isFolder(file)
        ? `Pasta · ${records.filter((entry) => parentOf(entry) === file.id).length} item(ns)`
        : `${formatBytes(file.size)}${file.sourceNoteId ? " · Exportado do Notas" : ""}`;
      if (isFolder(file)) button.prepend(pixelArt("pasta"));
      button.append(name, size);
      button.addEventListener("click", () => {
        selectedId = file.id;
        // Preserve o botão sob o ponteiro para o segundo clique abrir a pasta.
        for (const item of list.querySelectorAll("[data-file-id]")) {
          item.classList.toggle("selected", item.dataset.fileId === selectedId);
          item.setAttribute(
            "aria-pressed",
            String(item.dataset.fileId === selectedId),
          );
        }
        showDetails(file);
      });
      if (isFolder(file))
        button.addEventListener("dblclick", () => openFolder(file.id));
      const row = document.createElement("div");
      row.className = "files-entry";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = checked.has(file.id);
      checkbox.disabled = moving;
      checkbox.setAttribute("aria-label", `Selecionar ${file.name}`);
      checkbox.onchange = () => {
        if (checkbox.checked) checked.add(file.id);
        else checked.delete(file.id);
        renderBulk();
      };
      row.append(checkbox, button);
      list.append(row);
    }
    if (!files.length) {
      const empty = document.createElement("p");
      empty.className = "document-empty";
      empty.textContent = query
        ? "Nenhum arquivo encontrado."
        : currentFolderId === null
          ? "Exporte uma nota em .txt, crie pastas ou importe arquivos do computador."
          : "Esta pasta está vazia. Importe arquivos ou crie uma subpasta.";
      list.append(empty);
    }
  }
  async function refresh() {
    const version = ++refreshVersion;
    try {
      const files = await listFiles();
      if (disposed || version !== refreshVersion) return;
      records = files;
      if (!folderTrail(records, currentFolderId)) {
        currentFolderId = null;
        selectedId = null;
        clearDetails();
        message("A pasta não está mais disponível. Voltando ao início.");
      }
      renderPath();
      renderList();
      if (
        selectedId &&
        !records.some(
          (file) =>
            file.id === selectedId && parentOf(file) === currentFolderId,
        )
      ) {
        selectedId = null;
        clearDetails();
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
    meta.textContent = `${isFolder(file) ? "Pasta" : formatBytes(file.size)} · ${new Date(file.updatedAt).toLocaleString("pt-BR")}`;
    const preview = document.createElement("div");
    preview.className = "file-preview";
    const actions = document.createElement("div");
    actions.className = "file-actions";
    if (isFolder(file)) {
      const open = iconButton("pasta", "Abrir pasta", () =>
        openFolder(file.id),
      );
      open.append(document.createTextNode("Abrir pasta"));
      actions.append(open);
    } else {
      const download = iconButton("download", "Baixar no computador", () =>
        downloadDocument(file),
      );
      download.append(document.createTextNode("Baixar no computador"));
      actions.append(download);
    }
    const remove = iconButton(
      "excluir",
      isFolder(file) ? "Excluir pasta" : "Excluir arquivo",
      async () => {
        if (
          isFolder(file) &&
          records.some((entry) => parentOf(entry) === file.id)
        ) {
          message(
            "A pasta contém itens. Mova ou exclua o conteúdo antes de apagar a pasta.",
          );
          return;
        }
        if (
          !(await dialog.confirm(
            isFolder(file) ? "Excluir pasta vazia?" : "Excluir arquivo?",
            `Excluir “${file.name}” do Pixel.OI? A nota original e cópias no computador não serão apagadas.`,
          )) ||
          disposed
        )
          return;
        try {
          await removeFile(file.id);
          await refresh();
          message(isFolder(file) ? "Pasta excluída." : "Arquivo excluído.");
        } catch (error) {
          report(error);
        }
      },
    );
    remove.append(document.createTextNode("Excluir"));
    actions.append(remove);
    const rename = document.createElement("form");
    rename.className = "file-rename";
    const label = document.createElement("label");
    label.textContent = isFolder(file) ? "Nome da pasta" : "Nome do arquivo";
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
    const move = document.createElement("form");
    move.className = "file-move";
    const destinationLabel = document.createElement("label");
    destinationLabel.textContent = "Mover para";
    destinationLabel.htmlFor = "file-move-destination";
    const destination = document.createElement("select");
    destination.id = "file-move-destination";
    const targets = records
      .filter(isFolder)
      .map((folder) => ({ folder, trail: folderTrail(records, folder.id) }))
      .filter(
        (target) =>
          target.trail &&
          (!isFolder(file) ||
            !target.trail.some((folder) => folder.id === file.id)),
      )
      .sort((a, b) =>
        a.trail
          .map((folder) => folder.name)
          .join("/")
          .localeCompare(
            b.trail.map((folder) => folder.name).join("/"),
            "pt-BR",
          ),
      );
    for (const target of [{ folder: { id: null }, trail: [] }, ...targets]) {
      const option = document.createElement("option");
      option.value = target.folder.id || "";
      option.textContent = [
        "Arquivos",
        ...target.trail.map((folder) => folder.name),
      ].join(" / ");
      destination.append(option);
    }
    destination.value = parentOf(file) || "";
    const moveButton = iconButton("seta", "Mover item");
    moveButton.type = "submit";
    moveButton.append(document.createTextNode("Mover"));
    moveButton.disabled = true;
    destination.addEventListener("change", () => {
      moveButton.disabled = destination.value === (parentOf(file) || "");
    });
    move.addEventListener("submit", async (event) => {
      event.preventDefault();
      moveButton.disabled = true;
      try {
        await moveFile(file.id, destination.value || null);
        await refresh();
        selectedId = null;
        clearDetails();
        renderList();
        message(
          "Item movido. Use o caminho acima para abrir a pasta de destino.",
        );
      } catch (error) {
        report(error);
        moveButton.disabled = false;
      }
    });
    move.append(destinationLabel, destination, moveButton);
    details.append(heading, meta, actions, preview, rename, move);
    if (isFolder(file)) {
      preview.textContent =
        "Abra a pasta para ver os itens. Pastas precisam estar vazias para serem excluídas.";
      return;
    }

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
    } else if (isImage(file)) {
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
      const parentId = currentFolderId;
      for (const file of files) {
        try {
          await addFile(file, file.name, { parentId });
          count++;
        } catch (error) {
          message(`${count} arquivo(s) importado(s). ${error.message}`);
          return;
        }
      }
      message(`${count} arquivo(s) importado(s).`);
    });
  search.addEventListener("input", renderList);
  renderPath();
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
