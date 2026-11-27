import { pixelArt } from "../shared/assets.js";

const key = "pixel-oi:taskbar-autohide";
const listeners = new Set();
let autoHide = false;
try {
  autoHide = localStorage.getItem(key) === "true";
} catch {
  /* Funciona também sem armazenamento. */
}

export function getAutoHide() {
  return autoHide;
}
export function subscribeSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setAutoHide(value) {
  autoHide = Boolean(value);
  let saved = true;
  try {
    localStorage.setItem(key, String(autoHide));
  } catch {
    saved = false;
  }
  for (const listener of listeners) listener(autoHide);
  return saved;
}
window.addEventListener("storage", (event) => {
  if (event.key !== key && event.key !== null) return;
  try {
    autoHide = localStorage.getItem(key) === "true";
  } catch {
    return;
  }
  for (const listener of listeners) listener(autoHide);
});

export function createSettings() {
  const content = document.createElement("div");
  content.className = "settings-app";
  content.innerHTML = `
    <header class="settings-heading"><div><p class="eyebrow">PIXEL.OI / PERSONALIZAÇÃO</p><h3>Configurações</h3></div></header>
    <h4>Barra de tarefas</h4>
    <label class="settings-option"><span><strong>Ocultar automaticamente</strong><small>A barra libera espaço e aparece quando você precisa dela.</small></span><input id="taskbar-autohide" type="checkbox" aria-describedby="taskbar-help"></label>
    <p id="taskbar-help">Leve o mouse até a borda inferior para mostrar a barra. No toque, use a pequena alça na borda. Pelo teclado, pressione Alt + T. A barra permanece aberta enquanto você usa seus botões ou menus.</p>
    <p>Notificações de aplicativos mostram a barra por alguns segundos, sem interromper o que você está fazendo.</p>
    <p class="settings-save-status" role="status"></p>`;
  content.querySelector(".settings-heading").prepend(pixelArt("configuracoes"));
  const input = content.querySelector("input");
  input.checked = getAutoHide();
  input.addEventListener("change", () => {
    const saved = setAutoHide(input.checked);
    content.querySelector(".settings-save-status").textContent = saved
      ? "Preferência salva neste navegador."
      : "Preferência aplicada nesta sessão. O navegador não permitiu salvá-la.";
  });
  content.addEventListener("focusin", () => {
    input.checked = getAutoHide();
  });
  return content;
}
