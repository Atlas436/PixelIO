export const suits = {
  spades: { name: "espadas", symbol: "♠", red: false },
  hearts: { name: "copas", symbol: "♥", red: true },
  diamonds: { name: "ouros", symbol: "♦", red: true },
  clubs: { name: "paus", symbol: "♣", red: false },
};
export const difficulties = [
  {
    count: 1,
    name: "Fácil",
    description: "Um naipe para começar.",
  },
  {
    count: 2,
    name: "Médio",
    description: "Dois naipes, novas escolhas.",
  },
  {
    count: 4,
    name: "Difícil",
    description: "Quatro naipes. O desafio completo.",
  },
];
export const rankName = (rank) =>
  ({ 1: "Ás", 11: "Valete", 12: "Rainha", 13: "Rei" })[rank] || String(rank);

export function isSequence(column, index) {
  if (!Number.isInteger(index) || index < 0 || index >= column.length)
    return false;
  return column
    .slice(index)
    .every(
      (card, offset, cards) =>
        card.faceUp &&
        (offset === 0 ||
          (cards[offset - 1].rank === card.rank + 1 &&
            cards[offset - 1].suit === card.suit)),
    );
}

export class SpiderGame {
  constructor(random = Math.random, suitCount = 1) {
    this.newGame(random, suitCount);
  }

  newGame(random = Math.random, suitCount = this.suitCount ?? 1) {
    if (![1, 2, 4].includes(suitCount))
      throw new RangeError("Escolha 1, 2 ou 4 naipes.");
    this.suitCount = suitCount;
    const selectedSuits = Object.keys(suits).slice(0, suitCount);
    const deck = Array.from({ length: 104 }, (_, id) => ({
      id,
      rank: (id % 13) + 1,
      suit: selectedSuits[Math.floor(id / 13) % suitCount],
      faceUp: false,
    }));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    this.columns = Array.from({ length: 10 }, (_, column) => {
      const cards = deck.splice(0, column < 4 ? 6 : 5);
      cards.at(-1).faceUp = true;
      return cards;
    });
    this.stock = deck;
    this.completed = [];
    this.moves = 0;
    this.history = [];
  }

  get won() {
    return this.completed.length === 8;
  }
  get score() {
    return 500 - this.moves + this.completed.length * 100;
  }

  snapshot() {
    return structuredClone({
      columns: this.columns,
      stock: this.stock,
      completed: this.completed,
      moves: this.moves,
      suitCount: this.suitCount,
    });
  }

  canMove(from, index, to) {
    if (this.won || from === to || !this.columns[from] || !this.columns[to])
      return false;
    if (!isSequence(this.columns[from], index)) return false;
    const target = this.columns[to].at(-1);
    return (
      !target ||
      (target.faceUp && target.rank === this.columns[from][index].rank + 1)
    );
  }

  move(from, index, to) {
    if (!this.canMove(from, index, to)) return false;
    this.history.push(this.snapshot());
    this.columns[to].push(...this.columns[from].splice(index));
    this.moves++;
    this.collectSequences();
    return true;
  }

  get dealError() {
    if (this.won) return "Você já completou esta partida!";
    if (this.stock.length < 10) return "Não há mais cartas para distribuir.";
    if (this.columns.some((column) => column.length === 0))
      return "Preencha todas as colunas vazias antes de distribuir.";
    return "";
  }

  deal() {
    if (this.dealError) return false;
    this.history.push(this.snapshot());
    for (const column of this.columns) {
      const card = this.stock.pop();
      card.faceUp = true;
      column.push(card);
    }
    this.moves++;
    this.collectSequences();
    return true;
  }

  collectSequences() {
    for (const column of this.columns) {
      // Uma retirada pode revelar outra sequência completa logo abaixo.
      while (column.length) {
        column.at(-1).faceUp = true;
        const index = column.length - 13;
        if (
          index < 0 ||
          column[index].rank !== 13 ||
          !isSequence(column, index)
        )
          break;
        this.completed.push(column.splice(index));
      }
    }
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return false;
    Object.assign(this, previous);
    return true;
  }

  hint() {
    const possibilities = [];
    for (let from = 0; from < 10; from++) {
      for (let index = 0; index < this.columns[from].length; index++) {
        for (let to = 0; to < 10; to++) {
          if (!this.canMove(from, index, to)) continue;
          // Mover uma coluna inteira para outra vazia apenas troca sua posição.
          if (index === 0 && !this.columns[to].length) continue;
          const reveals = index > 0 && !this.columns[from][index - 1].faceUp;
          const sameSuit =
            this.columns[to].at(-1)?.suit === this.columns[from][index].suit;
          possibilities.push({
            from,
            index,
            to,
            priority:
              (reveals ? 4 : 0) +
              (sameSuit ? 2 : 0) +
              (this.columns[to].length ? 1 : 0),
          });
        }
      }
    }
    return possibilities.sort((a, b) => b.priority - a.priority)[0] || null;
  }
}
