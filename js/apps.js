import { createTerminal } from "./terminal.js";
import { createAbout } from "./about.js";
import { createGallery } from "./gallery.js";
import { createNotes } from "./notes.js";
import { createFiles } from "./files.js";
import { createMusic } from "./music.js";
import { createSpider } from "./spider.js";
import { createSettings } from "./settings.js";
import { pixelArt } from "./assets.js";

import { apps } from "./app-catalog.js";
export { apps };

const iconFiles = {
  files: "arquivo.png",
  music: "música.png",
  terminal: "terminal.png",
  notes: "notas.png",
  assistant: "ia.png",
  gallery: "galeria.png",
  about: "sobre.png",
  studio: "pixel-studio.png",
};
const iconRects = {
  "sobre.png": [28, 21, 54, 46, 100, 100],
  "arquivo.png": [22, 39, 49, 31, 100, 100],
  "música.png": [16, 33, 45, 50, 100, 100],
  "galeria.png": [13, 32, 68, 51, 100, 100],
  "notas.png": [21, 22, 47, 47, 100, 100],
  "pixel-studio.png": [290, 276, 699, 719, 1254, 1254],
  "terminal.png": [21, 38, 49, 34, 100, 100],
  "ia.png": [10, 12, 76, 62, 100, 100],
};

export function placeholder(app) {
  const filename = iconFiles[app.id];
  if (filename) {
    const [x, y, w, h, sourceW, sourceH] = iconRects[filename];
    const icon = document.createElement("span");
    icon.className = "app-icon";
    icon.setAttribute("aria-hidden", "true");
    const crop = document.createElement("span");
    crop.className = "app-icon-crop";
    crop.style.width = `${(w / Math.max(w, h)) * 100}%`;
    crop.style.height = `${(h / Math.max(w, h)) * 100}%`;
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.src = new URL(`../assets/icones/${filename}`, import.meta.url).href;
    Object.assign(image.style, {
      width: `${(sourceW / w) * 100}%`,
      height: `${(sourceH / h) * 100}%`,
      left: `${(-x / w) * 100}%`,
      top: `${(-y / h) * 100}%`,
    });
    crop.append(image);
    icon.append(crop);
    return icon;
  }
  if (app.id === "settings") {
    const icon = pixelArt("configuracoes");
    icon.classList.add("settings-icon");
    return icon;
  }
  if (app.id === "solitaire") {
    const icon = document.createElement("img");
    icon.className = "app-icon";
    icon.src = new URL(
      "../assets/baralho/verso-pixel-oi.png",
      import.meta.url,
    ).href;
    icon.alt = "";
    icon.draggable = false;
    return icon;
  }
  const icon = document.createElement("span");
  icon.className = "app-placeholder";
  icon.textContent = app.initials;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

export function appContent(app) {
  if (app.id === "terminal") return createTerminal();
  if (app.id === "about") return createAbout();
  if (app.id === "gallery") return createGallery();
  if (app.id === "notes") return createNotes();
  if (app.id === "files") return createFiles();
  if (app.id === "music") return createMusic();
  if (app.id === "solitaire") return createSpider();
  if (app.id === "settings") return createSettings();
  const content = document.createElement("div");
  content.className = "window-body";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "PIXEL.OI / APLICATIVOS";
  const title = document.createElement("h3");
  title.textContent = app.name;
  const message = document.createElement("p");
  message.textContent =
    "Este aplicativo será desenvolvido posteriormente. Seu espaço já está reservado por aqui.";
  const status = document.createElement("span");
  status.className = "status-tag";
  status.textContent = "EM DESENVOLVIMENTO";
  content.append(eyebrow, title, message, status);
  return content;
}
