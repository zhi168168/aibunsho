import type { Analysis } from './analyzer';

export type ReportUnit = { id: number; text: string };
export type ParagraphReview = ReportUnit & {
  status: 'keep' | 'revise' | 'uncertain' | 'unreviewed';
  quote: string; finding: string; suggestion: string; rewrite: string;
};
export type AdvancedReport = {
  kind: 'advanced'; version: 'advanced-report-1.0'; provider: 'DeepSeek'; modelVersion: string;
  scanId: string; analyzedAt: string; sourceText: string; summary: string;
  strengths: string[]; priorities: string[]; limitations: string[];
  sections: ParagraphReview[]; analysis: Analysis;
};

// Retain every nonempty paragraph. Long paragraphs are split; many small ones are grouped.
// IDs are assigned by the server, never invented by the reviewer.
export function reportUnits(text: string): ReportUnit[] {
  const paragraphs = text.split(/(\n\s*\n)/u);
  const parts: string[] = [];
  for (let p = 0; p < paragraphs.length; p += 2) {
    const chars = Array.from(paragraphs[p] + (paragraphs[p + 1] ?? '')), chunks: string[] = [];
    for (let i = 0; i < chars.length; i += 800) chunks.push(chars.slice(i, i + 800).join(''));
    parts.push(...chunks);
  }
  const group = Math.max(1, Math.ceil(parts.length / 16));
  const units: ReportUnit[] = [];
  for (let i = 0; i < parts.length; i += group) {
    const section = parts.slice(i, i + group).join('').trim();
    if (section) units.push({ id: units.length + 1, text: section });
  }
  return units;
}

export const sectionLabels = { keep: '維持できる点', revise: '見直し候補', uncertain: '文脈の確認が必要', unreviewed: 'レビュー未取得' };
export function advancedReportText(report: AdvancedReport) {
  return ['AIチェッカー｜詳細レポート', `作成日時：${new Date(report.analyzedAt).toLocaleString('ja-JP')}`, `提供元：${report.provider} / ${report.modelVersion}`, `方式：${report.version} / ${report.analysis.version}`, `レポートID：${report.scanId}`,
    '文体の補助レビューです。AI生成確率・執筆者の証明・盗作検査ではありません。', '', '【総評】', report.summary,
    '', '【維持したい点】', ...report.strengths, '', '【優先して確認する点】', ...report.priorities,
    '', '【統計的な観測】', ...report.analysis.signals.map(s => `${s.name}：${s.available ? `${s.value}/100` : '算出不可'}\n${s.detail}`),
    '', `【区分別レビュー：${report.sections.filter(s => s.status !== 'unreviewed').length}/${report.sections.length}件】`,
    ...report.sections.flatMap(s => [`\n区分 ${s.id}｜${sectionLabels[s.status]}`, `原文：${s.text}`, s.quote ? `根拠の引用：${s.quote}` : '', s.finding, s.suggestion ? `確認・改善案：${s.suggestion}` : '', s.rewrite ? `引用部分の書き換え例（未適用）：${s.rewrite}` : '']),
    '', '【限界・注意点】', ...report.limitations, ...report.analysis.cautions,
    '書き換え例は提案です。意味・数値・引用・固有名詞を原文と照合してください。低いスコアを目指すための修正ではありません。',
    '', '【入力原文（全文）】', report.sourceText].filter(s => s !== '').join('\n');
}
