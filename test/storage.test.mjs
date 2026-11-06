import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../site/storage.js';
import { parseWords, applyCorrections, maskOf } from '../site/solver.js';

function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
}

const gridA = ['a', 'c', 'e', 'i', 'n', 'r', 't'];
const gridB = ['a', 'c', 'e', 'i', 'n', 'r', 'o'];
const emptyGrid = ['', '', '', '', '', '', ''];
const noCorrections = { rejected: [], added: [] };

test('starts empty when reading storage throws', () => {
  const store = createStore({ getItem() { throw new Error('blocked'); }, setItem() {} });
  assert.deepEqual(store.getGrid(), emptyGrid);
  assert.deepEqual(store.getCorrections(), noCorrections);
});

test('starts empty when stored JSON is corrupt', () => {
  const store = createStore(memory({
    'apegramma.state.v1': '{broken',
    'apegramma.corrections.v1': '[1]',
  }));
  assert.deepEqual(store.getGrid(), emptyGrid);
  assert.deepEqual(store.getCorrections(), noCorrections);
});

test('survives a failing write', () => {
  const store = createStore({ getItem: () => null, setItem() { throw new Error('full'); } });
  store.setGrid(gridA);
  store.toggleStruck('tiara');
  assert.equal(store.isStruck('tiara'), true);
});

test('state persists across store instances', () => {
  const backend = memory();
  const first = createStore(backend);
  first.setGrid(gridA);
  first.toggleStruck('tiara');
  const second = createStore(backend);
  assert.deepEqual(second.getGrid(), gridA);
  assert.equal(second.isStruck('tiara'), true);
});

test('struck words survive a temporarily incomplete grid', () => {
  const store = createStore(memory());
  store.setGrid(gridA);
  store.toggleStruck('tiara');
  store.setGrid(['a', '', 'e', 'i', 'n', 'r', 't']);
  store.setGrid(gridA);
  assert.equal(store.isStruck('tiara'), true);
});

test('struck words reset with a different complete grid', () => {
  const store = createStore(memory());
  store.setGrid(gridA);
  store.toggleStruck('tiara');
  store.setGrid(gridB);
  assert.equal(store.isStruck('tiara'), false);
});

test('toggleStruck restores a struck word', () => {
  const store = createStore(memory());
  store.toggleStruck('tiara');
  store.toggleStruck('tiara');
  assert.equal(store.isStruck('tiara'), false);
});

test('add moves a word out of rejected', () => {
  const store = createStore(memory());
  store.reject('tiara');
  assert.equal(store.add('Tiara'), 'ok');
  assert.deepEqual(store.getCorrections(), { rejected: [], added: ['tiara'] });
});

test('reject moves a word out of added', () => {
  const store = createStore(memory());
  store.add('tiara');
  store.reject('tiara');
  assert.deepEqual(store.getCorrections(), { rejected: ['tiara'], added: [] });
});

test('add refuses short words', () => {
  assert.equal(createStore(memory()).add('tre'), 'corta');
});

test('add refuses non-letters', () => {
  assert.equal(createStore(memory()).add('ab1c'), 'invalida');
});

test('add keeps the accent', () => {
  const store = createStore(memory());
  store.add('Carità');
  assert.deepEqual(store.getCorrections().added, ['carità']);
});

test('removeCorrection clears both lists', () => {
  const store = createStore(memory());
  store.add('tiara');
  store.reject('cantina');
  store.removeCorrection('tiara');
  store.removeCorrection('cantina');
  assert.deepEqual(store.getCorrections(), noCorrections);
});

for (const bad of ['{"x":1}', 'non json', '{"rejected":[1],"added":[]}']) {
  test(`importCorrections refuses ${bad}`, () => {
    const store = createStore(memory());
    store.add('tiara');
    assert.equal(store.importCorrections(bad), false);
    assert.deepEqual(store.getCorrections().added, ['tiara']);
  });
}

test('an exported file reimports without duplicates', () => {
  const store = createStore(memory());
  store.add('tiara');
  store.reject('cantina');
  assert.equal(store.importCorrections(store.exportCorrections()), true);
  assert.deepEqual(store.getCorrections(), { rejected: ['cantina'], added: ['tiara'] });
});

test('applyCorrections removes rejected and adds new words once', () => {
  const words = parseWords('tiara\ncantina');
  const out = applyCorrections(words, { rejected: ['cantina'], added: ['tiara', 'carità'] });
  assert.deepEqual(out.map((w) => w.norm), ['tiara', 'carita']);
  assert.equal(out[1].mask, maskOf('carita'));
});

test('struck words survive a duplicate-letter typo', () => {
  const store = createStore(memory());
  store.setGrid(gridA);
  store.toggleStruck('tiara');
  store.setGrid(['a', 'c', 'e', 'i', 'n', 'r', 'a']);
  store.setGrid(gridA);
  assert.equal(store.isStruck('tiara'), true);
});
