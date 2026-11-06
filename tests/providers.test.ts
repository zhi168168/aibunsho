import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeepSeekClient, normalizeReview } from '../server/deepseek';
import { createCopyleaksClient, DetectionError, handleDetection } from '../api/detect';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { modelReport } from '../src/lib/model';
const text = '日本語の文章を確認します。'.repeat(30);
const dimensions = ['structure', 'expression', 'specificity', 'consistency'].map(id => ({ id, score: 50, explanation: '文章の特徴には別の解釈もあり、AI使用は証明できません。' }));
const validReview = { score: null, assessment: 'uncertain', genre: 'general', summary: '定型的な表現がありますが、AI利用は断定できません。', dimensions, limitations: ['文体だけでは作成方法を特定できません。'], observations: [{ text: '日本語の文章を確認します。', reason: '同じ表現が繰り返されています。', direction: 'supports', dimension: 'structure' }, { text: '原文にない引用です。', reason: 'この引用は除外されます。', direction: 'counter', dimension: 'specificity' }] };
const completion = (content: unknown, finish_reason = 'stop') => new Response(JSON.stringify({ model: 'deepseek-flash', choices: [{ finish_reason, message: { content: JSON.stringify(content) } }] }), { status: 200 });

test('brief reasons require a dimension backed by a verified source quote', () => {
  const result = normalizeReview({...validReview, briefReasons:[
    {dimension:'structure',text:'同じ説明が繰り返されています。'},
    {dimension:'specificity',text:'この根拠の原文引用は存在しません。'},
    {dimension:'unknown',text:'不明な観点です。'},
    {dimension:'structure',text:'長'.repeat(91)},
  ]}, text);
  assert.deepEqual(result.briefReasons,[{dimension:'structure',text:'同じ説明が繰り返されています。'}]);
});

