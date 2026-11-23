import { iconButton } from "./assets.js";
import {
  listFiles,
  addFile,
  removeFile,
  downloadDocument,
  subscribeDocuments,
  formatBytes,
} from "./documents-store.js";
import { isImage, imageAccept, validateImage, imageUrls } from "./images.js";
import { createDocumentDialog } from "./document-dialog.js";

export function createGallery() {
  const root = document.createElement("div");
  root.className = "document-app gallery-app";
  root.innerHTML = `<div class="document-shell"><header class="document-heading"><p class="eyebrow">PIXEL.OI / GALERIA</p><h3>Suas imagens por aqui.</h3><p>Importe do PC, veja e baixe os originais. Tudo fica neste navegador.</p></header><div class="document-toolbar"><label class="document-search">Buscar imagens<input type="search" placeholder="Nome da imagem"></label></div><input class="gallery-input" type="file" multiple hidden><div class="gallery-layout"><div class="gallery-grid" aria-label="Imagens"></div><section class="gallery-preview" aria-label="Imagem selecionada"></section></div><p class="document-status" role="status">Abrindo imagens…</p></div>`;
  const shell = root.querySelector(".document-shell"),
    dialog = createDocumentDialog(root, shell),
    urls = imageUrls(),
    previewUrls = imageUrls();
  const input = root.querySelector(".gallery-input"),
    search = root.querySelector("input[type=search]"),
    grid = root.querySelector(".gallery-grid"),
    preview = root.querySelector(".gallery-preview"),
    status = root.querySelector(".document-status");
  input.accept = imageAccept;
  let records = [],
    selected = null,
    disposed = false,
    version = 0;
  const message = (text) => {
    if (!disposed) status.textContent = text;
  };
  function button(
    icon,
    label,
    fn,
    host = root.querySelector(".document-toolbar"),
  ) {
    const b = iconButton(icon, label, () =>
      Promise.resolve()
        .then(fn)
        .catch((e) => message(e.message)),
    );
    b.append(document.createTextNode(label));
    host.append(b);
    return b;
  }
  button("upload", "Importar imagens do PC", () => input.click());
  button("arquivo", "Abrir Arquivos", () =>
    root.dispatchEvent(new CustomEvent("pixel:open-files", { bubbles: true })),
  );
  function show(file) {
    previewUrls.clear();
    preview.replaceChildren();
    if (!file) {
      preview.textContent =
        "Selecione uma imagem para ampliar, baixar ou excluir.";
      return;
    }
    const heading = document.createElement("h4");
    heading.textContent = file.name;
    const image = document.createElement("img");
    image.src = previewUrls.create(file.blob);
    image.alt = file.name;
    const meta = document.createElement("p");
    meta.textContent = `${formatBytes(file.size)} · Original preservado`;
    const actions = document.createElement("div");
    actions.className = "document-toolbar gallery-actions";
    button(
      "download",
      "Baixar imagem no PC",
      () => downloadDocument(file),
      actions,
    );
    button(
      "excluir",
      "Excluir imagem",
      async () => {
        if (
          !(await dialog.confirm(
            "Excluir imagem?",
            `Excluir “${file.name}” da Galeria e de Arquivos? Cópias inseridas em notas serão mantidas.`,
          )) ||
          disposed
        )
          return;
        await removeFile(file.id);
        message("Imagem excluída.");
      },
      actions,
    );
    const content = document.createElement("div");
    content.className = "gallery-preview-content";
    content.append(heading, image, meta);
    preview.append(content, actions);
  }
  function render() {
    urls.clear();
    grid.replaceChildren();
    const query = search.value.toLocaleLowerCase("pt-BR");
    for (const file of records.filter((f) =>
      f.name.toLocaleLowerCase("pt-BR").includes(query),
    )) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gallery-thumb";
      b.dataset.imageId = file.id;
      b.setAttribute("aria-pressed", String(selected === file.id));
      const img = document.createElement("img");
      img.src = urls.create(file.blob);
      img.alt = "";
      img.loading = "lazy";
      const name = document.createElement("span");
      name.textContent = file.name;
      b.append(img, name);
      b.onclick = () => {
        selected = file.id;
        render();
        show(file);
      };
      grid.append(b);
    }
    if (!grid.children.length)
      grid.textContent = query
        ? "Nenhuma imagem encontrada."
        : "Importe imagens do PC para começar. Imagens de Arquivos também aparecem aqui.";
  }
  async function refresh() {
    const token = ++version;
    try {
      const files = await listFiles();
      if (disposed || token !== version) return;
      records = files.filter(isImage).sort((a, b) => b.createdAt - a.createdAt);
      if (!records.some((f) => f.id === selected)) selected = null;
      show(records.find((f) => f.id === selected));
      render();
    } catch (e) {
      message(e.message);
    }
  }
  input.onchange = async () => {
    const files = [...input.files];
    input.value = "";
    let count = 0;
    for (const file of files) {
      if (disposed) break;
      try {
        await validateImage(file);
        if (disposed) break;
        await addFile(file, file.name);
        count++;
      } catch (e) {
        message(`${count} importada(s). ${file.name}: ${e.message}`);
        return;
      }
    }
    message(
      `${count} imagem(ns) importada(s). Disponíveis também em Arquivos.`,
    );
  };
  search.oninput = render;
  const unsubscribe = subscribeDocuments((change) => {
    if (change.store === "files") refresh();
  });
  refresh().then(() =>
    message("Imagens locais. Baixe cópias para guardar fora do navegador."),
  );
  root.dispose = () => {
    disposed = true;
    version++;
    unsubscribe();
    dialog.cancel();
    urls.clear();
    previewUrls.clear();
  };
  return root;
}
