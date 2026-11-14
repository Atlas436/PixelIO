import { iconButton } from "./assets.js";
import { appContent } from "./apps.js";

// Uma janela por aplicativo. O Map mantém a relação entre estado e elemento.
export class WindowManager {
  constructor(workspace, layer, onChange) {
    this.workspace = workspace;
    this.layer = layer;
    this.onChange = onChange;
    this.windows = new Map();
    this.activeId = null;
    this.order = 0;
    window.addEventListener("resize", () => this.fitAll());
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
    controls.append(
      iconButton("minimizar", `Minimizar ${app.name}`, () =>
        this.minimize(app.id),
      ),
      maximize,
      iconButton("fechar", `Fechar ${app.name}`, () => this.close(app.id)),
    );
    titlebar.append(title, controls);
    element.append(titlebar, appContent(app));
    const offset = (this.windows.size % 6) * 28;
    const state = {
      app,
      element,
      maximize,
      minimized: false,
      maximized: false,
      x: 160 + offset,
      y: 40 + offset,
      width: 560,
      height: 360,
      order: 0,
    };
    this.windows.set(app.id, state);
    this.layer.append(element);
    this.fit(state);
    element.addEventListener("pointerdown", () => this.focus(app.id, false));
    element.addEventListener("focusin", () => {
      if (this.activeId !== app.id) this.focus(app.id, false);
    });
    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest("button")) this.maximize(app.id);
    });
    this.enableDrag(state, titlebar);
    this.focus(app.id);
  }

  focus(id, moveFocus = true) {
    const state = this.windows.get(id);
    if (!state || state.minimized) return;
    this.activeId = id;
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

  maximize(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.maximized = !state.maximized;
    state.element.classList.toggle("maximized", state.maximized);
    const label = `${state.maximized ? "Restaurar" : "Maximizar"} ${state.app.name}`;
    state.maximize.setAttribute("aria-label", label);
    state.maximize.title = label;
    state.maximize.setAttribute("aria-pressed", String(state.maximized));
    // O mesmo PNG autoral é reutilizado para restaurar; não há arte inventada.
    this.fit(state);
    this.focus(id);
  }

  close(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.element.remove();
    this.windows.delete(id);
    if (this.activeId === id) this.focusNext();
    else this.onChange();
  }

  closeAll() {
    for (const state of this.windows.values()) state.element.remove();
    this.windows.clear();
    this.activeId = null;
    this.order = 0;
    this.onChange();
  }

  fit(state) {
    if (state.maximized) return;
    const { clientWidth: width, clientHeight: height } = this.workspace;
    const w = Math.min(state.width, width);
    const h = Math.min(state.height, height);
    state.x = Math.max(0, Math.min(state.x, width - w));
    state.y = Math.max(0, Math.min(state.y, height - h));
    Object.assign(state.element.style, {
      left: `${state.x}px`,
      top: `${state.y}px`,
      width: `${w}px`,
      height: `${h}px`,
    });
  }

  fitAll() {
    for (const state of this.windows.values()) this.fit(state);
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
      drag = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: state.x,
        top: state.y,
      };
      titlebar.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    titlebar.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointer !== event.pointerId) return;
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
