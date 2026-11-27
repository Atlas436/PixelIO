const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    for (const [id, name] of Object.entries({
      files: "Arquivos",
      music: "Música",
      terminal: "Terminal",
      notes: "Notas",
      assistant: "Assistente IA",
      solitaire: "Paciência",
      studio: "Pixel Studio",
      settings: "Configurações",
      gallery: "Galeria",
      about: "Sobre",
    })) {
      await page.locator(`.desktop-app[data-app="${id}"]`).click();
      const win = page.locator(`.window[data-app="${id}"]`);
      await win.waitFor();
      const close = win.getByRole("button", {
        name: `Fechar ${name}`,
        exact: true,
      });
      const box = await close.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
      // O canto do botão também deve fechar, sem arrastar a janela.
      await close.click({ position: { x: 2, y: 2 } });
      assert.equal(await win.count(), 0);
      assert.equal(await page.locator(`[data-task="${id}"]`).count(), 0);
    }
    const shortcut = page.locator('.desktop-app[data-app="about"]');
    await shortcut.focus();
    await page.keyboard.press("Enter");
    await page.locator('.window[data-app="about"]').waitFor();
    await page
      .getByRole("button", { name: "Fechar Sobre", exact: true })
      .focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator(".window").count(), 0);
    await shortcut.focus();
    await page.keyboard.press("Space");
    await page.locator('.window[data-app="about"]').waitFor();
    await page
      .getByRole("button", { name: "Fechar Sobre", exact: true })
      .click();
    await page.setViewportSize({ width: 360, height: 740 });
    await page.locator('.desktop-app[data-app="notes"]').tap();
    const notes = page.locator('.window[data-app="notes"]');
    await notes.waitFor();
    await notes.getByRole("button", { name: "Nova nota", exact: true }).click();
    await notes
      .locator("#note-body")
      .fill("Nota preservada ao fechar com um toque.");
    await page.getByRole("button", { name: "Fechar Notas", exact: true }).tap();
    assert.equal(await notes.count(), 0);
    await page.locator('.desktop-app[data-app="notes"]').tap();
    await notes.locator("[data-note-id]").click();
    assert.equal(
      await notes.locator("#note-body").inputValue(),
      "Nota preservada ao fechar com um toque.",
    );
    await page.getByRole("button", { name: "Fechar Notas", exact: true }).tap();
    // Uma falha de limpeza não pode impedir fechar ou encerrar as demais janelas.
    const result = await page.evaluate(async () => {
      const { WindowManager } = await import("./js/system/windows.js");
      const workspace = document.querySelector("#workspace");
      const layer = document.createElement("div");
      workspace.append(layer);
      let changes = 0;
      const manager = new WindowManager(workspace, layer, () => changes++);
      const a = { id: "review-a", name: "Revisão A" },
        b = { id: "review-b", name: "Revisão B" };
      manager.open(a);
      manager.open(b);
      manager.windows.get(b.id).dispose = () => {
        throw new Error("Falha de limpeza simulada");
      };
      manager.close(b.id);
      const closed =
        manager.windows.size === 1 &&
        !layer.querySelector('[data-app="review-b"]') &&
        manager.activeId === a.id;
      manager.open(b);
      manager.windows.get(a.id).dispose = () => {
        throw new Error("Falha no encerramento simulada");
      };
      manager.closeAll();
      const empty =
        manager.windows.size === 0 &&
        layer.children.length === 0 &&
        manager.activeId === null;
      layer.remove();
      return { closed, empty, changes };
    });
    assert.ok(result.closed && result.empty && result.changes > 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS janelas: um clique nos 10 apps, fechar pelos cantos, tarefas removidas, Enter/Espaço, toque, nota preservada e limpeza com falha sem travar fechamento/encerramento.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
