import { rankName, suits } from "./spider-rules.js";
const asset = (name) =>
  new URL(`../../assets/baralho/${name}`, import.meta.url).href;
export const back = asset("verso-pixel-oi.png");
// Retângulos inspecionados nos PNGs originais: x, y, largura e altura.
// O recorte acontece somente no CSS; os arquivos permanecem intactos.
const faces = {
  spades: {
    1: ["espadas.png", 28, 23, 30, 40],
    2: ["espadas (8).png", 28, 16, 34, 67],
    3: ["espadas (7).png", 28, 16, 34, 67],
    4: ["espadas (6).png", 28, 16, 34, 67],
    5: ["espadas (5).png", 28, 16, 34, 67],
    6: ["espadas (4).png", 28, 16, 34, 67],
    7: ["espadas (3).png", 28, 16, 34, 67],
    8: ["espadas (2).png", 28, 16, 34, 67],
    10: ["espadas (1).png", 28, 16, 34, 67],
    11: ["Valete loiro espadas.png", 28, 16, 31, 63],
    12: ["rainha espadas.png", 19, 17, 40, 66],
    13: ["reis espadas.png", 28, 16, 31, 63],
  },
  hearts: {
    1: ["copas.png", 28, 23, 30, 40],
    2: ["copas (9).png", 28, 16, 34, 67],
    3: ["copas (8).png", 28, 16, 34, 67],
    4: ["copas (7).png", 28, 16, 34, 67],
    5: ["copas (6).png", 28, 16, 34, 67],
    6: ["copas (5).png", 28, 16, 34, 67],
    7: ["copas (4).png", 28, 16, 34, 67],
    8: ["copas (3).png", 28, 16, 34, 67],
    9: ["copas (2).png", 28, 16, 34, 67],
    10: ["copas (1).png", 28, 16, 34, 67],
    11: ["Valete loiro copas.png", 28, 16, 31, 63],
    12: ["rainha copas.png", 19, 17, 40, 66],
    13: ["reis copas.png", 28, 16, 31, 63],
  },
  diamonds: {
    1: ["ouros.png", 28, 23, 30, 40],
    2: ["ouros (9).png", 28, 16, 34, 67],
    3: ["ouros (8).png", 28, 16, 34, 67],
    4: ["ouros (7).png", 28, 16, 34, 67],
    5: ["ouros (6).png", 28, 16, 34, 67],
    6: ["ouros (5).png", 28, 16, 34, 67],
    7: ["ouros (4).png", 28, 16, 34, 67],
    8: ["ouros (3).png", 28, 16, 34, 67],
    9: ["ouros (2).png", 28, 16, 34, 67],
    10: ["ouros (1).png", 28, 16, 34, 67],
    11: ["Valete loiro ouros.png", 28, 16, 31, 63],
    12: ["rainha ouros.png", 19, 17, 40, 66],
    13: ["reis ouros.png", 28, 16, 31, 63],
  },
  clubs: {
    1: ["paus.png", 28, 23, 30, 40],
    2: ["paus (8).png", 28, 23, 30, 44],
    3: ["paus (15).png", 28, 23, 30, 40],
    4: ["paus (14).png", 28, 23, 34, 53],
    5: ["paus (13).png", 28, 23, 34, 60],
    6: ["paus (12).png", 28, 23, 34, 60],
    7: ["paus (11).png", 28, 23, 34, 60],
    8: ["paus (1).png", 28, 23, 34, 60],
    9: ["paus (10).png", 28, 23, 34, 60],
    10: ["paus (9).png", 28, 16, 34, 67],
    11: ["Valete loiro paus.png", 28, 16, 31, 63],
    12: ["rainha paus.png", 19, 17, 40, 66],
    13: ["reis paus.png", 28, 16, 31, 63],
  },
};
export const cardLabel = (card) =>
  `${rankName(card.rank)} de ${suits[card.suit].name}`;

export function cardImage(card) {
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  if (!card.faceUp) {
    image.src = back;
    return image;
  }
  const face = faces[card.suit]?.[card.rank];
  if (!face) {
    const provisional = document.createElement("span");
    provisional.className = "spider-provisional";
    const label = `${card.rank} ${suits[card.suit].symbol}`;
    provisional.innerHTML = `<span>${label}</span><small>${label}</small><span>${label}</span>`;
    provisional.classList.toggle("red-suit", suits[card.suit].red);
    return provisional;
  }
  const [name, x, y, width, height] = face;
  image.src = asset(name);
  Object.assign(image.style, {
    width: `${10000 / width}%`,
    height: `${10000 / height}%`,
    left: `${(-x / width) * 100}%`,
    top: `${(-y / height) * 100}%`,
  });
  return image;
}
