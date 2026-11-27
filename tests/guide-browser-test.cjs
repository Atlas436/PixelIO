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
    const network = [];
    page.on("request", (r) => {
      if (["fetch", "xhr"].includes(r.resourceType())) network.push(r.url());
    });
    await page.goto(process.env.PIXEL_URL || "http://localhost:8080");
    await page.locator("#start").click();
    await page.locator("#system").waitFor({ state: "visible" });
    await page.locator('.desktop-app[data-app="notes"]').click();
    await page
      .getByRole("button", { name: "Minimizar Notas", exact: true })
      .click();
    await page.locator('.desktop-app[data-app="assistant"]').click();
    const guide = page.locator(".guide-app"),
      input = guide.getByRole("textbox", {
        name: "Sua dúvida sobre o Pixel.OI",
      }),
      log = guide.getByRole("log");
    await guide
      .getByRole("button", { name: "Dica do último app", exact: true })
      .click();
    assert.match(await log.textContent(), /salvamento é automático/);
    async function ask(q) {
      await input.fill(q);
      await input.press("Enter");
    }
    await guide
      .getByRole("button", { name: "Limpar conversa", exact: true })
      .click();
    await guide
      .locator(".guide-suggestions")
      .getByRole("button", { name: "O que posso fazer aqui?", exact: true })
      .click();
    assert.equal(
      await log.locator(".guide-answer").last().locator("button").count(),
      6,
    );
    await ask("Onde ficou minha nota?");
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /neste navegador e perfil/,
    );
    await log
      .locator(".guide-answer")
      .last()
      .getByRole("button", { name: "Abrir Notas", exact: true })
      .click();
    assert.equal(
      await page.locator(".window.active").getAttribute("data-app"),
      "notes",
    );
    assert.equal(await page.locator(".notes-app").count(), 1);
    await page
      .getByRole("button", { name: "Fechar Notas", exact: true })
      .click();
    await ask("Quem criou o projeto?");
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /Julia, Lais, Geovanna/,
    );
    await ask("O artigo está pronto?");
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /preparação/,
    );
    await ask("Quais apps faltam?");
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /único aplicativo/,
    );
    await ask("<img src=x onerror=alert(1)>");
    assert.equal(await log.locator(".guide-question img").count(), 0);
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /ainda não reconheci/,
    );
    await ask("Posso baixar música do YouTube?");
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /não converte nem baixa/,
    );
    await ask("Como importo uma imagem?");
    await page.screenshot({ path: "/workspace/work/guide-desktop.png" });
    await page.setViewportSize({ width: 360, height: 740 });
    await ask("Como crio pastas?");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      360,
    );
    await page.screenshot({ path: "/workspace/work/guide-mobile.png" });
    // Mudar de app atualiza só o nome do contexto; não lê documentos.
    await guide
      .getByRole("button", { name: "Limpar conversa", exact: true })
      .click();
    assert.equal(await log.locator(".guide-question").count(), 0);
    assert.equal(await log.locator(".guide-answer").count(), 1);
    await page
      .getByRole("button", { name: "Fechar Assistente IA", exact: true })
      .click();
    await page.locator('.desktop-app[data-app="gallery"]').click();
    await page
      .getByRole("button", { name: "Minimizar Galeria", exact: true })
      .click();
    await page.locator('.desktop-app[data-app="assistant"]').click();
    assert.match(
      await guide.locator(".guide-context").textContent(),
      /Galeria/,
    );
    await guide.locator(".guide-context").click();
    assert.match(
      await log.locator(".guide-answer").last().textContent(),
      /Importar imagens do PC/,
    );
    assert.deepEqual(network, []);
    assert.deepEqual(errors, []);
    console.log(
      "PASS guia: sugestões, perguntas, contexto, atalhos sem duplicar, informações do projeto, limites, texto seguro, conversa local, limpeza, reabertura e mobile.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
