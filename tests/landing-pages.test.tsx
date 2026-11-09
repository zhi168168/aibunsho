import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { InformationPage } from '../src/pages';
import { landingPages } from '../src/landing-content';

test('each search landing exposes the real tool before its unique explanatory content and matching FAQ', () => {
  for (const page of landingPages) {
    const html = renderToStaticMarkup(<InformationPage path={page.path}/>);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    assert.equal(html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1].replace(/<[^>]+>/g, ''), page.heading);
    assert.ok(html.includes('id="check-text"'));
    assert.ok(html.includes(page.action));
    if (page.intent === 'support') {
      assert.ok(html.indexOf('id="topic-1"') < html.indexOf('id="checker"'));
      assert.ok(html.indexOf('id="explanation-draft"') < html.indexOf('id="checker"'));
      assert.ok(html.includes('まずは、この3つから'));
    } else assert.ok(html.indexOf('id="checker"') < html.indexOf('id="topic-1"'));
    assert.ok(html.includes('id="pricing"'), 'Shared account and pricing dialogs must exist');
    assert.doesNotMatch(html, /準備中/);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(id), `Missing ${page.path}#${id}`);
    for (const { reading } of page.sections) if (reading) {
      assert.ok(landingPages.some(other => other.path === reading.href));
      assert.ok(html.includes(`href="${reading.href}"`));
    }
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
    assert.deepEqual(schema.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => [item.name, item.acceptedAnswer.text]), page.faqs);
    assert.ok(page.sections.length >= 5);
    assert.ok(page.sections.every(section => !landingPages.some(other => other.path !== page.path && other.sections.some(item => item.heading === section.heading))));
  }
});

test('guide and contextual article links expose descriptive anchors in the initial HTML', () => {
  const guide = renderToStaticMarkup(<InformationPage path="/ai-checker/guide/"/>);
  const anchors: string[] = [];
  for (const page of landingPages) {
    assert.ok(guide.includes(`href="${page.path}"`));
    const html = renderToStaticMarkup(<InformationPage path={page.path}/>);
    const readings = page.sections.flatMap(section => section.reading ? [section.reading] : []);
    assert.equal(readings.length, 2, 'Two contextual recommendations per page');
    assert.equal(new Set(readings.map(link => link.href)).size, 2);
    for (const link of readings) {
      assert.ok(html.includes(`<a href="${link.href}">${link.label}</a>`));
      assert.ok(link.href !== page.path);
      assert.ok(!anchors.includes(link.label), 'Use context-specific anchor text');
      anchors.push(link.label);
    }
    assert.match(html, /class="landing-closing"[\s\S]*?href="\/#checker"/);
    assert.ok(!html.includes('class="landing-related"'), 'No repeated bottom link list');
  }
});
