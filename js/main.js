import { apps } from "./system/apps.js";
import { decorateButton } from "./shared/assets.js";
import { setupDesktop } from "./system/desktop.js";
import { setupTaskbar } from "./system/taskbar.js";
import { WindowManager } from "./system/windows.js";

const welcome = document.querySelector("#welcome");
const boot = document.querySelector("#boot");
const system = document.querySelector("#system");
const start = document.querySelector("#start");
let taskbar;
let bootTimer;
const manager = new WindowManager(
  document.querySelector("#workspace"),
  document.querySelector("#windows"),
  () => taskbar?.renderTasks(),
);

decorateButton(start, "iniciar");
const clearSelection = setupDesktop((app) => manager.open(app));
taskbar = setupTaskbar(manager, shutdown);

system.addEventListener("pixel:restore-music", () => manager.restore("music"));

system.addEventListener("pixel:open-files", () =>
  manager.open(apps.find((app) => app.id === "files")),
);
system.addEventListener("pixel:open-note", (event) => {
  manager.open(apps.find((app) => app.id === "notes"));
  document.querySelector(".notes-app")?.openNote(event.detail.id);
});

system.addEventListener("pixel:open-app", (event) => {
  const app = apps.find((app) => app.id === event.detail?.id);
  if (app) manager.open(app);
});

function shutdown() {
  clearInterval(bootTimer);
  manager.closeAll();
  taskbar.closePanels();
  taskbar.reset();
  clearSelection();
  system.hidden = true;
  boot.hidden = true;
  welcome.hidden = false;
  start.disabled = false;
  start.focus();
}

start.addEventListener("click", () => {
  start.disabled = true;
  welcome.hidden = true;
  boot.hidden = false;
  const progress = document.querySelector("#boot-progress");
  const status = document.querySelector("#boot-status");
  progress.value = 0;
  status.textContent = "Preparando a interface…";
  let step = 0;
  const messages = [
    "Preparando a interface…",
    "Organizando as janelas…",
    "Abrindo sua área de trabalho…",
  ];
  bootTimer = setInterval(() => {
    progress.value = Math.min(100, ++step * 10);
    status.textContent = messages[Math.min(2, Math.floor(step / 4))];
    if (step < 10) return;
    clearInterval(bootTimer);
    boot.hidden = true;
    system.hidden = false;
    taskbar.reset();
    manager.fitAll();
    document.querySelector("#menu-toggle").focus();
  }, 180);
});
