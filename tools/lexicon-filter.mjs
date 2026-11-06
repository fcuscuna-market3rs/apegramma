import { normalize } from '../site/solver.js';

const MIN_LENGTH = 4;
const MAX_DISTINCT_LETTERS = 7;

const KEEP = /^(NOUN-[MF]:[sp]|ADJ:(pos|comp)\+[mf]\+[sp]|ADV|INT|DET-NUM-CARD|(VER|AUX|MOD|ASP|CAU):part\+past\+[sp]\+[mf])$/;
const INFINITIVE = /^(VER|AUX|MOD|ASP|CAU):inf\+pres$/;
const NOMINAL = /^(NOUN|ADJ)/;

export function isAllowed(form, lemma, tag) {
  if (!/^\p{Ll}+$/u.test(form)) return false;
  const norm = normalize(form);
  if (norm.length < MIN_LENGTH || !/^[a-z]+$/.test(norm)) return false;
  if (INFINITIVE.test(tag)) return form === lemma;
  return KEEP.test(tag);
}

const isAccented = (form) => form !== normalize(form);

function lemmaRank(form, lemma, nominal) {
  if (form === lemma) return 2;
  return nominal ? 1 : 0;
}

function merge(entries, form, lemma, nominal) {
  const norm = normalize(form);
  const rank = lemmaRank(form, lemma, nominal);
  const entry = entries.get(norm);
  if (!entry) {
    entries.set(norm, { display: form, lemma, rank });
  } else if (isAccented(form) && !isAccented(entry.display)) {
    Object.assign(entry, { display: form, lemma, rank });
  } else if (form === entry.display && rank > entry.rank) {
    Object.assign(entry, { lemma, rank });
  }
}

export function buildLines(rows, corrections = { rejected: [], added: [] }) {
  const entries = new Map();
  for (const [form, lemma, tag] of rows) {
    if (isAllowed(form, lemma, tag)) merge(entries, form, lemma, NOMINAL.test(tag));
  }
  for (const word of corrections.added) merge(entries, word, word, true);
  for (const word of corrections.rejected) entries.delete(normalize(word));

  return [...entries.entries()]
    .filter(([norm]) => new Set(norm).size <= MAX_DISTINCT_LETTERS)
    .sort(([a], [b]) => a.localeCompare(b, 'it'))
    .map(([, { display, lemma }]) => (lemma === display ? display : `${display}\t${lemma}`));
}
