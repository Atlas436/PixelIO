const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 850 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    await page.locator('.desktop-app[data-app="terminal"]').click();
    const terminal = page.locator(".terminal-app"),
      input = terminal.getByRole("textbox", { name: "Comando Pixel" }),
      output = terminal.getByRole("log");
    async function run(text) {
      await input.fill(text);
      await input.press("Enter");
    }
    await run("pixel ajuda");
    assert.match(await output.textContent(), /pixel abrir <app>/);
    await run("pixel listar");
    assert.match(
      await output.textContent(),
      /Assistente IA — em desenvolvimento/,
    );
    await run("pixel versao");
    assert.match(await output.textContent(), /versão 0\.1\.0/);
    await input.fill("rascunho");
    await input.press("ArrowUp");
    assert.equal(await input.inputValue(), "pixel versao");
    await input.press("ArrowDown");
    assert.equal(await input.inputValue(), "rascunho");
    await run("pixel abrir notas");
    await page.locator(".notes-app").waitFor();
    assert.equal(
      await page.locator(".window.active").getAttribute("data-app"),
      "notes",
    );
    await page
      .getByRole("button", { name: "Fechar Notas", exact: true })
      .click();
    await run("pixel abrir notas");
    assert.equal(await page.locator(".notes-app").count(), 1);
    await page
      .getByRole("button", { name: "Minimizar Notas", exact: true })
      .click();
    await run("pixel abrir notas");
    assert.equal(await page.locator(".notes-app").count(), 1);
    assert.equal(
      await page.locator(".window.active").getAttribute("data-app"),
      "notes",
    );
    await page
      .getByRole("button", { name: "Fechar Notas", exact: true })
      .click();
    await run("pixel abrir inventado");
    assert.match(await output.textContent(), /Aplicativo não encontrado/);
    await run("<img src=x onerror=alert(1)>");
    assert.equal(await output.locator("img").count(), 0);
    assert.ok(
      (await output.textContent()).includes("<img src=x onerror=alert(1)>"),
    );
    await run("pixel sobre");
    const about = page.locator(".about-app");
    await about.waitFor();
    assert.deepEqual(
      await about.locator(".about-members li").allTextContents(),
      ["Julia", "Lais", "Geovanna"],
    );
    assert.match(await about.textContent(), /Windows96/);
    assert.match(await about.textContent(), /artigo está em preparação/);
    assert.equal(await about.locator("tbody tr").count(), 6);
    assert.equal(await about.locator("a").count(), 1);
    await page.screenshot({ path: "/workspace/work/about-desktop.png" });
    await page
      .getByRole("button", { name: "Fechar Sobre", exact: true })
      .click();
    await run("pixel limpar");
    assert.equal(await output.textContent(), "");
    await input.press("ArrowUp");
    assert.equal(await input.inputValue(), "pixel limpar");
    await run("pixel abrir assistente ia");
    assert.match(
      await page.locator('.window[data-app="assistant"]').textContent(),
      /EM DESENVOLVIMENTO/,
    );
    await page
      .getByRole("button", { name: "Fechar Assistente IA", exact: true })
      .click();
    await page.setViewportSize({ width: 360, height: 740 });
    await run("pixel ajuda");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await page.screenshot({ path: "/workspace/work/terminal-mobile.png" });
    await run("pixel sobre");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await about.locator("section").last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/workspace/work/about-mobile.png" });
    assert.deepEqual(errors, []);
    console.log(
      "PASS Terminal/Sobre: comandos, ajuda, histórico, abrir/restaurar sem duplicar, foco, erros, texto seguro, limpar, membros, inspiração, artigo pendente e mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
