import test from "node:test";
import assert from "node:assert/strict";
import { SpiderGame, isSequence } from "./js/spider-rules.js";

const card = (rank, faceUp = true, id = rank) => ({
  id,
  rank,
  suit: "spades",
  faceUp,
});
const fixture = () => {
  const game = new SpiderGame();
  game.columns = Array.from({ length: 10 }, () => []);
  game.stock = [];
  game.completed = [];
  game.moves = 0;
  game.history = [];
  return game;
};
function verifyDeck(game) {
  const all = [...game.stock, ...game.columns.flat(), ...game.completed.flat()];
  assert.equal(all.length, 104);
  assert.equal(new Set(all.map((card) => card.id)).size, 104);
  for (let rank = 1; rank <= 13; rank++)
    assert.equal(all.filter((card) => card.rank === rank).length, 8);
}

test("104 cartas, oito de cada valor, 54 na mesa e 50 no monte", () => {
  const game = new SpiderGame(() => 0.5);
  verifyDeck(game);
  assert.deepEqual(
    game.columns.map((column) => column.length),
    [6, 6, 6, 6, 5, 5, 5, 5, 5, 5],
  );
  assert.equal(game.columns.flat().filter((card) => card.faceUp).length, 10);
  assert.equal(game.stock.length, 50);
  assert(game.stock.every((card) => !card.faceUp));
});

test("somente sequências decrescentes descobertas podem se mover", () => {
  assert(isSequence([card(7), card(6), card(5)], 0));
  assert(!isSequence([card(7, false), card(6)], 0));
  assert(!isSequence([card(7), card(5)], 0));
  assert(!isSequence([card(7), { ...card(6), suit: "hearts" }], 0));
  assert(!isSequence([card(7)], -1));
  assert(!isSequence([], 0));
});

test("movimento válido revela a carta anterior; desfazer restaura também sua orientação", () => {
  const game = fixture();
  game.columns[0] = [card(10, false), card(7), card(6)];
  game.columns[1] = [card(8)];
  const before = game.snapshot();
  assert(game.move(0, 1, 1));
  assert.equal(game.columns[0][0].faceUp, true);
  assert.deepEqual(
    game.columns[1].map((c) => c.rank),
    [8, 7, 6],
  );
  assert.equal(game.moves, 1);
  assert(game.undo());
  assert.deepEqual(game.snapshot(), before);
  assert(!game.undo());
});

test("movimento inválido não altera partida, histórico nem pontuação", () => {
  const game = fixture();
  game.columns[0] = [card(7), card(5)];
  game.columns[1] = [card(8)];
  const before = game.snapshot();
  assert(!game.move(0, 0, 1));
  assert(!game.move(0, 1, 0));
  assert(!game.move(0, 1, 15));
  assert(!game.move(0, 0, 0));
  assert.deepEqual(game.snapshot(), before);
  assert.equal(game.history.length, 0);
});

test("qualquer sequência válida pode ocupar coluna vazia", () => {
  const game = fixture();
  game.columns[0] = [card(7), card(6)];
  assert(game.move(0, 0, 1));
  assert.equal(game.columns[0].length, 0);
});

test("colunas vazias impedem distribuição sem consumir cartas", () => {
  const game = new SpiderGame();
  game.columns[0] = [];
  const before = game.snapshot();
  assert(!game.deal());
  assert.match(game.dealError, /vazias/);
  assert.deepEqual(game.snapshot(), before);
});

test("distribui dez cartas e desfaz a fileira inteira", () => {
  const game = new SpiderGame();
  const before = game.snapshot();
  assert(game.deal());
  assert.equal(game.stock.length, 40);
  assert.deepEqual(
    game.columns.map((c) => c.length),
    [7, 7, 7, 7, 6, 6, 6, 6, 6, 6],
  );
  assert(game.columns.every((c) => c.at(-1).faceUp));
  verifyDeck(game);
  assert(game.undo());
  assert.deepEqual(game.snapshot(), before);
});

test("retira K até Ás, revela a carta abaixo e desfaz tudo atomicamente", () => {
  const game = fixture();
  game.columns[0] = [
    card(4, false),
    ...Array.from({ length: 12 }, (_, i) => card(13 - i)),
  ];
  game.columns[1] = [card(1)];
  const before = game.snapshot();
  assert(game.move(1, 0, 0));
  assert.equal(game.completed.length, 1);
  assert.equal(game.columns[0].length, 1);
  assert(game.columns[0][0].faceUp);
  assert.equal(game.score, 599);
  assert(game.undo());
  assert.deepEqual(game.snapshot(), before);
});

test("distribuição que completa uma sequência também é reversível", () => {
  const game = fixture();
  game.columns = Array.from({ length: 10 }, () => [card(4)]);
  game.columns[0] = Array.from({ length: 12 }, (_, i) => card(13 - i));
  game.stock = Array.from({ length: 9 }, () => card(9, false));
  game.stock.push(card(1, false));
  const before = game.snapshot();
  assert(game.deal());
  assert.equal(game.completed.length, 1);
  assert.equal(game.stock.length, 0);
  assert(game.undo());
  assert.deepEqual(game.snapshot(), before);
});

test("oitava sequência vence; desfazer permite continuar", () => {
  const game = fixture();
  game.completed = Array.from({ length: 7 }, () =>
    Array.from({ length: 13 }, (_, i) => card(13 - i)),
  );
  game.columns[0] = Array.from({ length: 12 }, (_, i) => card(13 - i));
  game.columns[1] = [card(1)];
  assert(game.move(1, 0, 0));
  assert(game.won);
  assert.equal(game.columns.flat().length, 0);
  assert(!game.deal());
  assert(!game.move(0, 0, 1));
  assert(game.undo());
  assert(!game.won);
});

test("dica retorna movimento válido e não altera o jogo", () => {
  const game = fixture();
  game.columns[0] = [card(9, false), card(7)];
  game.columns[1] = [card(8)];
  const before = game.snapshot();
  const hint = game.hint();
  assert(hint);
  assert(game.canMove(hint.from, hint.index, hint.to));
  assert.deepEqual(game.snapshot(), before);
  assert.equal(hint.to, 1);
});

test("conserva as 104 cartas ao longo de jogadas, distribuições e desfazer", () => {
  for (let seed = 1; seed <= 15; seed++) {
    let value = seed;
    const game = new SpiderGame(() => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    });
    for (let step = 0; step < 80 && !game.won; step++) {
      const hint = game.hint();
      if (step % 7 === 0 && !game.dealError) game.deal();
      else if (hint) game.move(hint.from, hint.index, hint.to);
      else if (!game.dealError) game.deal();
      else break;
      verifyDeck(game);
      if (step % 9 === 0) {
        game.undo();
        verifyDeck(game);
      }
    }
  }
});
