// Os nomes originais do Drive foram preservados, inclusive a extensão dupla.
const asset = (name) => new URL(`../assets/${name}`, import.meta.url).href;
const originalNames = {
  volume_baixo_normal: "volume_baixo_normal.png (2).png",
};

export function pixelArt(name) {
  const span = document.createElement("span");
  span.className = "pixel-art";
  span.setAttribute("aria-hidden", "true");
  for (const state of ["normal", "hover", "pressed"]) {
    const image = document.createElement("img");
    image.src = asset(
      originalNames[`${name}_${state}`] || `${name}_${state}.png.png`,
    );
    image.alt = "";
    image.className = state;
    image.draggable = false;
    span.append(image);
  }
  return span;
}

export function iconButton(name, label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pixel-button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.append(pixelArt(name));
  if (action) button.addEventListener("click", action);
  return button;
}

export function decorateButton(button, name, white = false) {
  button.classList.add("pixel-button");
  if (!white) button.prepend(pixelArt(name));
  else {
    // Uma máscara usa o PNG original e permite aplicar a cor oficial.
    const icon = document.createElement("span");
    icon.className = "pixel-art white-icon";
    icon.style.maskImage = `url("${asset(name)}")`;
    icon.style.webkitMaskImage = `url("${asset(name)}")`;
    icon.setAttribute("aria-hidden", "true");
    button.prepend(icon);
  }
}
