import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeepSeekClient } from '../server/deepseek';
import { createCopyleaksClient, DetectionError, handleDetection } from '../api/detect';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { modelReport } from '../src/lib/model';
const text = '日本語の文章を確認します。'.repeat(30);
const validReview = { score: 50, assessment: 'uncertain', summary: '定型的な表現がありますが、AI利用は断定できません。', observations: [{ text: '日本語の文章を確認します。', reason: '同じ表現が繰り返されています。' }, { text: '原文にない引用です。', reason: 'この引用は除外されます。' }] };
const completion = (content: unknown, finish_reason = 'stop') => new Response(JSON.stringify({ model: 'deepseek-flash', choices: [{ finish_reason, message: { content: JSON.stringify(content) } }] }), { status: 200 });

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
    assert.equal(JSON.parse(body.messages[1].content).text, text);
    return completion(validReview);
  }) as typeof fetch);
  const result = await client(text, 'unit-test-key');
  assert.equal(calls, 1);
  assert.equal(result.score, 50);
  assert.equal(result.observations.length, 1);
  assert.equal(result.provider, 'DeepSeek');
  assert.ok(modelReport(result).includes('AI生成確率や検出精度ではありません'));
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
