import { normalize } from './solver.js';

const STATE_KEY = 'apegramma.state.v1';
const CORRECTIONS_KEY = 'apegramma.corrections.v1';
const CENTER_INDEX = 3;
const MIN_LENGTH = 4;

const emptyGrid = () => Array(7).fill('');

function read(backend, key) {
  try {
    return JSON.parse(backend.getItem(key));
  } catch {
    return null;
  }
}

function write(backend, key, value) {
  try {
    backend.setItem(key, JSON.stringify(value));
  } catch {
    // Memoria piena o bloccata: l'app continua a funzionare per questa sessione.
  }
}

const isStringList = (value) => Array.isArray(value) && value.every((x) => typeof x === 'string');
const isCorrections = (value) => isStringList(value?.rejected) && isStringList(value?.added);

function gridKey(letters) {
  if (!letters.every(Boolean)) return null;
  const outer = letters.filter((_, i) => i !== CENTER_INDEX).sort();
  return `${letters[CENTER_INDEX]}:${outer.join('')}`;
}

export function createStore(backend) {
  const savedState = read(backend, STATE_KEY);
  const validState = isStringList(savedState?.letters) && savedState.letters.length === 7
    && isStringList(savedState.struck);
  const state = validState ? savedState : { letters: emptyGrid(), key: null, struck: [] };
  const struck = new Set(state.struck);
  const savedCorrections = read(backend, CORRECTIONS_KEY);
  const corrections = isCorrections(savedCorrections) ? savedCorrections : { rejected: [], added: [] };

  const saveState = () => write(backend, STATE_KEY, { ...state, struck: [...struck] });
  const saveCorrections = () => write(backend, CORRECTIONS_KEY, corrections);

  function dropCorrection(norm) {
    corrections.rejected = corrections.rejected.filter((w) => w !== norm);
    corrections.added = corrections.added.filter((w) => normalize(w) !== norm);
  }

  function addWord(word) {
    const clean = word.trim().toLowerCase();
    const norm = normalize(clean);
    if (!/^[a-z]+$/.test(norm)) return 'invalida';
    if (norm.length < MIN_LENGTH) return 'corta';
    dropCorrection(norm);
    corrections.added.push(clean);
    return 'ok';
  }

  function rejectWord(word) {
    const norm = normalize(word);
    dropCorrection(norm);
    corrections.rejected.push(norm);
  }

  return {
    getGrid: () => [...state.letters],

    setGrid(letters) {
      state.letters = [...letters];
      const key = gridKey(letters);
      if (key) {
        if (state.key && key !== state.key) struck.clear();
        state.key = key;
      }
      saveState();
    },

    isStruck: (norm) => struck.has(norm),

    toggleStruck(norm) {
      if (!struck.delete(norm)) struck.add(norm);
      saveState();
    },

    getCorrections: () => ({ rejected: [...corrections.rejected], added: [...corrections.added] }),

    reject(norm) {
      rejectWord(norm);
      saveCorrections();
    },

    add(word) {
      const outcome = addWord(word);
      if (outcome === 'ok') saveCorrections();
      return outcome;
    },

    removeCorrection(norm) {
      dropCorrection(norm);
      saveCorrections();
    },

    exportCorrections: () => JSON.stringify(corrections, null, 2),

    importCorrections(json) {
      let imported;
      try {
        imported = JSON.parse(json);
      } catch {
        return false;
      }
      if (!isCorrections(imported)) return false;
      imported.rejected.forEach(rejectWord);
      imported.added.forEach(addWord);
      saveCorrections();
      return true;
    },
  };
}
