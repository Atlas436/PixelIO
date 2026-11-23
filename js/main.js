import { decorateButton } from "./assets.js";
import { setupDesktop } from "./desktop.js";
import { setupTaskbar } from "./taskbar.js";
import { WindowManager } from "./windows.js";

const welcome = document.querySelector("#welcome");
const boot = document.querySelector("#boot");
const system = document.querySelector("#system");
const start = document.querySelector("#start");
let taskbar;
let clearSelection;
let bootTimer;
const manager = new WindowManager(
  document.querySelector("#workspace"),
  document.querySelector("#windows"),
  () => taskbar?.renderTasks(),
);

decorateButton(start, "iniciar");
clearSelection = setupDesktop((app) => manager.open(app));
taskbar = setupTaskbar(manager, shutdown);

document
  .querySelector("#system")
  .addEventListener("pixel:restore-music", () => manager.restore("music"));

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
