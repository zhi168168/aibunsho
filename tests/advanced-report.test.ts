import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportUnits, advancedReportText } from '../src/lib/advanced-report';
import { createAdvancedClient, normalizeAdvanced } from '../server/advanced-report';
import { DetectionError } from '../server/errors';

const text = '昨日、駅前の図書館で地域の歴史を調べました。古い新聞の地図と現在の道路を見比べると、川の流れが変わったことに気づきました。'.repeat(3) + '\n\n' + '調査の結果をまとめるには、まず新聞の発行年と地図の作成時期を確認する必要があります。出典が異なる資料をそのまま比較しないようにしたいと思います。';
const units = reportUnits(text);
const value = { summary: '資料の比較を説明する文章です。', strengths: ['調査の目的が述べられています。'], priorities: ['時期と資料を照合してください。'], limitations: ['出典の確認は行っていません。'], sections: units.map(u => ({ id: u.id, status: 'revise', quote: u.text.slice(0, 24), finding: '根拠の確認方法を具体化できます。', suggestion: '比較した資料と年代を明示してください。', rewrite: '比較した資料の年代を確認します。' })) };
const completion = (v: unknown, finish_reason = 'stop') => Response.json({ model: 'deepseek-flash', choices: [{ finish_reason, message: { content: JSON.stringify(v) } }] });

test('report units cover long and numerous paragraphs without dropping Unicode content', () => {
  for (const input of [text, '😀文章。'.repeat(1800), Array.from({ length: 200 }, (_, i) => `段落${i}です。`).join('\r\n \r\n')]) {
    const parts = reportUnits(input);
    assert.ok(parts.length > 0 && parts.length <= 16);
    assert.equal(parts.map(p => p.text).join('').replace(/\s/gu, ''), input.replace(/\s/gu, ''));
    assert.ok(parts.every(p => input.includes(p.text)), 'sections must be contiguous exact substrings of the input');
    assert.equal(parts.some(p => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(p.text)), false);
  }
});

test('advanced review marks missing, duplicate or fabricated quotations unreviewed', () => {
  const result = normalizeAdvanced({ ...value, sections: [{ ...value.sections[0], quote: '原文にはない根拠を生成しました。' }, value.sections[1]] }, units);
  assert.equal(result.sections.length, units.length);
  assert.equal(result.sections[0].status, 'unreviewed');
  assert.equal(result.sections[0].rewrite, '');
  assert.equal(result.sections[1].status, 'revise');
  assert.ok(result.limitations[0].includes('完了していません'));
  assert.throws(() => normalizeAdvanced({ ...value, sections: [] }, units), DetectionError);
  assert.throws(() => normalizeAdvanced({ ...value, sections: [value.sections[0], value.sections[0]] }, units), DetectionError);
  assert.throws(() => normalizeAdvanced({ ...value, sections: [{ ...value.sections[0], id: 999 }] }, units), DetectionError);
});

test('quotes must belong to their own section and keep sections cannot supply rewrites', () => {
  const result = normalizeAdvanced({ ...value, sections: [{ ...value.sections[0], quote: units[1].text.slice(0, 24) }, { ...value.sections[1], status: 'keep' }] }, units);
  assert.equal(result.sections[0].status, 'unreviewed');
  assert.equal(result.sections[1].status, 'keep');
  assert.equal(result.sections[1].rewrite, '');
  assert.deepEqual(result.priorities, [], 'unverified and keep sections cannot become revision priorities');
});

test('advanced generation makes one explicit call, retains source and exports real full report', async () => {
  let calls = 0;
  const client = createAdvancedClient((async (_url, init) => {
    calls++;
    const request = JSON.parse(String(init?.body));
    const payload = JSON.parse(request.messages[1].content);
    assert.deepEqual(payload.units, units);
    assert.deepEqual(Object.keys(payload), ['units']);
    assert.equal(request.thinking.type, 'disabled');
    assert.equal(request.response_format.type, 'json_object');
    return completion(value);
  }) as typeof fetch);
  const report = await client(text, 'unit-test-key');
  assert.equal(calls, 1);
  assert.equal(report.sourceText, text);
  assert.equal(report.analysis.signals.length, 8);
  const exported = advancedReportText(report);
  for (const snippet of [text, '確認箇所 1', '確認箇所 2', value.summary, value.sections[0].rewrite, '事実', 'AI生成確率']) assert.ok(exported.includes(snippet), snippet);
});

test('advanced generation rejects invalid inputs before charge and truncated outputs without retry', async () => {
  let calls = 0;
  const client = createAdvancedClient((async () => { calls++; return completion(value, 'length'); }) as typeof fetch);
  await assert.rejects(() => client(text), DetectionError);
  await assert.rejects(() => client('。'.repeat(200), 'unit-test-key'), DetectionError);
  await assert.rejects(() => client('文'.repeat(10001), 'unit-test-key'), DetectionError);
  assert.equal(calls, 0);
  await assert.rejects(() => client(text, 'unit-test-key'), DetectionError);
  assert.equal(calls, 1);
  for (const status of [401, 402, 429, 500]) {
    let count = 0;
    const failing = createAdvancedClient((async () => { count++; return new Response('private diagnostics', { status }); }) as typeof fetch);
    await assert.rejects(() => failing(text, 'unit-test-key'), e => e instanceof DetectionError && !e.message.includes('private'));
    assert.equal(count, 1);
  }
});
