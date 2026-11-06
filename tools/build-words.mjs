import { readFileSync, writeFileSync } from 'node:fs';
import { buildLines } from './lexicon-filter.mjs';

const [source, correctionsPath] = process.argv.slice(2);
if (!source) {
  console.error('Uso: node tools/build-words.mjs <morph-it.txt> [corrections.json]');
  process.exit(2);
}

const rows = readFileSync(source, 'latin1')
  .split(/\r?\n/)
  .map((line) => line.split('\t'))
  .filter((row) => row.length === 3);

const corrections = correctionsPath
  ? JSON.parse(readFileSync(correctionsPath, 'utf8'))
  : undefined;

const output = `${buildLines(rows, corrections).join('\n')}\n`;
writeFileSync(new URL('../site/words.txt', import.meta.url), output, 'utf8');
console.log(`${output.trimEnd().split('\n').length} righe, ${Buffer.byteLength(output)} byte`);
