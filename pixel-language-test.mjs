import test from "node:test";
import assert from "node:assert/strict";
import { parsePixel } from "./js/pixel-language.js";
import { projectVersion, commands } from "./js/project-info.js";
import { readFileSync } from "node:fs";
test("comandos Pixel, espaços, acentos e aliases", () => {
  for (const [input, type] of [
    ["pixel ajuda", "help"],
    ["pixel listar", "list"],
    ["PIXEL VERSÃO", "version"],
    ["pixel limpar", "clear"],
    ["pixel sobre", "about"],
    ["pixel", "help"],
    ["  ", "empty"],
  ])
    assert.equal(parsePixel(input).type, type);
  for (const [name, id] of [
    ["guia", "assistant"],
    ["notas", "notes"],
    ["MÚSICA", "music"],
    ["musica", "music"],
    ["configuracoes", "settings"],
    ["paciência", "solitaire"],
    ["spider", "solitaire"],
    ["Pixel Studio", "studio"],
    ['"Pixel Studio"', "studio"],
    ["Assistente IA", "assistant"],
    ["sobre", "about"],
    ["terminal", "terminal"],
    ["galeria", "gallery"],
    ["arquivos", "files"],
  ])
    assert.deepEqual(parsePixel(` PIXEL  abrir  ${name} `), {
      type: "open",
      id,
    });
});
test("entradas desconhecidas não abrem apps nem executam código", () => {
  for (const input of [
    "abrir notas",
    "pixel errado",
    "pixel constructor",
    "pixel __proto__",
    "pixel abrir",
    "pixel abrir inventado",
    "pixel ajuda extra",
    "pixel versao 123",
    "pixel abrir notas;alert(1)",
    "<script>alert(1)</script>",
    "pixel abrir https://example.com",
  ])
    assert.equal(parsePixel(input).type, "error");
});
test("versão e ajuda têm fonte consistente", () => {
  assert.equal(
    projectVersion,
    JSON.parse(readFileSync(new URL("./package.json", import.meta.url)))
      .version,
  );
  for (const command of commands)
    assert.notEqual(
      parsePixel(command.syntax.replace("<app>", "notas")).type,
      "error",
    );
});
