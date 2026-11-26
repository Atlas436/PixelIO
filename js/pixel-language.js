import { apps } from "./app-catalog.js";
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
export function parsePixel(input) {
  const text = normalize(input);
  if (!text) return { type: "empty" };
  const [prefix, verb, ...rest] = text.split(" ");
  if (prefix !== "pixel")
    return {
      type: "error",
      message: "Comece com pixel. Digite pixel ajuda para ver os comandos.",
    };
  if (!verb) return { type: "help" };
  const simple = {
    ajuda: "help",
    listar: "list",
    versao: "version",
    limpar: "clear",
    sobre: "about",
  };
  if (Object.hasOwn(simple, verb))
    return rest.length
      ? { type: "error", message: `pixel ${verb} não recebe argumentos.` }
      : { type: simple[verb] };
  if (verb !== "abrir")
    return {
      type: "error",
      message: "Comando desconhecido. Digite pixel ajuda.",
    };
  if (!rest.length)
    return {
      type: "error",
      message:
        "Qual app? Exemplo: pixel abrir notas. Use pixel listar para ver os nomes.",
    };
  const requested = rest.join(" ").replace(/^(["'])(.*)\1$/, "$2");
  const alias = {
    guia: "assistant",
    assistente: "assistant",
    spider: "solitaire",
    paciencia: "solitaire",
    configuracoes: "settings",
    "pixel studio": "studio",
  };
  const app = apps.find(
    (app) =>
      normalize(app.name) === requested ||
      app.id === requested ||
      app.id === alias[requested],
  );
  if (!app)
    return {
      type: "error",
      message: "Aplicativo não encontrado. Use pixel listar para ver os nomes.",
    };
  return { type: "open", id: app.id };
}
export const isPendingApp = (app) => app.id === "studio";
