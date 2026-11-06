import { applyCorrections, dictionaryUrl, gridError, normalize, parseWords, solve } from './solver.js';
import { cleanLetter } from './input.js';
import { createStore } from './storage.js';

const CENTER_INDEX = 3;
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;
const GRID_MESSAGES = {
  incompleta: 'Inserisci le 7 lettere',
  doppie: 'Ci sono lettere doppie',
};
const ADD_MESSAGES = {
  ok: 'Parola aggiunta',
  corta: 'Servono almeno 4 lettere',
  invalida: 'Usa solo lettere',
};

const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem() {} };
  }
};

const store = createStore(safeStorage());
const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const apegrammiEl = document.getElementById('apegrammi');
const wordsEl = document.getElementById('words');
const menu = document.getElementById('word-menu');
const messageEl = document.getElementById('corrections-message');

let lexicon = null;
let cells = [];
let shownWords = new Map();
let menuWord = null;
let press = null;
let ignoreNextClick = false;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function wordButton(word) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'word';
  button.textContent = word.display;
  button.dataset.norm = word.norm;
  button.setAttribute('aria-pressed', String(store.isStruck(word.norm)));
  return button;
}

function fillList(list, words) {
  list.replaceChildren(...words.map(wordButton));
}

function countStruck(groups) {
  return groups.flatMap(([, words]) => words).filter((w) => store.isStruck(w.norm)).length;
}

function renderStatus(result) {
  const parts = [
    plural(result.total, 'parola', 'parole'),
    plural(result.apegrammi.length, 'apegramma', 'apegrammi'),
    plural(countStruck(result.byLength), 'barrata', 'barrate'),
  ];
  statusEl.textContent = parts.join(' · ');
}

function renderResult(result) {
  apegrammiEl.hidden = result.apegrammi.length === 0;
  fillList(apegrammiEl.querySelector('.list'), result.apegrammi);
  wordsEl.replaceChildren(...result.byLength.flatMap(([length, words]) => {
    const heading = document.createElement('h3');
    heading.textContent = `${length} lettere`;
    const list = document.createElement('div');
    list.className = 'list';
    fillList(list, words);
    return [heading, list];
  }));
}

function clearResult() {
  apegrammiEl.hidden = true;
  wordsEl.replaceChildren();
}

function render() {
  if (!lexicon) return;
  const letters = store.getGrid();
  const center = letters[CENTER_INDEX];
  const error = gridError(letters, center);
  if (error) {
    statusEl.textContent = GRID_MESSAGES[error];
    clearResult();
    return;
  }
  const words = applyCorrections(lexicon, store.getCorrections());
  const result = solve(words, letters, center);
  shownWords = new Map(words.map((w) => [w.norm, w]));
  renderStatus(result);
  renderResult(result);
}

function focusNext(from) {
  const next = cells.slice(from + 1).find((cell) => !cell.value)
    ?? cells.find((cell) => !cell.value);
  next?.focus();
}

function saveGrid() {
  store.setGrid(cells.map((cell) => cell.value));
  render();
}

function onCellInput(event) {
  const cell = event.target;
  const index = cells.indexOf(cell);
  cell.value = cleanLetter(cell.value);
  saveGrid();
  if (cell.value) focusNext(index);
}

function onCellBeforeInput(event) {
  const cell = event.target;
  if (event.inputType !== 'deleteContentBackward' || cell.value) return;
  const previous = cells[cells.indexOf(cell) - 1];
  if (!previous) return;
  event.preventDefault();
  previous.value = '';
  previous.focus();
  saveGrid();
}

function buildGrid() {
  cells = store.getGrid().map((letter, index) => {
    const cell = document.createElement('input');
    cell.value = letter;
    cell.type = 'text';
    cell.inputMode = 'text';
    cell.autocomplete = 'off';
    cell.setAttribute('autocapitalize', 'none');
    cell.setAttribute('autocorrect', 'off');
    cell.spellcheck = false;
    cell.setAttribute('aria-label', index === CENTER_INDEX ? 'Lettera centrale' : `Lettera ${index + 1}`);
    if (index === CENTER_INDEX) cell.classList.add('center');
    cell.addEventListener('input', onCellInput);
    cell.addEventListener('beforeinput', onCellBeforeInput);
    cell.addEventListener('focus', () => cell.select());
    return cell;
  });
  gridEl.replaceChildren(...cells);
}

