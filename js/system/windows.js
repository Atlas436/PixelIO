import { resizeRect, snapRect, minWindowWidth } from "./window-geometry.js";
import { iconButton } from "../shared/assets.js";
import { appContent } from "./apps.js";

export class WindowManager {
  constructor(workspace, layer, onChange) {
    this.workspace = workspace;
    this.layer = layer;
    this.onChange = onChange;
    this.windows = new Map();
    this.activeId = null;
    this.order = 0;
    window.addEventListener("resize", () => this.fitAll());
    document.addEventListener("keydown", (event) => this.handleKey(event));
    document.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".window-layout-menu, .window-layout-toggle"))
        this.closeMenus();
    });
    this.announcement = document.createElement("p");
    this.announcement.className = "sr-only";
    this.announcement.setAttribute("role", "status");
    this.workspace.append(this.announcement);
  }

  open(app) {
    if (this.windows.has(app.id)) return this.restore(app.id);
    const element = document.createElement("section");
    element.className = "window";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-labelledby", `title-${app.id}`);
    element.tabIndex = -1;
    element.dataset.app = app.id;
    const titlebar = document.createElement("header");
    titlebar.className = "window-titlebar";
    const title = document.createElement("h2");
    title.className = "window-title";
    title.id = `title-${app.id}`;
    title.textContent = app.name;
    const controls = document.createElement("div");
    controls.className = "window-controls";
    const maximize = iconButton("maximizar", `Maximizar ${app.name}`, () =>
      this.maximize(app.id),
    );
    const layoutButton = iconButton("menu", `Organizar ${app.name}`, () => {
      const show = menu.hidden;
      this.closeMenus();
      menu.hidden = !show;
      layoutButton.setAttribute("aria-expanded", String(show));
      if (show) menu.querySelector("button:not(:disabled)")?.focus();
    });
    layoutButton.classList.add("window-layout-toggle");
    layoutButton.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.className = "window-layout-menu";
    menu.hidden = true;
    menu.setAttribute("role", "group");
    menu.setAttribute("aria-label", `Organizar janela ${app.name}`);
    for (const [label, handler] of [
      ["Encaixar à esquerda", () => this.snap(app.id, "left")],
      ["Encaixar à direita", () => this.snap(app.id, "right")],
      [
        "Maximizar janela",
        () => {
          if (!state.maximized) this.maximize(app.id);
        },
      ],
      ["Restaurar tamanho", () => this.unsnap(app.id)],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (label.startsWith("Encaixar")) button.dataset.snap = "true";
      button.addEventListener("click", () => {
        this.closeMenus();
        handler();
      });
      menu.append(button);
    }
    const hint = document.createElement("p");
    hint.textContent =
      "Alt + Shift + ← / → encaixa · ↑ maximiza · ↓ restaura. Arraste as bordas para ajustar.";
    menu.append(hint);
    controls.append(
      layoutButton,
      iconButton("minimizar", `Minimizar ${app.name}`, () =>
        this.minimize(app.id),
      ),
      maximize,
      iconButton("fechar", `Fechar ${app.name}`, () => this.close(app.id)),
    );
    titlebar.append(title, controls);
    const content = appContent(app);
    element.append(titlebar, content, menu);
    const offset = (this.windows.size % 6) * 28;
    const preferred = {
      solitaire: { width: 1040, height: 650 },
      music: { width: 800, height: 620 },
      settings: { width: 560, height: 480 },
      gallery: { width: 940, height: 680 },
      terminal: { width: 760, height: 520 },
      assistant: { width: 800, height: 680 },
      about: { width: 820, height: 680 },
      notes: { width: 900, height: 680 },
      files: { width: 880, height: 660 },
    }[app.id] || { width: 560, height: 360 };
    const state = {
      app,
      element,
      maximize,
      menu,
      layoutButton,
      snap: null,
      beforeMaxSnap: null,
      minimized: false,
      maximized: false,
      x: app.id === "solitaire" ? 40 : 160 + offset,
      y: app.id === "solitaire" ? 12 : 40 + offset,
      width: preferred.width,
      height: preferred.height,
      order: 0,
      dispose: () => content.dispose?.(),
    };
    this.windows.set(app.id, state);
    this.layer.append(element);
    this.fit(state);
    element.addEventListener("pointerdown", (event) => {
      const control = event.target.closest(
        "button, input, textarea, select, a[href], summary, [tabindex]",
      );
      this.focus(app.id, !control || control === element);
    });
    element.addEventListener("focusin", () => {
      if (this.activeId !== app.id) this.focus(app.id, false);
    });
    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest("button")) this.maximize(app.id);
    });
    this.enableDrag(state, titlebar);
    this.enableResize(state);
    this.focus(app.id);
  }

  focus(id, moveFocus = true) {
    const state = this.windows.get(id);
    if (!state || state.minimized) return;
    const changed = this.activeId !== id;
    this.activeId = id;
    if (id !== "assistant") this.workspace.dataset.guideContext = id;
    if (changed)
      this.workspace.dispatchEvent(
        new CustomEvent("pixel:app-focus", { bubbles: true, detail: { id } }),
      );
    state.order = ++this.order;
    // Recompactar mantém todas as janelas abaixo dos menus e da barra.
    const ordered = [...this.windows.values()].sort(
      (a, b) => a.order - b.order,
    );
    ordered.forEach((item, index) => {
      item.element.style.zIndex = index + 1;
      item.element.classList.toggle("active", item === state);
    });
    if (moveFocus) state.element.focus({ preventScroll: true });
    this.onChange();
  }

  focusNext() {
    const next = [...this.windows.values()]
      .filter((s) => !s.minimized)
      .sort((a, b) => b.order - a.order)[0];
    this.activeId = null;
    if (next) this.focus(next.app.id);
    else {
      this.onChange();
      document.querySelector("#menu-toggle").focus();
    }
  }

  minimize(id) {
    const state = this.windows.get(id);
    if (!state) return;
    this.closeMenus();
    state.minimized = true;
    state.element.hidden = true;
    state.element.classList.remove("active");
    if (this.activeId === id) this.focusNext();
    else this.onChange();
  }

  restore(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.minimized = false;
    state.element.hidden = false;
    this.fit(state);
    this.focus(id);
  }

  toggleTask(id) {
    const state = this.windows.get(id);
    if (this.activeId === id && !state.minimized) this.minimize(id);
    else this.restore(id);
  }

  closeMenus() {
    for (const state of this.windows.values()) {
      state.menu.hidden = true;
      state.layoutButton.setAttribute("aria-expanded", "false");
    }
  }

  handleKey(event) {
    if (event.key === "Escape") {
      const open = [...this.windows.values()].find(
        (state) => !state.menu.hidden,
      );
      if (open) {
        event.preventDefault();
        this.closeMenus();
        open.layoutButton.focus();
      }
      return;
    }
    const fallback =
      event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;
    const windowsKey =
      event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !/Mac|iPhone|iPad/.test(navigator.platform);
    if (
      (!fallback && !windowsKey) ||
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    const state = this.windows.get(this.activeId);
    if (!state || state.minimized) return;
    event.preventDefault();
    const previous = document.activeElement;
    this.closeMenus();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
      this.snap(state.app.id, event.key === "ArrowLeft" ? "left" : "right");
    if (event.key === "ArrowUp" && !state.maximized)
      this.maximize(state.app.id);
    if (event.key === "ArrowDown") this.unsnap(state.app.id);
    if (
      state.element.contains(previous) &&
      !previous.closest(".window-layout-menu")
    )
      previous.focus({ preventScroll: true });
  }

  snap(id, side) {
    const state = this.windows.get(id);
    if (!state) return;
    if (this.workspace.clientWidth < minWindowWidth * 2) {
      this.announcement.textContent =
        "Para usar janelas lado a lado, amplie a tela para pelo menos 640 pixels.";
      return;
    }
    state.maximized = false;
    state.snap = side;
    state.beforeMaxSnap = null;
    this.fit(state);
    this.focus(id);
    this.announcement.textContent = `${state.app.name} encaixado à ${side === "left" ? "esquerda" : "direita"}.`;
  }

  unsnap(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.maximized = false;
    state.snap = null;
    state.beforeMaxSnap = null;
    this.fit(state);
    this.focus(id);
    this.announcement.textContent = `Tamanho livre de ${state.app.name} restaurado.`;
  }

  maximize(id) {
    const state = this.windows.get(id);
    if (!state) return;
    if (state.maximized) {
      state.maximized = false;
      state.snap = state.beforeMaxSnap;
      state.beforeMaxSnap = null;
    } else {
      state.beforeMaxSnap = state.snap;
      state.maximized = true;
      state.snap = null;
    }
    this.fit(state);
    this.focus(id);
  }

  release(state) {
    try {
      state.dispose();
    } catch (error) {
      // Um app com erro de limpeza não pode prender sua janela ou o encerramento.
      console.error(`Falha ao liberar ${state.app.name}:`, error);
    } finally {
      state.element.remove();
    }
  }

  close(id) {
    const state = this.windows.get(id);
    if (!state) return;
    this.release(state);
    this.windows.delete(id);
    if (this.activeId === id) this.focusNext();
    else this.onChange();
  }

  closeAll() {
    for (const state of this.windows.values()) {
      this.release(state);
    }
    this.windows.clear();
    delete this.workspace.dataset.guideContext;
    this.activeId = null;
    this.order = 0;
    this.onChange();
  }

  fit(state) {
    const area = {
      width: this.workspace.clientWidth,
      height: this.workspace.clientHeight,
    };
    // Em telas estreitas, conserve o encaixe para quando a tela voltar a crescer.
    const narrow = area.width < minWindowWidth * 2;
    let rect;
    if (state.maximized || (state.snap && narrow))
      rect = { x: 0, y: 0, ...area };
    else if (state.snap) rect = snapRect(state.snap, area);
    else {
      const width = Math.min(state.width, area.width),
        height = Math.min(state.height, area.height);
      state.x = Math.max(0, Math.min(state.x, area.width - width));
      state.y = Math.max(0, Math.min(state.y, area.height - height));
      rect = { x: state.x, y: state.y, width, height };
    }
    state.element.classList.toggle("maximized", state.maximized);
    state.element.classList.toggle("snapped", !!state.snap);
    state.element.dataset.layout = state.maximized
      ? "maximized"
      : state.snap || "free";
    const label = `${state.maximized ? "Restaurar" : "Maximizar"} ${state.app.name}`;
    state.maximize.setAttribute("aria-label", label);
    state.maximize.title = label;
    state.maximize.setAttribute("aria-pressed", String(state.maximized));
    for (const button of state.menu.querySelectorAll("[data-snap]"))
      button.disabled = narrow;
    Object.assign(state.element.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  fitAll() {
    for (const state of this.windows.values()) this.fit(state);
  }

  enableResize(state) {
    for (const direction of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      const handle = document.createElement("div");
      handle.className = `window-resize window-resize-${direction}`;
      handle.dataset.resize = direction;
      handle.setAttribute("aria-hidden", "true");
      state.element.append(handle);
      let start = null;
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || state.maximized || state.snap) return;
        const box = state.element.getBoundingClientRect(),
          area = this.workspace.getBoundingClientRect();
        start = {
          pointer: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          x: box.left - area.left,
          y: box.top - area.top,
          width: box.width,
          height: box.height,
        };
        handle.setPointerCapture(event.pointerId);
        state.element.classList.add("resizing");
        event.preventDefault();
        event.stopPropagation();
        this.focus(state.app.id);
      });
      handle.addEventListener("pointermove", (event) => {
        if (!start || start.pointer !== event.pointerId) return;
        const rect = resizeRect(
          start,
          direction,
          event.clientX - start.clientX,
          event.clientY - start.clientY,
          {
            width: this.workspace.clientWidth,
            height: this.workspace.clientHeight,
          },
        );
        Object.assign(state, rect);
        this.fit(state);
      });
      for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
        handle.addEventListener(name, () => {
          start = null;
          state.element.classList.remove("resizing");
        });
    }
  }

  enableDrag(state, titlebar) {
    let drag = null;
    titlebar.addEventListener("pointerdown", (event) => {
      if (
        event.button !== 0 ||
        event.target.closest("button") ||
        state.maximized
      )
        return;
      const box = state.element.getBoundingClientRect();
      drag = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: state.x,
        top: state.y,
        snapped: !!state.snap,
        fraction: (event.clientX - box.left) / box.width,
        screenTop: box.top,
      };
      titlebar.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    titlebar.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      if (drag.snapped) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4)
          return;
        const area = this.workspace.getBoundingClientRect();
        state.snap = null;
        state.x =
          drag.x -
          area.left -
          Math.min(state.width, area.width) * drag.fraction;
        state.y = drag.screenTop - area.top;
        this.fit(state);
        drag.left = state.x;
        drag.top = state.y;
        drag.snapped = false;
      }
      state.x = drag.left + event.clientX - drag.x;
      state.y = drag.top + event.clientY - drag.y;
      this.fit(state);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      titlebar.addEventListener(name, () => {
        drag = null;
      });
    }
  }
}
