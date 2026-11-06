import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLetter, typedLetter, nextEmptyIndex } from '../site/input.js';

test('cleanLetter lowercases', () => assert.equal(cleanLetter('A'), 'a'));
test('cleanLetter strips accents', () => assert.equal(cleanLetter('à'), 'a'));
test('cleanLetter keeps the last typed letter', () => assert.equal(cleanLetter('ab'), 'b'));
test('cleanLetter ignores non-letters', () => assert.equal(cleanLetter('1'), ''));
test('cleanLetter skips a trailing space from the keyboard', () => assert.equal(cleanLetter('a '), 'a'));
test('cleanLetter accepts an empty value', () => assert.equal(cleanLetter(''), ''));

test('typedLetter prefers the inserted character over the cell value', () => {
  assert.equal(typedLetter('o', 'ot'), 'o');
});

test('typedLetter falls back to the value when there is no inserted text', () => {
  assert.equal(typedLetter(null, ''), '');
  assert.equal(typedLetter(null, 'T'), 't');
});

test('nextEmptyIndex finds the next empty cell after the current one', () => {
  assert.equal(nextEmptyIndex(['a', '', 'c', ''], 2), 3);
});

test('nextEmptyIndex wraps around to earlier empty cells', () => {
  assert.equal(nextEmptyIndex(['', 'b', 'c', 'd'], 3), 0);
});

test('nextEmptyIndex returns -1 on a full grid', () => {
  assert.equal(nextEmptyIndex(['a', 'b'], 1), -1);
});