function onWordClick(event) {
  const button = event.target.closest('.word');
  if (!button) return;
  if (ignoreNextClick) {
    ignoreNextClick = false;
    return;
  }
  store.toggleStruck(button.dataset.norm);
  render();
}

function openMenu(norm) {
  menuWord = shownWords.get(norm);
  if (!menuWord || menu.open) return;
  document.getElementById('menu-word').textContent = menuWord.display;
  document.getElementById('menu-dictionary').href = dictionaryUrl(menuWord);
  menu.showModal();
}

function cancelPress() {
  if (press) clearTimeout(press.timer);
  press = null;
}

function onPointerDown(event) {
  ignoreNextClick = false;
  cancelPress();
  const button = event.target.closest('.word');
  if (!button || event.button !== 0) return;
  press = {
    x: event.clientX,
    y: event.clientY,
    timer: setTimeout(() => {
      press = null;
      ignoreNextClick = true;
      openMenu(button.dataset.norm);
    }, LONG_PRESS_MS),
  };
}

function onPointerMove(event) {
  if (!press) return;
  const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
  if (distance > MOVE_TOLERANCE_PX) cancelPress();
}

function onContextMenu(event) {
  const button = event.target.closest('.word');
  if (!button) return;
  event.preventDefault();
  cancelPress();
  ignoreNextClick = true;
  openMenu(button.dataset.norm);
}

function renderCorrections() {
  const { rejected, added } = store.getCorrections();
  const total = rejected.length + added.length;
  const items = [
    ...added.map((word) => [word, 'aggiunta']),
    ...rejected.map((word) => [word, 'rifiutata']),
  ].map(([word, kind]) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    const tag = document.createElement('small');
    const undo = document.createElement('button');
    label.textContent = `${word} `;
    tag.textContent = kind;
    label.append(tag);
    undo.type = 'button';
    undo.textContent = 'Annulla';
    undo.addEventListener('click', () => {
      store.removeCorrection(normalize(word));
      refresh();
    });
    item.append(label, undo);
    return item;
  });
  document.getElementById('corrections-list').replaceChildren(...items);
  document.querySelector('#corrections summary').textContent = `Correzioni (${total})`;
}

function refresh() {
  renderCorrections();
  render();
}

function onAdd(event) {
  event.preventDefault();
  const field = document.getElementById('add-word');
  const outcome = store.add(field.value);
  messageEl.textContent = ADD_MESSAGES[outcome];
  if (outcome === 'ok') field.value = '';
  refresh();
}

function exportCorrections() {
  const blob = new Blob([store.exportCorrections()], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'apegramma-correzioni.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importCorrections(event) {
  const [file] = event.target.files;
  if (!file) return;
  const imported = store.importCorrections(await file.text());
  messageEl.textContent = imported ? 'Correzioni importate' : 'File non valido';
  event.target.value = '';
  refresh();
}

function bindEvents() {
  const main = document.querySelector('main');
  main.addEventListener('click', onWordClick);
  main.addEventListener('pointerdown', onPointerDown);
  main.addEventListener('pointermove', onPointerMove);
  main.addEventListener('pointerup', cancelPress);
  main.addEventListener('pointercancel', cancelPress);
  main.addEventListener('contextmenu', onContextMenu);

  document.getElementById('menu-close').addEventListener('click', () => menu.close());
  document.getElementById('menu-reject').addEventListener('click', () => {
    store.reject(menuWord.norm);
    menu.close();
    refresh();
  });
  document.getElementById('add-form').addEventListener('submit', onAdd);
  document.getElementById('export').addEventListener('click', exportCorrections);
  document.getElementById('import').addEventListener('change', importCorrections);
}

async function loadLexicon() {
  try {
    const response = await fetch('words.txt');
    if (!response.ok) throw new Error(String(response.status));
    lexicon = parseWords(await response.text());
    render();
  } catch {
    statusEl.textContent = 'Non riesco a caricare l’elenco delle parole';
  }
}

buildGrid();
bindEvents();
renderCorrections();
statusEl.textContent = 'Carico le parole…';
loadLexicon();
