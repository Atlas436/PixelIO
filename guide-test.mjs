import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuideAnswer,
  guideForApp,
  welcomeQuestions,
} from "./js/guide-knowledge.js";
import { apps } from "./js/app-catalog.js";
import { isPendingApp } from "./js/pixel-language.js";
test("guia explica tarefas sem inventar funcionalidades", () => {
  const cases = [
    ["Onde ficou minha nota?", "storage"],
    ["Como exporto uma nota?", "note-export"],
    ["Como insiro imagens nas notas?", "app-notes"],
    ["Como importo uma imagem?", "app-gallery"],
    ["Como apago uma imagem?", "image-delete"],
    ["Como crio pastas?", "app-files"],
    ["Como mostro a barra de tarefas?", "app-settings"],
    ["Quais são os comandos pixel?", "app-terminal"],
    ["Quem criou o projeto?", "app-about"],
    ["Qual a inspiração do projeto?", "app-about"],
    ["O artigo está pronto?", "article"],
    ["Quais apps faltam?", "pending"],
    ["Posso baixar música do YouTube?", "music-download"],
    ["Como salvo minha partida?", "game-save"],
    ["O som está mudo", "sound"],
    ["O que é o Pixel Studio?", "app-studio"],
    ["Você é uma IA?", "app-assistant"],
    ["Qual é a versão?", "version"],
    ["Como fechar uma janela?", "windows"],
    ["Como redimensionar?", "windows"],
    ["Como mover uma janela?", "windows"],
    ["pixel abrir musica", "open"],
  ];
  for (const [q, id] of cases) assert.equal(getGuideAnswer(q).id, id, q);
  assert.match(
    getGuideAnswer("Como salvo minha partida?").text,
    /recarregar ou sair da página perde o progresso/,
  );
  assert.match(
    getGuideAnswer("Quem criou o projeto?").text,
    /Julia, Lais, Geovanna/,
  );
  assert.match(
    getGuideAnswer("Onde ficou minha nota?").text,
    /não consegue recuperá-los/,
  );
  assert.match(
    getGuideAnswer("Posso baixar música do YouTube?").text,
    /não converte nem baixa/,
  );
});
test("contexto é opcional e perguntas fora do assunto têm alternativa", () => {
  assert.equal(getGuideAnswer("me ajuda", "notes").id, "app-notes");
  assert.equal(getGuideAnswer("O que posso fazer aqui?", "notes").id, "intro");
  assert.equal(
    getGuideAnswer("previsão do tempo amanhã", "notes").id,
    "unknown",
  );
  assert.equal(getGuideAnswer("<script>alert(1)</script>").id, "unknown");
  assert.equal(getGuideAnswer("").id, "empty");
  for (const app of apps) {
    assert.ok(guideForApp(app.id));
    for (const id of guideForApp(app.id).appIds)
      assert.ok(apps.some((a) => a.id === id));
  }
  for (const q of welcomeQuestions)
    assert.notEqual(getGuideAnswer(q).id, "unknown");
  assert.equal(isPendingApp({ id: "assistant" }), false);
  assert.equal(isPendingApp({ id: "studio" }), true);
});
