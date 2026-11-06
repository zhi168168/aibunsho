import { advancedReportPrompt } from './prompts.js';
import { randomUUID } from 'node:crypto';
import { analyzeText } from '../src/lib/analyzer.js';
import { reportUnits, type AdvancedReport, type ParagraphReview, type ReportUnit } from '../src/lib/advanced-report.js';
import { DetectionError } from './errors.js';

export function normalizeAdvanced(value: unknown, units: ReportUnit[]) {
  const invalid = () => new DetectionError(502, '詳細レポートの形式が正しくありません。再試行は自動では行いません。');
  if (!value || typeof value !== 'object') throw invalid();
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== 'string' || !v.summary.trim() || !Array.isArray(v.sections) || v.sections.length > 32) throw invalid();
  const list = (x: unknown) => Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && Boolean(s.trim())).slice(0, 4).map(s => s.slice(0, 400)) : [];
  const sections: ParagraphReview[] = units.map(unit => {
    const matches = (v.sections as unknown[]).filter(item => item && typeof item === 'object' && (item as Record<string, unknown>).id === unit.id);
    const s = matches[0] as Record<string, unknown> | undefined;
    if (matches.length !== 1 || !s || !['keep', 'revise', 'uncertain'].includes(String(s.status)) || typeof s.quote !== 'string' || s.quote.trim().length < 4 || s.quote.length > 500 || !unit.text.includes(s.quote) || typeof s.finding !== 'string' || !s.finding.trim() || typeof s.suggestion !== 'string' || !s.suggestion.trim() || typeof s.rewrite !== 'string') {
      return { ...unit, status: 'unreviewed', quote: '', finding: '有効な原文引用を伴うレビューを取得できませんでした。この区分は評価していません。', suggestion: '', rewrite: '' };
    }
    return { ...unit, status: s.status as ParagraphReview['status'], quote: s.quote, finding: s.finding.slice(0, 600), suggestion: s.suggestion.slice(0, 600), rewrite: s.status === 'revise' ? s.rewrite.slice(0, 600) : '' };
  });
  if (!sections.some(s => s.status !== 'unreviewed')) throw invalid();
  const limitations = list(v.limitations);
  limitations.push('原文の引用一致は確認していますが、解釈や書き換えの正しさを保証するものではありません。');
  limitations.push('事実確認・出典との照合・盗作検査は実施していません。');
  if (sections.some(s => s.status === 'unreviewed')) limitations.unshift('未取得の区分があります。全文のレビューは完了していません。');
  // Use the validated sentence reviews so the overview cannot contradict a keep verdict.
  const priorities = sections.filter(s => s.status === 'revise' || s.status === 'uncertain').slice(0, 3)
    .map(s => `「${s.quote}」：${s.suggestion}`);
  return { summary: v.summary.slice(0, 1200), strengths: list(v.strengths), priorities, limitations, sections };
}

export function createAdvancedClient(fetcher: typeof fetch = fetch) {
  return async (text: string, key?: string, model = 'deepseek-flash'): Promise<AdvancedReport> => {
    if (!key) throw new DetectionError(503, '詳細レポートは現在利用できません。');
    const length = Array.from(text.replace(/\s/gu, '')).length;
    if (length < 100 || length > 10000 || new TextEncoder().encode(text).length > 100000 || !/[\p{L}\p{N}]/u.test(text)) throw new DetectionError(400, '100〜10,000文字の文章を入力してください。');
    const analysis = analyzeText(text), units = reportUnits(text);
    const response = await fetcher('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: advancedReportPrompt }, { role: 'user', content: JSON.stringify({ units }) }], response_format: { type: 'json_object' }, thinking: { type: 'disabled' }, temperature: 0, max_tokens: 10000, stream: false }), signal: AbortSignal.timeout(50000) });
    // One explicit generation, never automatic paid retries.
    if (response.status === 429) throw new DetectionError(429, '混み合っています。時間をおいて再度お試しください。');
    if ([401, 402, 403].includes(response.status)) throw new DetectionError(503, '詳細レポートの提供元を現在利用できません。');
    if (!response.ok) throw new DetectionError(502, '詳細レポートを取得できませんでした。');
    const data = await response.json() as { model?: string; choices?: { finish_reason?: string; message?: { content?: string } }[] };
    const choice = data.choices?.[0];
    if (choice?.finish_reason !== 'stop' || !choice.message?.content || choice.message.content.length > 60000) throw new DetectionError(502, '詳細レポートを最後まで取得できませんでした。自動再試行は行いません。');
    let value: unknown;
    try { value = JSON.parse(choice.message.content); } catch { throw new DetectionError(502, '詳細レポートを読み取れませんでした。'); }
    return { kind: 'advanced', version: 'advanced-report-1.0', provider: 'DeepSeek', modelVersion: typeof data.model === 'string' ? data.model : model, scanId: randomUUID(), analyzedAt: new Date().toISOString(), sourceText: text, analysis, ...normalizeAdvanced(value, units) };
  };
}
