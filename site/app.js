import { applyCorrections, gridError, parseWords, solve } from './solver.js';
import { cleanLetter } from './input.js';
import { createStore } from './storage.js';

const CENTER_INDEX = 3;
const GRID_MESSAGES = {
  incompleta: 'Inserisci le 7 lettere',
  doppie: 'Ci sono lettere doppie',
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

let lexicon = null;
let cells = [];

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
  store.toggleStruck(button.dataset.norm);
  render();
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
document.querySelector('main').addEventListener('click', onWordClick);
statusEl.textContent = 'Carico le parole…';
loadLexicon();
