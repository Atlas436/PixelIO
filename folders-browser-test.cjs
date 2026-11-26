const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const url = process.env.PIXEL_URL || "http://localhost:8080";
    async function boot() {
      await page.goto(url);
      await page.locator("#start").click();
      await page.locator("#system").waitFor({ state: "visible" });
    }
    await boot();
    // Um registro do formato anterior deve permanecer legível.
    await page.evaluate(async () => {
      const { listFiles } = await import("./js/documents-store.js");
      await listFiles();
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("pixel-oi-documents", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("files", "readwrite");
          const blob = new Blob(["Arquivo antigo intacto."], {
            type: "text/plain",
          });
          tx.objectStore("files").put({
            id: "legado",
            name: "legado.txt",
            type: blob.type,
            size: blob.size,
            blob,
            createdAt: 1,
            updatedAt: 1,
          });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = reject;
        };
      });
    });
    await page.locator('.desktop-app[data-app="files"]').click();
    const app = page.locator(".files-app");
    await app
      .locator(".files-list button")
      .filter({ hasText: "legado.txt" })
      .click();
    await app.locator(".file-preview pre").waitFor();
    assert.equal(
      await app.locator(".file-preview pre").textContent(),
      "Arquivo antigo intacto.",
    );
    async function create(name) {
      await app
        .getByRole("button", { name: "Nova pasta", exact: true })
        .click();
      await app.locator("#new-folder-name").fill(name);
      await app
        .locator("#new-folder-form")
        .getByRole("button", { name: "Criar pasta", exact: true })
        .click();
      await app
        .locator(".files-list button")
        .filter({ hasText: name })
        .waitFor();
    }
    await create("Estudos");
    const a = await app
      .locator(".files-list [data-folder-id]")
      .getAttribute("data-folder-id");
    await app.getByRole("button", { name: "Nova pasta", exact: true }).click();
    await app.locator("#new-folder-name").fill("estudos");
    await app
      .locator("#new-folder-form")
      .getByRole("button", { name: "Criar pasta", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector(".files-app .document-status")
        .textContent.includes("Já existe"),
    );
    await app.locator("[data-folder-cancel]").click();
    assert.equal(await app.locator("[data-folder-id]").count(), 1);
    await app.locator(`[data-folder-id="${a}"]`).dblclick();
    await page.waitForFunction(
      () =>
        document.querySelector(".files-path [aria-current]").textContent ===
        "Estudos",
    );
    await create("Aulas");
    const child = await app
      .locator("[data-folder-id]")
      .getAttribute("data-folder-id");
    await app.locator(`[data-folder-id="${child}"]`).click();
    await app.getByRole("button", { name: "Abrir pasta", exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".files-path [aria-current]").textContent ===
        "Aulas",
    );
    await app
      .locator("#files-import")
      .setInputFiles({
        name: "resumo.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Conteúdo dentro de Aulas."),
      });
    await app
      .locator(".files-list button")
      .filter({ hasText: "resumo.txt" })
      .waitFor();
    const imported = await page.evaluate(async () => {
      const { listFiles } = await import("./js/documents-store.js");
      return (await listFiles()).find((f) => f.name === "resumo.txt");
    });
    assert.equal(imported.parentId, child);
    await app
      .locator(".files-path")
      .getByRole("button", { name: "Arquivos", exact: true })
      .click();
    assert.equal(
      await app
        .locator(".files-list button")
        .filter({ hasText: "resumo.txt" })
        .count(),
      0,
    );
    // Mover um arquivo antigo para a subpasta preserva seus bytes.
    await app
      .locator(".files-list button")
      .filter({ hasText: "legado.txt" })
      .click();
    await app.locator("#file-move-destination").selectOption(child);
    await app.getByRole("button", { name: "Mover item", exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector('.files-list [data-file-id="legado"]'),
    );
    await app.locator(`[data-folder-id="${a}"]`).dblclick();
    await app.locator(`[data-folder-id="${child}"]`).dblclick();
    await app.locator('[data-file-id="legado"]').click();
    await app.locator(".file-preview pre").waitFor();
    assert.equal(
      await app.locator(".file-preview pre").textContent(),
      "Arquivo antigo intacto.",
    );
    // Excluir uma pasta com conteúdo é recusado, inclusive pela camada de dados.
    await app
      .getByRole("button", { name: "Voltar pasta", exact: true })
      .click();
    await app.locator(`[data-folder-id="${child}"]`).click();
    await app
      .getByRole("button", { name: "Excluir pasta", exact: true })
      .click();
    assert.match(
      await app.locator(".document-status").textContent(),
      /contém itens/,
    );
    const checks = await page.evaluate(
      async ({ a, child }) => {
        const store = await import("./js/documents-store.js");
        const rejected = [];
        for (const action of [
          () => store.removeFile(a),
          () => store.moveFile(a, child),
          () =>
            store.addFile(new Blob(["x"]), "x.txt", {
              parentId: "inexistente",
            }),
        ]) {
          try {
            await action();
            rejected.push(false);
          } catch {
            rejected.push(true);
          }
        }
        return rejected;
      },
      { a, child },
    );
    assert.deepEqual(checks, [true, true, true]);
    // Renomear a pasta atualiza o caminho dos filhos sem deslocar seu conteúdo.
    await app.locator("#file-rename-name").fill("Cadernos");
    await app.getByRole("button", { name: "Salvar nome", exact: true }).click();
    await app
      .locator(".files-list button")
      .filter({ hasText: "Cadernos" })
      .waitFor();
    await app.locator(`[data-folder-id="${child}"]`).dblclick();
    assert.equal(
      await app.locator(".files-path [aria-current]").textContent(),
      "Cadernos",
    );
    assert.equal(await app.locator(".files-list [data-file-id]").count(), 2);
    await boot();
    await page.locator('.desktop-app[data-app="files"]').click();
    await app.locator(`[data-folder-id="${a}"]`).dblclick();
    await app.locator(`[data-folder-id="${child}"]`).dblclick();
    assert.equal(await app.locator(".files-list [data-file-id]").count(), 2);
    // Apagar itens de dentro permite excluir somente a pasta agora vazia.
    for (const id of ["legado", imported.id]) {
      await app.locator(`[data-file-id="${id}"]`).click();
      await app
        .getByRole("button", { name: "Excluir arquivo", exact: true })
        .click();
      await app
        .locator(".document-dialog")
        .getByRole("button", { name: "Excluir", exact: true })
        .click();
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-file-id="${id}"]`),
        id,
      );
    }
    await app
      .getByRole("button", { name: "Voltar pasta", exact: true })
      .click();
    await app.locator(`[data-folder-id="${child}"]`).click();
    await app
      .getByRole("button", { name: "Excluir pasta", exact: true })
      .click();
    await app
      .locator(".document-dialog")
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await page.waitForFunction(
      (id) => !document.querySelector(`[data-folder-id="${id}"]`),
      child,
    );
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForFunction(
      () =>
        document.querySelector('.window[data-app="files"]').offsetWidth <=
        innerWidth,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS pastas: legado intacto, criação, subpastas, duplicatas, caminho, importação no destino, mover sem perder dados, ciclos recusados, renomear, persistência e exclusão segura.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
