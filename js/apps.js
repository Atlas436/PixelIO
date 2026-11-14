// Catálogo: os aplicativos completos e seus ícones definitivos virão depois.
export const apps = [
  { id: "files", name: "Arquivos", initials: "AR" },
  { id: "music", name: "Música", initials: "MU" },
  { id: "terminal", name: "Terminal", initials: "TE" },
  { id: "notes", name: "Notas", initials: "NO" },
  { id: "assistant", name: "Assistente IA", initials: "IA" },
  { id: "solitaire", name: "Paciência", initials: "PA" },
  { id: "studio", name: "Pixel Studio", initials: "PS" },
  { id: "settings", name: "Configurações", initials: "CO" },
  { id: "gallery", name: "Galeria", initials: "GA" },
  { id: "about", name: "Sobre", initials: "SO" },
];

export function placeholder(app) {
  const icon = document.createElement("span");
  icon.className = "app-placeholder";
  icon.textContent = app.initials;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

export function appContent(app) {
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
