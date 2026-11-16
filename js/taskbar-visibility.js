import { getAutoHide, subscribeSettings } from "./settings.js";

export function setupTaskbarVisibility(onLayout) {
  const system = document.querySelector("#system");
  const bar = document.querySelector("#taskbar");
  const edge = document.querySelector("#taskbar-reveal");
  let hovering = false;
  let hideTimer;
  let announcementTimer;
  let announcing = false;
  let holdFocus = false;
  const hasPanel = () => !!system.querySelector(".panel:not([hidden])");
  const hasFocus = () => holdFocus && bar.contains(document.activeElement);
  function show() {
    clearTimeout(hideTimer);
    system.classList.remove("taskbar-hidden");
    edge.setAttribute("aria-expanded", "true");
  }
  function scheduleHide() {
    clearTimeout(hideTimer);
    if (!getAutoHide() || hovering || hasFocus() || hasPanel() || announcing)
      return;
    hideTimer = setTimeout(() => {
      if (!getAutoHide() || hovering || hasFocus() || hasPanel() || announcing)
        return;
      system.classList.add("taskbar-hidden");
      edge.setAttribute("aria-expanded", "false");
    }, 700);
  }
  function apply() {
    system.classList.toggle("taskbar-autohide", getAutoHide());
    show();
    scheduleHide();
    onLayout();
  }
  edge.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") {
      show();
      scheduleHide();
    }
  });
  edge.addEventListener("click", () => {
    holdFocus = true;
    show();
    document.querySelector("#menu-toggle").focus();
  });
  bar.addEventListener("pointerenter", () => {
    hovering = true;
    show();
  });
  bar.addEventListener("pointerleave", () => {
    hovering = false;
    scheduleHide();
  });
  bar.addEventListener("focusin", () => {
    show();
    scheduleHide();
  });
  bar.addEventListener("focusout", scheduleHide);
  // focusout acontece antes de activeElement trocar: reavalie após o evento.
  system.addEventListener("focusout", () => queueMicrotask(scheduleHide));
  document.addEventListener("pointerdown", () => {
    holdFocus = false;
  });
  document.addEventListener("keydown", (event) => {
    holdFocus = true;
    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.code === "KeyT" &&
      !system.hidden
    ) {
      event.preventDefault();
      show();
      document.querySelector("#menu-toggle").focus();
    }
  });
  subscribeSettings(apply);
  apply();
  return {
    show,
    changedPanels() {
      if (hasPanel()) show();
      else scheduleHide();
    },
    announce() {
      clearTimeout(announcementTimer);
      announcing = true;
      show();
      announcementTimer = setTimeout(() => {
        announcing = false;
        scheduleHide();
      }, 5000);
    },
    reset() {
      hovering = announcing = holdFocus = false;
      clearTimeout(announcementTimer);
      show();
      scheduleHide();
    },
  };
}
