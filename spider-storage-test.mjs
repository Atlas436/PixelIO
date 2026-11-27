import test from "node:test";
import assert from "node:assert/strict";
import { SpiderGame } from "./js/spider-rules.js";
import {
  spiderRecord,
  restoreSpiderRecord,
  maxSavedUndo,
} from "./js/spider-storage.js";
test("restaura jogo e desfazer nas três dificuldades", () => {
  for (const count of [1, 2, 4]) {
    const game = new SpiderGame(() => 0.4, count);
    game.deal();
    const restored = restoreSpiderRecord(spiderRecord(game));
    assert.ok(restored instanceof SpiderGame);
    assert.deepEqual(restored.snapshot(), game.snapshot());
    assert.equal(restored.score, game.score);
    restored.undo();
    game.undo();
    assert.deepEqual(restored.snapshot(), game.snapshot());
  }
});
test("valida o baralho e ignora históricos inválidos sem executar dados", () => {
  const source = spiderRecord(new SpiderGame(() => 0.2, 2));
  const corrupt = (fn) => {
    const record = structuredClone(source);
    fn(record);
    assert.equal(restoreSpiderRecord(record), null);
  };
  corrupt((r) => (r.version = 99));
  corrupt((r) => (r.state.moves = -1));
  corrupt((r) => (r.state.suitCount = 3));
  corrupt((r) => (r.state.columns[0][0].rank = "<script>"));
  corrupt((r) => (r.state.columns[0][0].id = r.state.columns[1][0].id));
  corrupt((r) => (r.state.columns[0].at(-1).faceUp = false));
  corrupt((r) => r.state.stock.pop());
  source.history = [null, {}, source.state];
  const restored = restoreSpiderRecord(source);
  assert.equal(restored.history.length, 1);
});
test("salvamento é uma cópia independente e limita o histórico persistido", () => {
  const game = new SpiderGame();
  game.history = Array.from({ length: maxSavedUndo + 5 }, () =>
    game.snapshot(),
  );
  const record = spiderRecord(game);
  assert.equal(record.history.length, maxSavedUndo);
  record.state.columns[0].pop();
  assert.equal(game.columns[0].length, 6);
  assert.equal(game.history.length, maxSavedUndo + 5);
});
