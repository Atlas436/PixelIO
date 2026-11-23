// Apenas formatos de imagem passivos; SVG/HTML nunca são inseridos na página.
export const imageTypes = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
];
export const imageAccept = imageTypes.join(",");
export const isImage = (file) =>
  file.kind !== "folder" && imageTypes.includes(file.type);
export async function validateImage(blob) {
  if (!imageTypes.includes(blob.type))
    throw new Error("Escolha uma imagem PNG, JPEG, GIF, WebP, BMP ou AVIF.");
  if (blob.size > 20 * 1024 * 1024)
    throw new Error("Cada imagem pode ter até 20 MB.");
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
  } catch {
    throw new Error("Não foi possível abrir esta imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function imageUrls() {
  let urls = [];
  return {
    create(blob) {
      const url = URL.createObjectURL(blob);
      urls.push(url);
      return url;
    },
    clear() {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls = [];
    },
  };
}
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function noteHtml(note) {
  const images = await Promise.all(
    (note.images || []).map(async (image) => {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () =>
          reject(new Error("Não foi possível exportar a imagem."));
        reader.readAsDataURL(image.blob);
      });
      return `<figure><img src="${data}" alt="${escapeHtml(image.name)}"><figcaption>${escapeHtml(image.name)}</figcaption></figure>`;
    }),
  );
  return new Blob(
    [
      `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(note.title || "Sem título")}</title><style>body{max-width:800px;margin:40px auto;padding:20px;font-family:system-ui;line-height:1.6}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}img{max-width:100%;height:auto}figure{margin:24px 0}</style><h1>${escapeHtml(note.title || "Sem título")}</h1><pre>${escapeHtml(note.body)}</pre>${images.join("")}</html>`,
    ],
    { type: "text/html;charset=utf-8" },
  );
}
