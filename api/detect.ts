import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { DetectionError } from '../server/errors';
import { createDeepSeekClient } from '../server/deepseek';
export { DetectionError } from '../server/errors';

type Config = { email?: string; key?: string; enabled: boolean; sandbox: boolean };
type ProviderResult = { modelVersion: string; summary: { ai: number; human: number }; results: unknown[]; scannedDocument?: { actualCredits?: number } };
const config = (env: NodeJS.ProcessEnv): Config => ({ email: env.COPYLEAKS_EMAIL?.trim(), key: env.COPYLEAKS_API_KEY?.trim(), enabled: env.DETECTION_ENABLED === 'true', sandbox: env.COPYLEAKS_SANDBOX !== 'false' });
export const isConfigured = (c: Config) => Boolean(c.enabled && c.email && c.key);

// One client per server instance, so concurrent requests share authentication.
export function createCopyleaksClient(fetcher: typeof fetch = fetch) {
  let cached: { token: string; expires: number; identity: string } | undefined;
  let pendingLogin: Promise<string> | undefined;
  let pendingIdentity: string | undefined;
  async function token(c: Config): Promise<string> {
    const identity = createHash('sha256').update(`${c.email}\n${c.key}`).digest('hex');
    if (cached?.identity === identity && cached.expires > Date.now()) return cached.token;
    if (pendingLogin && pendingIdentity === identity) return pendingLogin;
    pendingIdentity = identity;
    pendingLogin = (async () => {
      const response = await fetcher('https://id.copyleaks.com/v3/account/login/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: c.email, key: c.key }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new DetectionError(502, '検出サービスの認証に失敗しました。管理者にお問い合わせください。');
      const data = await response.json() as { access_token?: unknown; '.expires'?: string };
      if (typeof data.access_token !== 'string' || !data.access_token) throw new DetectionError(502, '検出サービスから有効な認証情報が返されませんでした。');
      const expires = data['.expires'] ? Date.parse(data['.expires']) - 300000 : Date.now() + 47 * 3600000;
      cached = { token: data.access_token, identity, expires: Number.isFinite(expires) ? expires : Date.now() + 3600000 };
      return data.access_token;
    })();
    try { return await pendingLogin; } finally { pendingLogin = undefined; pendingIdentity = undefined; }
  }
  return async (text: string, c: Config) => {
    if (!isConfigured(c)) throw new DetectionError(503, 'AI判定サービスはまだ利用できません。文章分析をご利用ください。');
    if (Array.from(text).length < 255 || Array.from(text.replace(/\s/gu, '')).length > 10000 || new TextEncoder().encode(text).length > 100000) throw new DetectionError(400, 'AI判定には255〜10,000文字の文章が必要です。');
    const accessToken = await token(c);
    const scanId = randomUUID();
    const response = await fetcher(`https://api.copyleaks.com/v2/writer-detector/${scanId}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ text, language: 'ja', sandbox: c.sandbox, explain: false, sensitivity: 2 }), signal: AbortSignal.timeout(45000) });
    // Do not automatically retry paid scans: a failed connection may already have consumed credits.
    if (response.status === 401) { cached = undefined; throw new DetectionError(502, '認証の有効期限が切れました。時間をおいて再度お試しください。'); }
    if (response.status === 429) throw new DetectionError(429, '検出サービスが混み合っています。時間をおいて再度お試しください。');
    if (response.status === 402 || response.status === 403) throw new DetectionError(503, '現在、検出サービスを利用できません。管理者にお問い合わせください。');
    if (response.status === 400) throw new DetectionError(400, '検出サービスが文章を受け付けませんでした。文章の長さや内容を確認してください。');
    if (!response.ok) throw new DetectionError(502, '検出サービスでエラーが発生しました。結果は取得できませんでした。');
    const data = await response.json() as ProviderResult;
    if (!data.summary || !Number.isFinite(data.summary.ai) || !Number.isFinite(data.summary.human) || data.summary.ai < 0 || data.summary.ai > 1 || data.summary.human < 0 || data.summary.human > 1 || !Array.isArray(data.results)) throw new DetectionError(502, '検出サービスからの結果を読み取れませんでした。');
    const sections = data.results.slice(0, 500).flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return [];
      const section = item as { classification?: unknown; probability?: unknown; matches?: { text?: { chars?: { starts?: number[]; lengths?: number[] } } }[] };
      if ((section.classification !== 1 && section.classification !== 2) || typeof section.probability !== 'number' || !Number.isFinite(section.probability) || section.probability < 0 || section.probability > 1) return [];
      const excerpts = (Array.isArray(section.matches) ? section.matches : []).slice(0, 500).flatMap(m => {
        const ranges = m?.text?.chars;
        if (!Array.isArray(ranges?.starts) || !Array.isArray(ranges?.lengths)) return [];
        return ranges.starts.slice(0, 500).flatMap((start, i) => {
          const length = ranges.lengths![i];
          if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 1 || start + length > text.length) return [];
          return [{ start, length, text: text.slice(start, start + length) }];
        });
      });
      return [{ classification: section.classification as 1 | 2, probability: section.probability, excerpts }];
    });
    return { provider: 'Copyleaks' as const, modelVersion: typeof data.modelVersion === 'string' ? data.modelVersion : 'unknown', sandbox: c.sandbox, ai: data.summary.ai, human: data.summary.human, sections, credits: typeof data.scannedDocument?.actualCredits === 'number' ? data.scannedDocument.actualCredits : null, scanId, analyzedAt: new Date().toISOString() };
  };
}
const detect = createCopyleaksClient();
const review = createDeepSeekClient();
const quota = new Map<string, { count: number; reset: number }>();
let daily = { count: 0, reset: Date.now() + 86400000 };
export async function handleDetection(req: IncomingMessage & { body?: unknown }, res: ServerResponse, env: NodeJS.ProcessEnv) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status: number, data: unknown) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  const c = config(env);
  const useDeepSeek = env.DETECTION_PROVIDER !== 'copyleaks';
  const configured = useDeepSeek ? Boolean(c.enabled && env.DEEPSEEK_API_KEY?.trim()) : isConfigured(c);
  if (req.method === 'GET') { send(200, { configured, provider: useDeepSeek ? 'DeepSeek' : 'Copyleaks', sandbox: useDeepSeek ? false : c.sandbox, minCharacters: useDeepSeek ? 100 : 255 }); return; }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); send(405, { error: 'Method not allowed' }); return; }
  if (!configured) { send(503, { error: 'AIサービスはまだ利用できません。文章分析をご利用ください。' }); return; }
  if (req.headers['sec-fetch-site'] === 'cross-site' || !req.headers['content-type']?.startsWith('application/json')) { send(403, { error: 'リクエストを受け付けられません。' }); return; }
  try {
    let body: unknown = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new DetectionError(400, '送信形式が正しくありません。'); } }
    if (!body) {
      const chunks: Buffer[] = []; let bytes = 0;
      for await (const chunk of req) { const b = Buffer.from(chunk); bytes += b.length; if (bytes > 100000) throw new DetectionError(413, '文章が長すぎます。'); chunks.push(b); }
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new DetectionError(400, '送信形式が正しくありません。'); }
    }
    if (!body || typeof body !== 'object' || !('text' in body) || typeof body.text !== 'string') throw new DetectionError(400, '文章を入力してください。');
    const origin = req.headers.origin;
    if (origin) { let host: string; try { host = new URL(origin).host; } catch { throw new DetectionError(403, '許可されていないアクセスです。'); } if (host !== req.headers.host) throw new DetectionError(403, '許可されていないアクセスです。'); }
    const now = Date.now();
    const ip = req.socket.remoteAddress ?? 'unknown'; // Never trust a client-supplied forwarding header locally.
    const identity = createHash('sha256').update(ip).digest('hex');
    for (const [key, value] of quota) if (value.reset < now) quota.delete(key);
    const entry = quota.get(identity) ?? { count: 0, reset: now + 3600000 };
    if (daily.reset < now) daily = { count: 0, reset: now + 86400000 };
    if (entry.count >= 5 || daily.count >= 50) throw new DetectionError(429, '利用上限に達しました。時間をおいて再度お試しください。');
    entry.count++; daily.count++; quota.set(identity, entry);
    send(200, useDeepSeek ? await review(body.text, env.DEEPSEEK_API_KEY?.trim(), env.DEEPSEEK_MODEL || 'deepseek-flash') : await detect(body.text, c));
  } catch (error) {
    if (error instanceof DetectionError) send(error.status, { error: error.message });
    else if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) send(504, { error: '検出サービスへの接続がタイムアウトしました。結果は取得できませんでした。' });
    else send(502, { error: '検出サービスと通信できませんでした。結果は取得できませんでした。' });
  }
}
export default function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  return handleDetection(req, res, process.env);
}
