import { SpiderGame, suits, isSequence } from "./spider-rules.js";
export const maxSavedUndo = 100;
let database;
function openDatabase() {
  return (database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("pixel-oi-spider", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("games", { keyPath: "id" });
    request.onerror = () =>
      reject(new Error("Não foi possível abrir o salvamento local."));
    request.onblocked = () =>
      reject(
        new Error("Feche outras abas do Pixel.OI para liberar o salvamento."),
      );
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = null;
      };
      resolve(db);
    };
  }).catch((error) => {
    database = null;
    throw error;
  }));
}
async function operation(mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("games", mode),
      request = action(transaction.objectStore("games"));
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () =>
      reject(
        new Error(
          transaction.error?.name === "QuotaExceededError"
            ? "O espaço deste navegador está cheio."
            : "O navegador não conseguiu salvar a partida.",
        ),
      );
  });
}
export const loadSpiderRecord = () =>
  operation("readonly", (store) => store.get("current"));
export const saveSpiderRecord = (record) =>
  operation("readwrite", (store) => store.put(record));
export function spiderRecord(game) {
  return {
    id: "current",
    version: 1,
    state: game.snapshot(),
    history: structuredClone(game.history.slice(-maxSavedUndo)),
  };
}
function validState(state) {
  if (
    !state ||
    ![1, 2, 4].includes(state.suitCount) ||
    !Number.isSafeInteger(state.moves) ||
    state.moves < 0
  )
    return false;
  if (
    !Array.isArray(state.columns) ||
    state.columns.length !== 10 ||
    !state.columns.every(Array.isArray) ||
    !Array.isArray(state.stock) ||
    state.stock.length > 50 ||
    state.stock.length % 10 ||
    !Array.isArray(state.completed) ||
    state.completed.length > 8 ||
    !state.completed.every(Array.isArray)
  )
    return false;
  const cards = [
    ...state.columns.flat(),
    ...state.stock,
    ...state.completed.flat(),
  ];
  if (cards.length !== 104) return false;
  const ids = new Set(),
    selected = Object.keys(suits).slice(0, state.suitCount);
  for (const card of cards) {
    if (
      !card ||
      !Number.isInteger(card.id) ||
      card.id < 0 ||
      card.id >= 104 ||
      ids.has(card.id) ||
      card.rank !== (card.id % 13) + 1 ||
      card.suit !== selected[Math.floor(card.id / 13) % state.suitCount] ||
      typeof card.faceUp !== "boolean"
    )
      return false;
    ids.add(card.id);
  }
  if (state.stock.some((card) => card.faceUp)) return false;
  if (
    state.columns.some((column) => {
      if (column.length && !column.at(-1).faceUp) return true;
      const first = column.findIndex((card) => card.faceUp);
      return first >= 0 && column.slice(first).some((card) => !card.faceUp);
    })
  )
    return false;
  return state.completed.every(
    (column) =>
      column.length === 13 && column[0].rank === 13 && isSequence(column, 0),
  );
}
export function restoreSpiderRecord(record) {
  if (record?.version !== 1 || !validState(record.state)) return null;
  const game = Object.create(SpiderGame.prototype);
  const { columns, stock, completed, moves, suitCount } = structuredClone(
    record.state,
  );
  Object.assign(game, { columns, stock, completed, moves, suitCount });
  game.history = Array.isArray(record.history)
    ? record.history
        .slice(-maxSavedUndo)
        .filter((state) => state?.suitCount === suitCount && validState(state))
        .map((state) => {
          const { columns, stock, completed, moves, suitCount } =
            structuredClone(state);
          return { columns, stock, completed, moves, suitCount };
        })
    : [];
  return game;
}
