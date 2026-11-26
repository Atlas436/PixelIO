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
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage({
      viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const url = process.env.PIXEL_URL || "http://localhost:8080";
    async function boot(p) {
      await p.goto(url);
      await p.locator("#start").click();
      await p.locator("#system").waitFor({ state: "visible" });
    }
    await boot(page);
    const notes = page.locator(".notes-app"),
      files = page.locator(".files-app");
    await page.locator('.desktop-app[data-app="files"]').click();
    await page.locator('.desktop-app[data-app="notes"]').click();
    await notes.getByRole("button", { name: "Nova nota", exact: true }).click();
    await notes.locator("#note-title").fill("Memória da aula");
    const body =
      "Primeira linha\nIdeias com acentuação e um <script>texto seguro</script>.";
    await notes.locator("#note-body").fill(body);
    await page.waitForFunction(
      () =>
        document.querySelector(".notes-app .document-status").textContent ===
        "Nota salva neste navegador.",
    );
    await notes.locator("#notes-search").fill("acentuacao");
    assert.equal(await notes.locator(".notes-list button").count(), 1);
    await notes.locator("#notes-search").fill("inexistente");
    assert.equal(await notes.locator(".notes-list button").count(), 0);
    await notes.locator("#notes-search").fill("");
    await notes
      .getByRole("button", { name: "Exportar .txt", exact: true })
      .click();
    await files
      .locator(".files-list button")
      .filter({ hasText: "Memória da aula.txt" })
      .waitFor();
    // Uma segunda exportação preserva a primeira cópia.
    await notes.locator("#note-body").fill("Versão atualizada");
    await notes
      .getByRole("button", { name: "Exportar .txt", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".files-list button").length === 2,
    );
    await page.locator('[data-task="files"]').click();
    const firstFile = files.locator(".files-list button").last();
    await firstFile.click();
    await files.locator(".file-preview pre").waitFor();
    assert.equal(await files.locator(".file-preview pre").textContent(), body);
    await files.locator("#file-rename-name").fill("../invalido.txt");
    await files
      .getByRole("button", { name: "Salvar nome", exact: true })
      .click();
    assert.match(
      await files.locator(".document-status").textContent(),
      /sem barras/,
    );
    await files.locator("#file-rename-name").fill("Minha cópia.txt");
    await files
      .getByRole("button", { name: "Salvar nome", exact: true })
      .click();
    await files
      .locator(".file-details h4")
      .filter({ hasText: "Minha cópia.txt" })
      .waitFor();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      files
        .getByRole("button", { name: "Baixar no computador", exact: true })
        .click(),
    ]);
    assert.equal(download.suggestedFilename(), "Minha cópia.txt");
    assert.equal(fs.readFileSync(await download.path(), "utf8"), body);
    await files
      .getByRole("button", { name: "Abrir cópia no Notas", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".notes-app #note-title").value ===
        "Minha cópia",
    );
    assert.equal(await notes.locator("#note-body").inputValue(), body);
    assert.equal(await notes.locator(".notes-list button").count(), 2);
    // Excluir uma nota não apaga o .txt exportado.
    await notes
      .getByRole("button", { name: "Excluir nota", exact: true })
      .click();
    await notes
      .locator(".document-dialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    assert.equal(await notes.locator(".notes-list button").count(), 2);
    await notes
      .getByRole("button", { name: "Excluir nota", exact: true })
      .click();
    await notes
      .locator(".document-dialog")
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".notes-list button").length === 1,
    );
    assert.equal(await files.locator(".files-list button").count(), 2);
    // Fechar imediatamente após digitar força a gravação pendente.
    await notes.getByRole("button", { name: "Nova nota", exact: true }).click();
    await notes.locator("#note-title").fill("Rascunho ao fechar");
    await notes.locator("#note-body").fill("Não perder ao fechar.");
    await page
      .locator('.window[data-app="notes"]')
      .getByRole("button", { name: "Fechar Notas", exact: true })
      .click();
    await page.waitForFunction(async () => {
      const { listNotes } = await import("./js/documents-store.js");
      return (await listNotes()).some(
        (note) => note.body === "Não perder ao fechar.",
      );
    });
    await page.locator('.desktop-app[data-app="notes"]').click();
    await notes
      .locator(".notes-list button")
      .filter({ hasText: "Rascunho ao fechar" })
      .click();
    assert.equal(
      await notes.locator("#note-body").inputValue(),
      "Não perder ao fechar.",
    );
    await page.locator('[data-task="files"]').click();
    await files.locator("#files-import").setInputFiles([
      {
        name: "seguro.html",
        mimeType: "text/html",
        buffer: Buffer.from(
          '<img src=x onerror="window.importExecuted=true"><script>window.importExecuted=true</script>',
        ),
      },
      {
        name: "imagem.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=",
          "base64",
        ),
      },
    ]);
    await files
      .locator(".files-list button")
      .filter({ hasText: "seguro.html" })
      .waitFor();
    await files
      .locator(".files-list button")
      .filter({ hasText: "seguro.html" })
      .click();
    await files.locator(".file-preview pre").waitFor();
    assert.equal(await page.evaluate(() => window.importExecuted), undefined);
    assert.equal(await files.locator(".file-preview script").count(), 0);
    await files
      .locator(".files-list button")
      .filter({ hasText: "imagem.png" })
      .click();
    await page.waitForFunction(
      () => document.querySelector(".file-preview-image")?.naturalWidth === 1,
    );
    await files.locator("#files-search").fill("IMAGEM");
    assert.equal(await files.locator(".files-list button").count(), 1);
    await files.locator("#files-search").fill("");
    await files
      .getByRole("button", { name: "Excluir arquivo", exact: true })
      .click();
    await files
      .locator(".document-dialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    assert.equal(await files.locator(".files-list button").count(), 4);
    await files
      .getByRole("button", { name: "Excluir arquivo", exact: true })
      .click();
    await files
      .locator(".document-dialog")
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".files-list button").length === 3,
    );
    await boot(page);
    await page.locator('.desktop-app[data-app="notes"]').click();
    await notes
      .locator(".notes-list button")
      .filter({ hasText: "Memória da aula" })
      .click();
    assert.equal(
      await notes.locator("#note-body").inputValue(),
      "Versão atualizada",
    );
    await page.locator('.desktop-app[data-app="files"]').click();
    await files
      .locator(".files-list button")
      .filter({ hasText: "Minha cópia.txt" })
      .click();
    await files.locator(".file-preview pre").waitFor();
    assert.equal(await files.locator(".file-preview pre").textContent(), body);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForFunction(
      () =>
        document.querySelector('.window[data-app="files"]').offsetWidth <=
        innerWidth,
    );
    assert((await files.boundingBox()).width <= 360);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await page.locator('[data-task="notes"]').click();
    assert((await notes.boundingBox()).width <= 360);
    assert.deepEqual(errors, []);
    // Falha de armazenamento é explícita; não fingimos salvamento e preservamos a sessão.
    const failed = await browser.newPage();
    await failed.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", {
        get() {
          throw new DOMException("Bloqueado", "SecurityError");
        },
      });
    });
    await boot(failed);
    await failed.locator('.desktop-app[data-app="notes"]').click();
    const blocked = failed.locator(".notes-app");
    await blocked
      .getByRole("button", { name: "Nova nota", exact: true })
      .click();
    await blocked.locator("#note-title").fill("Ainda na sessão");
    await blocked.locator("#note-body").fill("Rascunho preservado.");
    await failed.waitForFunction(() =>
      document
        .querySelector(".notes-app .document-status")
        .textContent.includes("não permitiu"),
    );
    await failed
      .locator('.window[data-app="notes"]')
      .getByRole("button", { name: "Fechar Notas", exact: true })
      .click();
    await failed.locator('.desktop-app[data-app="notes"]').click();
    await blocked
      .locator(".notes-list button")
      .filter({ hasText: "Ainda na sessão" })
      .click();
    assert.equal(
      await blocked.locator("#note-body").inputValue(),
      "Rascunho preservado.",
    );
    await failed.close({ runBeforeUnload: false });
    console.log(
      "PASS documentos: autosave, busca, exportação Notas→Arquivos, cópias, renomear, download UTF-8, edição, exclusões confirmadas, flush ao fechar, importação segura, imagens, persistência, mobile e falha de armazenamento.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
