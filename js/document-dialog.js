// Confirmações restritas à janela do aplicativo, sem bloquear o resto do desktop.
export function createDocumentDialog(root, shell) {
  let active;
  function cancel() {
    active?.finish(false);
  }
  return {
    cancel,
    confirm(title, message) {
      cancel();
      const previous = document.activeElement;
      return new Promise((resolve) => {
        const overlay = document.createElement("section");
        overlay.className = "document-dialog";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-label", title);
        const box = document.createElement("div"),
          heading = document.createElement("h3"),
          description = document.createElement("p");
        heading.textContent = title;
        description.textContent = message;
        const no = document.createElement("button"),
          yes = document.createElement("button");
        no.type = yes.type = "button";
        no.textContent = "Cancelar";
        yes.textContent = "Excluir";
        const finish = (value) => {
          shell.inert = false;
          overlay.remove();
          active = null;
          if (previous?.isConnected) previous.focus();
          resolve(value);
        };
        active = { finish };
        no.addEventListener("click", () => finish(false));
        yes.addEventListener("click", () => finish(true));
        overlay.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            finish(false);
          }
          if (event.key === "Tab") {
            event.preventDefault();
            (document.activeElement === no ? yes : no).focus();
          }
        });
        box.append(heading, description, no, yes);
        overlay.append(box);
        root.append(overlay);
        shell.inert = true;
        no.focus();
      });
    },
  };
}
