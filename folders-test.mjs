import test from "node:test";
import assert from "node:assert/strict";
import {
  parentOf,
  isFolder,
  folderTrail,
  validateDestination,
} from "./js/file-tree.js";
const entries = [
  { id: "a", kind: "folder", name: "A", parentId: null },
  { id: "b", kind: "folder", name: "B", parentId: "a" },
  { id: "c", kind: "folder", name: "C", parentId: "b" },
  { id: "txt", name: "legado.txt" },
];
test("arquivos antigos continuam na raiz e caminhos refletem a hierarquia", () => {
  assert.equal(parentOf(entries[3]), null);
  assert(!isFolder(entries[3]));
  assert.deepEqual(
    folderTrail(entries, "c").map((f) => f.name),
    ["A", "B", "C"],
  );
  assert.deepEqual(folderTrail(entries, null), []);
  assert.equal(folderTrail(entries, "inexistente"), null);
  assert.equal(folderTrail(entries, "txt"), null);
});
test("não permite mover pastas para dentro delas ou de descendentes", () => {
  assert.throws(() => validateDestination(entries, "a", "a"));
  assert.throws(() => validateDestination(entries, "c", "a"));
  assert.throws(() => validateDestination(entries, "txt"));
  assert.doesNotThrow(() => validateDestination(entries, null, "a"));
  assert.doesNotThrow(() => validateDestination(entries, "c", "txt"));
});
test("ciclos e pais inexistentes não causam navegação infinita", () => {
  const cycle = [
    { id: "x", kind: "folder", parentId: "y" },
    { id: "y", kind: "folder", parentId: "x" },
  ];
  assert.equal(folderTrail(cycle, "x"), null);
  assert.equal(
    folderTrail([{ id: "a", kind: "folder", parentId: "no" }], "a"),
    null,
  );
});
