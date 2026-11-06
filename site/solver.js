const MIN_LENGTH = 4;
const GRID_SIZE = 7;
const DICTIONARY_BASE = 'https://dizionari.corriere.it/dizionario_italiano';

export function normalize(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function maskOf(norm) {
  let mask = 0;
  for (let i = 0; i < norm.length; i++) {
    mask |= 1 << (norm.charCodeAt(i) - 97);
  }
  return mask;
}

function makeWord(display, lemma = display) {
  const norm = normalize(display);
  return { display, norm, mask: maskOf(norm), lemma };
}

export function parseWords(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [display, lemma] = line.split('\t');
      return makeWord(display, lemma);
    });
}

export function applyCorrections(words, corrections) {
  const rejected = new Set(corrections.rejected);
  const kept = words.filter((w) => !rejected.has(w.norm));
  const known = new Set(kept.map((w) => w.norm));
  const added = corrections.added
    .map((display) => makeWord(display))
    .filter((w) => !known.has(w.norm));
  return [...kept, ...added];
}

export function gridError(letters, center) {
  const filled = letters.filter(Boolean);
  if (filled.length < GRID_SIZE) return 'incompleta';
  if (new Set(filled).size < GRID_SIZE) return 'doppie';
  if (!filled.includes(center)) return 'centrale';
  return null;
}

const byItalianOrder = (a, b) => a.norm.localeCompare(b.norm, 'it');

export function solve(words, letters, center) {
  const gridMask = maskOf(letters.join(''));
  const centerBit = maskOf(center);
  const found = words
    .filter((w) => w.norm.length >= MIN_LENGTH && (w.mask & ~gridMask) === 0 && (w.mask & centerBit) !== 0)
    .sort(byItalianOrder);

  const groups = new Map();
  for (const word of found) {
    const length = word.norm.length;
    if (!groups.has(length)) groups.set(length, []);
    groups.get(length).push(word);
  }

  return {
    total: found.length,
    apegrammi: found.filter((w) => w.mask === gridMask),
    byLength: [...groups.entries()].sort(([a], [b]) => a - b),
  };
}

export function dictionaryUrl(word) {
  const page = normalize(word.lemma);
  return `${DICTIONARY_BASE}/${page[0].toUpperCase()}/${page}.shtml`;
}
