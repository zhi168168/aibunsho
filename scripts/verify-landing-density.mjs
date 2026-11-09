import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Japanese character coverage, not an English word-frequency metric.
// Match only declared phrases after NFKC, case and whitespace normalization.
const targets = [
  { path: '/free/', keyword: 'aiチェッカー 無料', phrases: ['無料AIチェッカー', 'AIチェッカー無料'] },
  { path: '/hantei/', keyword: 'ai 文章 判定', phrases: ['AI文章判定'] },
  { path: '/kenshutsu/', keyword: 'ai検出ツール', phrases: ['AI検出ツール'] },
];
const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s/g, '');
const report = targets.map(({ path, keyword, phrases }) => {
  const html = readFileSync(`dist${path}index.html`, 'utf8');
  const main = html.match(/<main\b[^>]*data-keyword-content[^>]*>([\s\S]*?)<\/main>/)?.[1];
  assert.ok(main, `Missing main content: ${path}`);
  const text = normalize(main
    .replace(/<dialog\b[^>]*>[\s\S]*?<\/dialog>/g, '')
    .replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([\da-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, ''));
  const matches = [...text.matchAll(new RegExp(phrases.map(normalize).join('|'), 'g'))];
  const keywordCharacters = matches.reduce((n, match) => n + [...match[0]].length, 0);
  const characters = [...text].length;
  const density = keywordCharacters / characters * 100;
  assert.ok(density >= 3 && density <= 5, `${path} keyword character coverage ${density.toFixed(2)}% is outside 3–5%`);
  return { path, keyword, phrases, occurrences: matches.length, keywordCharacters, mainCharacters: characters, densityPercent: Number(density.toFixed(2)) };
});
console.log(JSON.stringify({ method: 'Japanese main-content keyword character coverage; NFKC/case/whitespace normalized; includes tool, TOC and FAQ; excludes navigation, footer, metadata, schema and closed account dialogs', pages: report }, null, 2));