test('API status reads the supplied current configuration without exposing credentials', async () => {
  const env: NodeJS.ProcessEnv = { DETECTION_PROVIDER: 'deepseek', DETECTION_ENABLED: 'false' };
  const server = createServer((req, res) => { void handleDetection(req, res, env); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/api/detect`;
    assert.equal((await (await fetch(url)).json()).configured, false);
    env.DEEPSEEK_API_KEY = 'unit-test-private-key';
    env.DETECTION_ENABLED = 'true';
    const response = await (await fetch(url)).text();
    assert.equal(JSON.parse(response).configured, true);
    assert.equal(response.includes('unit-test-private-key'), false);
    env.DEEPSEEK_API_KEY = '';
    assert.equal((await (await fetch(url)).json()).configured, false);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('DeepSeek requests JSON and returns only excerpts present in the actual input', async () => {
  let calls = 0;
  const client = createDeepSeekClient((async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.response_format.type, 'json_object');
    assert.equal(body.thinking.type, 'disabled');
    const payload = JSON.parse(body.messages[1].content);
    assert.equal(payload.text, text);
    assert.equal('measurements' in payload, false);
    assert.deepEqual(Object.keys(payload).sort(), ['task', 'text']);
    assert.equal(body.messages.length, 2);
    return completion(validReview);
  }) as typeof fetch);
  const result = await client(text, 'unit-test-key');
  assert.equal(calls, 1);
  assert.equal(result.score, null);
  assert.equal(result.observations.length, 1);
  assert.equal(result.provider, 'DeepSeek');
  assert.ok(modelReport(result).includes('AIが書いた確率ではありません'));
});
test('DeepSeek rejects malformed and truncated outputs', async () => {
  for (const content of [{ ...validReview, score: 101 }, { ...validReview, score: '50' }, { ...validReview, assessment: 'human' }, null]) {
    const client = createDeepSeekClient((async () => completion(content)) as typeof fetch);
    await assert.rejects(() => client(text, 'unit-test-key'), DetectionError);
  }
  const client = createDeepSeekClient((async () => completion(validReview, 'length')) as typeof fetch);
  await assert.rejects(() => client(text, 'unit-test-key'), DetectionError);
});
test('DeepSeek rejects missing credentials and short text without sending a request', async () => {
  let called = false;
  const client = createDeepSeekClient((async () => { called = true; return completion(validReview); }) as typeof fetch);
  await assert.rejects(() => client(text), DetectionError);
  await assert.rejects(() => client('短い', 'unit-test-key'), DetectionError);
  await assert.rejects(() => client('。'.repeat(150), 'unit-test-key'), e => e instanceof DetectionError && e.status === 400);
  assert.equal(called, false);
});
test('upstream failures are sanitized and paid calls are never automatically retried', async () => {
  for (const status of [401, 402, 429, 500]) {
    let calls = 0;
    const client = createDeepSeekClient((async () => { calls++; return new Response('private provider diagnostics', { status }); }) as typeof fetch);
    await assert.rejects(() => client(text, 'unit-test-key'), e => e instanceof DetectionError && !e.message.includes('private'));
    assert.equal(calls, 1);
  }
});
test('Copyleaks reuses authentication and retains the real sandbox flag', async () => {
  let logins = 0; let scans = 0;
  const client = createCopyleaksClient((async (url, init) => {
    if (String(url).includes('login/api')) { logins++; return Response.json({ access_token: 'unit-test-token' }); }
    scans++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.language, 'ja');
    assert.equal(body.sandbox, true);
    assert.equal(body.explain, false);
    return Response.json({ modelVersion: 'test', summary: { ai: 0.8, human: 0.2 }, results: [{ classification: 2, probability: 0.9, matches: [{ text: { chars: { starts: [0], lengths: [10] } } }] }] });
  }) as typeof fetch);
  const config = { enabled: true, email: 'unit-test@example.invalid', key: 'unit-test-key', sandbox: true };
  const first = await client(text, config);
  await client(text, config);
  assert.equal(logins, 1); assert.equal(scans, 2);
  assert.equal(first.sandbox, true);
  assert.equal(first.sections[0].excerpts[0].text, text.slice(0, 10));
  assert.ok(modelReport(first).includes('実際の文章の判定ではありません'));
});

const evidenceText = '人工知能は現代社会に大きな変化をもたらしています。多様な分野で業務の効率化と新たな価値の創造が進んでいます。利用にあたっては倫理や情報保護についても慎重な検討が必要です。'.repeat(5);
const strongReview = { ...validReview, score: 78, assessment: 'many_patterns', observations: [
  { text: '人工知能は現代社会に大きな変化をもたらしています。', reason: '同じ主張が繰り返されます。', direction: 'supports', dimension: 'structure' },
  { text: '多様な分野で業務の効率化と新たな価値の創造が進んでいます。', reason: '同じ抽象的な表現が反復されています。', direction: 'supports', dimension: 'expression' },
] };

test('enhanced review requires independent source-backed evidence for a strong score', () => {
  assert.equal(normalizeReview(strongReview, evidenceText).score, 78);
  const duplicate = { ...strongReview, observations: [strongReview.observations[0], strongReview.observations[0]] };
  assert.equal(normalizeReview(duplicate, evidenceText).score, null);
  const unsupported = { ...strongReview, observations: strongReview.observations.map(o => ({ ...o, text: '存在しない引用をモデルが生成しました。' })) };
  assert.equal(normalizeReview(unsupported, evidenceText).assessment, 'uncertain');
});

test('conflicting evidence and short inputs withhold a strong headline score', () => {
  const conflicting = { ...strongReview, observations: [...strongReview.observations, { text: '利用にあたっては倫理や情報保護についても慎重な検討が必要です。', reason: 'ジャンルで通常の表現とも解釈できます。', direction: 'counter', dimension: 'specificity' }] };
  const result = normalizeReview(conflicting, evidenceText);
  assert.equal(result.score, null);
  assert.equal(result.assessment, 'uncertain');
  assert.ok(modelReport({ provider: 'DeepSeek', modelVersion: 'test', sandbox: false, ...result, scanId: 'test', analyzedAt: new Date().toISOString() }).includes('算出を保留'));
  assert.equal(normalizeReview(strongReview, evidenceText.slice(0, 180)).score, null);
});

test('dimensions must be complete, unique, and bounded; malformed successful completions do not retry', async () => {
  for (const changes of [{ dimensions: dimensions.slice(0, 3) }, { dimensions: Array(4).fill(dimensions[0]) }, { dimensions: dimensions.map(d => ({ ...d, score: 101 })) }, { genre: 'certainly_human' }]) {
    let calls = 0;
    const client = createDeepSeekClient((async () => { calls++; return completion({ ...validReview, ...changes }); }) as typeof fetch);
    await assert.rejects(() => client(text, 'unit-test-key'), DetectionError);
    assert.equal(calls, 1);
  }
});

test('overlapping quote fragments cannot manufacture multiple independent findings', () => {
  const fragment = evidenceText.slice(8, 45);
  const second = evidenceText.slice(25, 60);
  const result = normalizeReview({ ...strongReview, observations: [
    { ...strongReview.observations[0], text: fragment },
    { ...strongReview.observations[1], text: second },
  ] }, evidenceText);
  assert.equal(result.observations.length, 1);
  assert.equal(result.score, null);
});
