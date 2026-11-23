const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    const ids = await page.evaluate(async () => {
      const s = await import("./js/documents-store.js");
      const folder = await s.createFolder("Destino");
      const a = await s.addFile(
        new Blob(["A intacto"], { type: "text/plain" }),
        "a.txt",
      );
      const b = await s.addFile(
        new Blob(["B intacto"], { type: "text/plain" }),
        "b.txt",
      );
      const source = await s.createFolder("Origem");
      const nested = await s.createFolder("Interna", source.id);
      const duplicate = await s.createFolder("Origem", folder.id);
      return {
        folder: folder.id,
        a: a.id,
        b: b.id,
        source: source.id,
        nested: nested.id,
        duplicate: duplicate.id,
      };
    });
    await page.locator('.desktop-app[data-app="files"]').dblclick();
    const app = page.locator(".files-app");
    await app
      .getByRole("checkbox", { name: "Selecionar a.txt", exact: true })
      .check();
    await app
      .getByRole("checkbox", { name: "Selecionar b.txt", exact: true })
      .check();
    await app.locator("#files-search").fill("a.txt");
    assert.equal(
      await app
        .getByRole("checkbox", { name: "Selecionar a.txt", exact: true })
        .isChecked(),
      true,
    );
    assert.ok(
      (await app.locator(".files-bulk").textContent()).includes(
        "2 selecionado",
      ),
    );
    await app.getByLabel("Destino dos selecionados").selectOption(ids.folder);
    await app
      .getByRole("button", { name: "Mover selecionados", exact: true })
      .click();
    await page.waitForFunction(async (ids) => {
      const s = await import("./js/documents-store.js");
      const entries = await s.listFiles();
      return [ids.a, ids.b].every(
        (id) => entries.find((f) => f.id === id).parentId === ids.folder,
      );
    }, ids);
    await app.locator("#files-search").fill("");
    await app.locator(`[data-folder-id="${ids.folder}"]`).dblclick();
    await app
      .getByRole("checkbox", { name: "Selecionar a.txt", exact: true })
      .waitFor();
    const texts = await page.evaluate(async (ids) => {
      const s = await import("./js/documents-store.js");
      const files = await s.listFiles();
      return Promise.all(
        [ids.a, ids.b].map((id) => files.find((f) => f.id === id).blob.text()),
      );
    }, ids);
    assert.deepEqual(texts, ["A intacto", "B intacto"]);
    await app
      .getByRole("button", { name: "Selecionar visíveis", exact: true })
      .click();
    assert.equal(await app.getByRole("checkbox").count(), 3);
    assert.equal(await app.locator("input[type=checkbox]:checked").count(), 3);
    await app
      .getByRole("button", { name: "Limpar seleção", exact: true })
      .click();
    assert.equal(await app.locator("input[type=checkbox]:checked").count(), 0);
    await app
      .getByRole("button", { name: "Voltar pasta", exact: true })
      .click();
    await app
      .getByRole("checkbox", { name: "Selecionar Origem", exact: true })
      .check();
    assert.equal(
      await app
        .getByLabel("Destino dos selecionados")
        .locator(`option[value="${ids.nested}"]`)
        .count(),
      0,
    );
    await app.getByLabel("Destino dos selecionados").selectOption(ids.folder);
    await app
      .getByRole("button", { name: "Mover selecionados", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector(".files-app .document-status")
        .textContent.includes("Já existe"),
    );
    assert.equal(
      await app
        .getByRole("checkbox", { name: "Selecionar Origem", exact: true })
        .isChecked(),
      true,
    );
    // Atomic rollback: a valid file must stay put when another selected folder conflicts.
    await page.evaluate(async (ids) => {
      const s = await import("./js/documents-store.js");
      const temp = await s.addFile(new Blob(["test"]), "temp.txt");
      let rejected = false;
      try {
        await s.moveFiles([temp.id, ids.source], ids.folder);
      } catch {
        rejected = true;
      }
      if (!rejected) throw new Error("Conflito não recusado");
      const entries = await s.listFiles();
      if (entries.find((f) => f.id === temp.id).parentId !== null)
        throw new Error("Lote parcialmente movido");
      let cycle = false;
      try {
        await s.moveFiles([temp.id, ids.source], ids.nested);
      } catch {
        cycle = true;
      }
      if (!cycle) throw new Error("Ciclo não recusado");
    }, ids);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await page.screenshot({ path: "/workspace/work/files-bulk-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS seleção múltipla: seleção com busca, mover lote, bytes preservados, selecionar/limpar, destinos seguros e rollback atômico em conflito/ciclo.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
