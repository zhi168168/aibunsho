import { reviewPrompt } from './prompts';
import { randomUUID } from 'node:crypto';
import { DetectionError } from './errors';
import { reviewDimensions, type DeepSeekResult, type ReviewDimension } from '../src/lib/model';
import { analyzeText } from '../src/lib/analyzer';



export function normalizeReview(value: unknown, text: string): Omit<DeepSeekResult, 'provider' | 'modelVersion' | 'sandbox' | 'scanId' | 'analyzedAt'> {
  const invalid = () => new DetectionError(502, 'AIレビューの形式が正しくありません。');
  if (!value || typeof value !== 'object') throw invalid();
  const v = value as Record<string, unknown>;
  const allowed = ['uncertain', 'few_patterns', 'mixed_patterns', 'many_patterns'];
  const genres = ['general', 'academic', 'business', 'creative', 'technical', 'list', 'mixed', 'unknown'];
  const validScore = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 100;
  if (!(v.score === null || validScore(v.score)) || typeof v.assessment !== 'string' || !allowed.includes(v.assessment) || typeof v.summary !== 'string' || !v.summary.trim() || typeof v.genre !== 'string' || !genres.includes(v.genre) || !Array.isArray(v.observations) || !Array.isArray(v.dimensions) || !Array.isArray(v.limitations)) throw invalid();
  const dimensions = v.dimensions.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw invalid();
    const d = item as Record<string, unknown>;
    if (!reviewDimensions.includes(d.id as ReviewDimension) || !validScore(d.score) || typeof d.explanation !== 'string' || !d.explanation.trim()) throw invalid();
    return { id: d.id as ReviewDimension, score: d.score, explanation: d.explanation.slice(0, 400) };
  });
  if (dimensions.length !== 4 || new Set(dimensions.map(d => d.id)).size !== 4) throw invalid();
  const seen = new Set<string>();
  const ranges: { start: number; end: number }[] = [];
  const observations: DeepSeekResult['observations'] = v.observations.slice(0, 6).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    if (typeof o.text !== 'string' || o.text.trim().length < 8 || o.text.length > 600 || !text.includes(o.text) || seen.has(o.text) || typeof o.reason !== 'string' || !o.reason.trim() || !['supports', 'counter', 'neutral'].includes(String(o.direction)) || !reviewDimensions.includes(o.dimension as ReviewDimension)) return [];
    // Overlapping quotes cannot manufacture independent evidence.
    const start = text.indexOf(o.text), end = start + o.text.length;
    if (ranges.some(range => start < range.end && end > range.start)) return [];
    ranges.push({ start, end });
    seen.add(o.text);
    return [{ text: o.text, reason: o.reason.slice(0, 400), direction: o.direction as 'supports' | 'counter' | 'neutral', dimension: o.dimension as ReviewDimension }];
  });
  const analysis = analyzeText(text);
  const limitations = v.limitations.filter((s): s is string => typeof s === 'string' && Boolean(s.trim())).slice(0, 4).map(s => s.slice(0, 300));
  limitations.push(...analysis.cautions);
  if (!limitations.length) limitations.push('文章の特徴だけでは、AI使用や執筆者を証明できません。');
  const support = observations.filter(o => o.direction === 'supports');
  const independent = new Set(support.map(o => o.dimension)).size;
  let assessment = v.assessment as DeepSeekResult['assessment'];
  let score = v.score as number | null;
  const conflicting = support.length > 0 && observations.some(o => o.direction === 'counter');
  if (analysis.limited || observations.length < 2 || new Set(observations.map(o => o.dimension)).size < 2 || score === null || assessment === 'uncertain' || (score >= 65 && (independent < 2 || conflicting)) || (assessment === 'many_patterns' && (score < 65 || independent < 2 || conflicting)) || (assessment === 'few_patterns' && score > 35)) {
    assessment = 'uncertain'; score = null;
    limitations.unshift('短さ・根拠不足・特徴の混在により、総合スコアの表示を保留しました。');
  }
  return { reviewVersion: 'evidence-review-2.0', genre: v.genre, score, assessment, summary: v.summary.slice(0, 1200), observations, dimensions, limitations: [...new Set(limitations)] };
}

export function createDeepSeekClient(fetcher: typeof fetch = fetch) {
  return async (text: string, key?: string, model = 'deepseek-flash'): Promise<DeepSeekResult> => {
    if (!key) throw new DetectionError(503, 'AIレビューはまだ利用できません。文章分析をご利用ください。');
    const length = Array.from(text.replace(/\s/gu, '')).length;
    if (length < 100 || length > 10000 || new TextEncoder().encode(text).length > 100000) throw new DetectionError(400, '100〜10,000文字で入力してください。');
    if (!/[\p{L}\p{N}]/u.test(text)) throw new DetectionError(400, '文章として読める文字を入力してください。');
    const response = await fetcher('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: reviewPrompt }, { role: 'user', content: JSON.stringify({ task: '本文を直接読み、AI生成に似た文体の特徴と別の解釈を比較してください。', text }) }], response_format: { type: 'json_object' }, thinking: { type: 'disabled' }, temperature: 0, max_tokens: 4000, stream: false }), signal: AbortSignal.timeout(45000) });
    // No retries: a timed-out completion may already have incurred a charge.
    if (response.status === 401) throw new DetectionError(502, 'AIレビューの認証に失敗しました。管理者にお問い合わせください。');
    if (response.status === 402 || response.status === 403) throw new DetectionError(503, '現在、AIレビューを利用できません。管理者にお問い合わせください。');
    if (response.status === 429) throw new DetectionError(429, 'AIレビューが混み合っています。時間をおいて再度お試しください。');
    if (!response.ok) throw new DetectionError(502, 'AIレビューでエラーが発生しました。結果は取得できませんでした。');
    const data = await response.json() as { choices?: { finish_reason?: string; message?: { content?: string } }[]; model?: string };
    const choice = data.choices?.[0];
    if (choice?.finish_reason !== 'stop' || !choice.message?.content || choice.message.content.length > 20000) throw new DetectionError(502, 'AIレビューを完了できませんでした。結果は表示されません。');
    let value: unknown;
    try { value = JSON.parse(choice.message.content); } catch { throw new DetectionError(502, 'AIレビューの結果を読み取れませんでした。'); }
    const normalized = normalizeReview(value, text);
    return { provider: 'DeepSeek', modelVersion: typeof data.model === 'string' ? data.model : model, sandbox: false, ...normalized, scanId: randomUUID(), analyzedAt: new Date().toISOString() };
  };
}
