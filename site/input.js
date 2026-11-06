import { normalize } from './solver.js';

export function cleanLetter(raw) {
  const letters = normalize(raw).replace(/[^a-z]/g, '');
  return letters.slice(-1);
}
