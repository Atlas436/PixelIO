import test from "node:test";
import assert from "node:assert/strict";
import {
  validateFilename,
  noteFilename,
  foldText,
  isTextFile,
  formatBytes,
} from "./js/documents-store.js";
test("nomes de arquivo válidos e caminhos recusados", () => {
  assert.equal(
    validateFilename(" Memória da aula.txt "),
    "Memória da aula.txt",
  );
  for (const name of [
    "",
    ".",
    "..",
    "../texto.txt",
    "pasta/nota.txt",
    "C:\\nota.txt",
    "a\u0000.txt",
    "a".repeat(161),
  ])
    assert.throws(() => validateFilename(name));
  assert.equal(
    noteFilename({ title: "Minha / nota: hoje?" }),
    "Minha - nota- hoje-.txt",
  );
  assert.equal(noteFilename({ title: "   " }), "Sem título.txt");
});
test("busca sem acentos e identificação de texto", () => {
  assert.equal(foldText("MEMÓRIA e AÇÃO"), "memoria e acao");
  assert(isTextFile({ name: "nota.TXT", type: "application/octet-stream" }));
  assert(isTextFile({ name: "pagina.html", type: "text/html" }));
  assert(!isTextFile({ name: "foto.png", type: "image/png" }));
  assert.equal(formatBytes(12), "12 B");
  assert.equal(formatBytes(1024), "1.0 KB");
});
