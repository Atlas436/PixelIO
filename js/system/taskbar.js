import { setVolume } from "../shared/audio-settings.js";
import { apps, placeholder } from "./apps.js";
import { decorateButton, pixelArt } from "../shared/assets.js";
import { setupTaskbarVisibility } from "./taskbar-visibility.js";
import {
  getNotifications,
  subscribeNotifications,
  markNotificationsRead,
} from "../shared/notifications.js";

export function setupTaskbar(manager, shutdown) {
  const tasks = document.querySelector("#tasks");
  const visibility = setupTaskbarVisibility(() => manager.fitAll());
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
    visibility.changedPanels();
  }
  for (const [buttonId, panelId] of pairs) {
    const button = document.getElementById(buttonId);
    const panel = document.getElementById(panelId);
    button.addEventListener("click", () => {
      const show = panel.hidden;
      closePanels();
      panel.hidden = !show;
      button.setAttribute("aria-expanded", String(show));
      if (show && panelId === "notifications-panel") markNotificationsRead();
      visibility.changedPanels();
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
  const volumeButton = document.querySelector("#volume-toggle");
  function updateVolume() {
    const value = Number(volume.value);
    setVolume(value / 100);
    const level =
      value === 0
        ? "mudo"
        : value <= 33
          ? "baixo"
          : value <= 66
            ? "medio"
            : "alto";
    if (volumeButton.dataset.level !== level) {
      volumeButton.querySelector(".pixel-art")?.remove();
      volumeButton.prepend(pixelArt(`volume_${level}`));
      volumeButton.dataset.level = level;
    }
    const label = value === 0 ? "Volume: mudo" : `Volume: ${value}%`;
    volumeButton.setAttribute("aria-label", label);
    volumeButton.title = label;
    document.querySelector("#volume-value").textContent = `${volume.value}%`;
  }
  volume.addEventListener("input", updateVolume);
  updateVolume();
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
      button.classList.toggle(
        "has-notification",
        getNotifications().some((entry) => !entry.read && entry.appId === id),
      );
      button.setAttribute("aria-pressed", String(manager.activeId === id));
      button.addEventListener("click", () => manager.toggleTask(id));
      tasks.append(button);
      if (focused === id) button.focus();
    }
  }
  function renderNotifications() {
    const list = document.querySelector("#notification-list");
    list.replaceChildren();
    const entries = getNotifications().filter((entry) =>
      apps.some((app) => app.id === entry.appId),
    );
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhuma notificação por aqui.";
      list.append(empty);
    }
    for (const entry of entries) {
      const app = apps.find((app) => app.id === entry.appId);
      const button = document.createElement("button");
      button.className = "notification-entry";
      const title = document.createElement("strong");
      title.textContent = app.name;
      const message = document.createElement("span");
      message.textContent = entry.message;
      button.append(title, message);
      button.addEventListener("click", () => {
        closePanels();
        manager.open(app);
      });
      list.append(button);
    }
    const unread = entries.filter((entry) => !entry.read).length;
    const bell = document.querySelector("#notifications-toggle");
    bell.classList.toggle("has-notification", unread > 0);
    bell.setAttribute(
      "aria-label",
      unread ? `Notificações: ${unread} não lidas` : "Notificações",
    );
    renderTasks();
  }
  subscribeNotifications((type, entry) => {
    renderNotifications();
    if (type !== "new") return;
    const app = apps.find((app) => app.id === entry.appId);
    if (!app) return;
    visibility.announce();
    document.querySelector("#notification-announcement").textContent =
      `${app.name}: ${entry.message}`;
    if (!document.querySelector("#notifications-panel").hidden)
      markNotificationsRead();
  });
  renderNotifications();
  return { renderTasks, closePanels, reset: visibility.reset };
}
