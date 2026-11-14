import { apps, placeholder } from "./apps.js";
import { decorateButton } from "./assets.js";

export function setupTaskbar(manager, shutdown) {
  const tasks = document.querySelector("#tasks");
  const pairs = [
    ["menu-toggle", "app-menu"],
    ["volume-toggle", "volume-panel"],
    ["notifications-toggle", "notifications-panel"],
    ["power-toggle", "power-panel"],
  ];
  function closePanels() {
    for (const [buttonId, panelId] of pairs) {
      document.getElementById(panelId).hidden = true;
      document.getElementById(buttonId).setAttribute("aria-expanded", "false");
    }
  }
  for (const [buttonId, panelId] of pairs) {
    const button = document.getElementById(buttonId);
    const panel = document.getElementById(panelId);
    button.addEventListener("click", () => {
      const show = panel.hidden;
      closePanels();
      panel.hidden = !show;
      button.setAttribute("aria-expanded", String(show));
      if (show) panel.querySelector("button, input")?.focus();
    });
  }
  decorateButton(document.querySelector("#menu-toggle"), "menu");
  decorateButton(document.querySelector("#volume-toggle"), "volume_alto");
  decorateButton(
    document.querySelector("#notifications-toggle"),
    "Notificação.png",
    true,
  );
  decorateButton(document.querySelector("#power-toggle"), "power.png", true);
  for (const app of apps) {
    const button = document.createElement("button");
    button.className = "menu-app";
    button.append(placeholder(app), document.createTextNode(app.name));
    button.addEventListener("click", () => {
      closePanels();
      manager.open(app);
    });
    document.querySelector("#app-list").append(button);
  }
  document.addEventListener("pointerdown", (event) => {
    if (
      !event.target.closest(".panel") &&
      !pairs.some(([id]) => event.target.closest(`#${id}`))
    )
      closePanels();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const opened = pairs.find(([, id]) => !document.getElementById(id).hidden);
    closePanels();
    if (opened) document.getElementById(opened[0]).focus();
  });
  document.querySelector("#shutdown").addEventListener("click", () => {
    closePanels();
    shutdown();
  });
  const volume = document.querySelector("#volume-level");
  volume.addEventListener("input", () => {
    document.querySelector("#volume-value").textContent = `${volume.value}%`;
  });
  function updateClock() {
    const now = new Date();
    const clock = document.querySelector("#clock");
    clock.dateTime = now.toISOString();
    clock.textContent = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    clock.title = now.toLocaleDateString("pt-BR", { dateStyle: "full" });
  }
  updateClock();
  setInterval(updateClock, 1000);
  function renderTasks() {
    const focused = document.activeElement?.dataset.task;
    tasks.replaceChildren();
    for (const [id, state] of manager.windows) {
      const button = document.createElement("button");
      button.className = "task";
      button.dataset.task = id;
      button.textContent = state.app.name;
      button.title = `${state.app.name} — ${state.minimized ? "restaurar" : "alternar janela"}`;
      button.classList.toggle("active", manager.activeId === id);
      button.classList.toggle("minimized", state.minimized);
      button.setAttribute("aria-pressed", String(manager.activeId === id));
      button.addEventListener("click", () => manager.toggleTask(id));
      tasks.append(button);
      if (focused === id) button.focus();
    }
  }
  return { renderTasks, closePanels };
}
