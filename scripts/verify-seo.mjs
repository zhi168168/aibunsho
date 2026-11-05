import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const paths = ['/', '/ai-checker/guide/', '/privacy/'];
const results = [];
for (const path of paths) {
  const html = readFileSync(`dist${path}index.html`, 'utf8');
  const description = html.match(/name="description" content="([^"]*)"/)[1];
  const weightedLength = [...description].reduce((n, char) => n + (/[^\x00-\x7f]/.test(char) ? 2 : 1), 0);
  assert.ok(weightedLength <= 160, `${path} description exceeds 160 weighted characters`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="https://aibunsho.com${path}"`));
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `Missing ${path}#${id}`);
  const internalLinks = [...html.matchAll(/href="(\/(?!\/)[^"]*)"/g)].map(match => match[1]).filter(href => !href.includes('.'));
  for (const href of internalLinks) {
    const [target, anchor] = href.split('#');
    assert.ok(paths.includes(target), `Missing page ${target}`);
    if (anchor) assert.ok(readFileSync(`dist${target}index.html`, 'utf8').includes(`id="${anchor}"`));
  }
  const text = html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  results.push({ path, title: html.match(/<title>(.*?)<\/title>/)[1], description, weightedDescriptionLength: weightedLength, textCharacters: [...text].length, htmlBytes: Buffer.byteLength(html), crossPageLinks: internalLinks.length });
}
console.log(JSON.stringify(results, null, 2));
