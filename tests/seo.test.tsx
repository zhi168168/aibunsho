import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { faqs } from '../src/components/Content';
import { siteMetadata } from '../scripts/seo';

test('initial HTML exposes the tool, policies, valid anchors and matching FAQ schema', () => {
  const html = renderToStaticMarkup(<App />);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /<h1>.*AIチェッカー/);
  assert.match(html, /id="analysis-modes"/);
  assert.match(html, /id="privacy"/);
  assert.match(html, /DeepSeek/);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(anchor), `Missing #${anchor}`);
  const raw = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
  assert.ok(raw);
  const faq = JSON.parse(raw).find((entry: Record<string, unknown>) => entry['@type'] === 'FAQPage');
  assert.deepEqual(faq.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => [q.name, q.acceptedAnswer.text]), faqs);
  for (const [question, answer] of faqs) { assert.ok(html.includes(question)); assert.ok(html.includes(answer)); }
});

test('production URL signals agree and share image has explicit dimensions', () => {
  const result = siteMetadata('https://ai.example');
  assert.match(result.head, /rel="canonical" href="https:\/\/ai.example\/"/);
  assert.match(result.head, /property="og:url" content="https:\/\/ai.example\/"/);
  assert.match(result.head, /ai-checker-og.png/);
  assert.match(result.head, /og:image:width" content="1200"/);
  assert.match(result.sitemap!, /<loc>https:\/\/ai.example\/<\/loc>/);
  assert.match(result.robots, /Sitemap: https:\/\/ai.example\/sitemap.xml/);
});

test('missing domain never fabricates canonical; invalid origins fail the build', () => {
  assert.equal(siteMetadata().head, '');
  assert.equal(siteMetadata().sitemap, null);
  for (const value of ['http://ai.example', 'https://ai.example/path', 'https://name:secret@ai.example', 'https://ai.example?x=1', 'https://ai.example/#x']) assert.throws(() => siteMetadata(value));
});
