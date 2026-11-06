import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, maskOf, parseWords, gridError, solve, dictionaryUrl } from '../site/solver.js';

const letters = ['a', 'c', 'e', 'i', 'n', 'r', 't'];
const words = parseWords('tir\ncena\ncitra\ntiara\ntiare\ntinta\ncantiere\nzitta\ncarità\ncerti\tcerto');
const result = solve(words, letters, 'i');
const found = result.byLength.flatMap(([, list]) => list.map((w) => w.norm));

test('normalize lowercases and strips accents', () => {
  assert.equal(normalize('Carità'), 'carita');
});

test('maskOf ignores repeated letters', () => {
  assert.equal(maskOf('aba'), maskOf('ab'));
});

test('gridError reports an incomplete grid', () => {
  assert.equal(gridError(['a', 'c', 'e'], 'a'), 'incompleta');
});

test('gridError reports duplicate letters', () => {
  assert.equal(gridError(['a', 'a', 'e', 'i', 'n', 'r', 't'], 'a'), 'doppie');
});

test('gridError reports a center outside the grid', () => {
  assert.equal(gridError(letters, 'z'), 'centrale');
});

test('gridError accepts a valid grid', () => {
  assert.equal(gridError(letters, 'i'), null);
});

test('solve excludes words shorter than 4 letters', () => {
  assert.ok(!found.includes('tir'));
});

test('solve excludes words without the center letter', () => {
  assert.ok(!found.includes('cena'));
});

test('solve excludes words with letters outside the grid', () => {
  assert.ok(!found.includes('zitta'));
});

test('solve keeps words with repeated letters', () => {
  assert.ok(found.includes('tinta'));
});

test('solve keeps 4-letter words', () => {
  const short = solve(parseWords('tira'), letters, 'i');
  assert.equal(short.total, 1);
});

test('solve identifies apegrammi', () => {
  assert.deepEqual(result.apegrammi.map((w) => w.norm), ['cantiere']);
});

test('apegramma may be longer than 7 letters', () => {
  const long = solve(parseWords('intrecciare'), letters, 'i');
  assert.deepEqual(long.apegrammi.map((w) => w.norm), ['intrecciare']);
});

test('byLength is sorted by length then alphabetically', () => {
  assert.deepEqual(result.byLength.map(([n]) => n), [5, 6, 8]);
  assert.deepEqual(result.byLength[0][1].map((w) => w.norm), ['certi', 'citra', 'tiara', 'tiare', 'tinta']);
});

test('total counts every word found', () => {
  assert.equal(result.total, found.length);
});

test('parseWords keeps the accented display form', () => {
  assert.equal(words.find((w) => w.norm === 'carita').display, 'carità');
});

test('dictionaryUrl uses the lemma', () => {
  assert.equal(
    dictionaryUrl(words.find((w) => w.norm === 'certi')),
    'https://dizionari.corriere.it/dizionario_italiano/C/certo.shtml',
  );
});
