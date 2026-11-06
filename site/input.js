import { normalize } from './solver.js';

export function cleanLetter(raw) {
  const letters = normalize(raw).replace(/[^a-z]/g, '');
  return letters.slice(-1);
}

export function typedLetter(data, value) {
  return cleanLetter(data ?? value);
}

export function nextEmptyIndex(values, from) {
  const after = values.findIndex((value, index) => index > from && !value);
  return after === -1 ? values.findIndex((value) => !value) : after;
}
