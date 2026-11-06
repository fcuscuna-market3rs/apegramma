import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowed, buildLines } from '../tools/lexicon-filter.mjs';

const allowed = [
  ['tiara', 'tiara', 'NOUN-F:s'], ['case', 'casa', 'NOUN-F:p'], ['irta', 'irto', 'ADJ:pos+f+s'],
  ['amare', 'amare', 'VER:inf+pres'], ['amata', 'amare', 'VER:part+past+s+f'],
  ['essere', 'essere', 'AUX:inf+pres'], ['potere', 'potere', 'MOD:inf+pres'],
  ['fatto', 'fare', 'CAU:part+past+s+m'], ['cinque', 'cinque', 'DET-NUM-CARD'],
  ['lentamente', 'lentamente', 'ADV'], ['carità', 'carità', 'NOUN-F:s'],
];

const refused = [
  ['amo', 'amare', 'VER:ind+pres+1+s'], ['amando', 'amare', 'VER:ger+pres'],
  ['amante', 'amare', 'VER:part+pres+s+m'], ['amarlo', 'amare', 'VER:inf+pres+lo'],
  ['abbacchiar', 'abbacchiare', 'VER:inf+pres'], ['bellissimo', 'bello', 'ADJ:sup+m+s'],
  ['fastidiosetto', 'fastidioso', 'ADJ:dim+m+s'], ['dalla', 'dalla', 'ARTPRE-F:s'],
  ['Roma', 'Roma', 'NPR'], ['tre', 'tre', 'DET-NUM-CARD'], ["citta'", 'citta', 'NOUN-F:s'],
];

for (const row of allowed) {
  test(`isAllowed keeps ${row[0]}`, () => assert.equal(isAllowed(...row), true));
}

for (const row of refused) {
  test(`isAllowed refuses ${row[0]}`, () => assert.equal(isAllowed(...row), false));
}

const lines = buildLines([
  ['citta', 'citta', 'NOUN-F:s'], ['città', 'città', 'NOUN-F:s'],
  ['amati', 'amare', 'VER:part+past+p+m'], ['amati', 'amato', 'NOUN-M:p'],
  ['zzzz', 'zzzz', 'NOUN-M:s'], ['abcdefghi', 'abcdefghi', 'NOUN-M:s'],
], { rejected: ['zzzz'], added: ['nuova'] });

test('buildLines prefers the accented form', () => {
  assert.ok(lines.includes('città'));
  assert.ok(!lines.includes('citta'));
});

test('buildLines prefers a noun lemma over a verb lemma', () => {
  assert.ok(lines.includes('amati\tamato'));
});

test('buildLines drops rejected words', () => {
  assert.ok(!lines.includes('zzzz'));
});

test('buildLines drops words with more than 7 distinct letters', () => {
  assert.ok(!lines.includes('abcdefghi'));
});

test('buildLines includes added words', () => {
  assert.ok(lines.includes('nuova'));
});

test('buildLines prefers a lemma equal to the form', () => {
  const out = buildLines([
    ['amare', 'amaro', 'ADJ:pos+f+p'], ['amare', 'amare', 'VER:inf+pres'],
  ]);
  assert.deepEqual(out, ['amare']);
});
