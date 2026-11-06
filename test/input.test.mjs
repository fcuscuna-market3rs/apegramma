import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLetter } from '../site/input.js';

test('cleanLetter lowercases', () => assert.equal(cleanLetter('A'), 'a'));
test('cleanLetter strips accents', () => assert.equal(cleanLetter('à'), 'a'));
test('cleanLetter keeps the last typed letter', () => assert.equal(cleanLetter('ab'), 'b'));
test('cleanLetter ignores non-letters', () => assert.equal(cleanLetter('1'), ''));
test('cleanLetter skips a trailing space from the keyboard', () => assert.equal(cleanLetter('a '), 'a'));
test('cleanLetter accepts an empty value', () => assert.equal(cleanLetter(''), ''));
