export type CopyleaksResult = {
  provider: 'Copyleaks'; modelVersion: string; sandbox: boolean; ai: number; human: number;
  sections: { classification: 1 | 2; probability: number; excerpts: { start: number; length: number; text: string }[] }[];
  credits: number | null; scanId: string; analyzedAt: string;
};
export const reviewDimensions = ['structure', 'expression', 'specificity', 'consistency'] as const;
export type ReviewDimension = typeof reviewDimensions[number];
export const dimensionNames: Record<ReviewDimension, string> = { structure: '同じ内容の繰り返し', expression: 'よくある言い回し', specificity: '具体的な説明の不足', consistency: '話のつながりの不自然さ' };
export const reviewConclusions = {
  uncertain: 'この文章だけでは、AI使用の有無を判断できません。',
  few_patterns: 'AI生成文に似た特徴は少なめです。',
  mixed_patterns: 'AI生成文に似た特徴が一部見られます。',
  many_patterns: 'AI生成文に似た特徴が複数見られます。',
};
export const observationLabels = { supports: '型どおりに見える箇所', counter: '別の読み方ができる箇所', neutral: '判断が分かれる箇所' };
export const reviewScoreNote = '数値が高いほど、繰り返しや説明不足など、型どおりに見える特徴が強いという評価です。文章の良し悪しや、AIが書いた確率を表すものではありません。';
export type DeepSeekResult = {
  provider: 'DeepSeek'; modelVersion: string; sandbox: false; score: number | null; reviewVersion: 'evidence-review-2.0'; genre: string; limitations: string[];
  dimensions: { id: ReviewDimension; score: number; explanation: string }[];
  assessment: 'uncertain' | 'few_patterns' | 'mixed_patterns' | 'many_patterns';
  summary: string; observations: { text: string; reason: string; direction: 'supports' | 'counter' | 'neutral'; dimension: ReviewDimension }[];
  briefReasons?: { dimension: ReviewDimension; text: string }[];
  scanId: string; analyzedAt: string;
};
export type ModelResult = CopyleaksResult | DeepSeekResult;
export type ServiceStatus = { configured: boolean; sandbox: boolean; provider: string; minCharacters: number };
export function freeReviewReasons(result: DeepSeekResult) {
  const reasons = result.briefReasons?.length ? result.briefReasons.map(r => ({ dimension: r.dimension, text: r.text })) : result.observations.map(o => ({ dimension: o.dimension, text: o.reason }));
  // Preserve an alternative reading rather than showing only suspicious features.
  const counterDimensions = new Set(result.observations.filter(o => o.direction === 'counter').map(o => o.dimension));
  const unique = reasons.filter((r, i) => reasons.findIndex(other => other.text === r.text) === i);
  const selected = unique.slice(0, 3);
  const counter = unique.find(r => counterDimensions.has(r.dimension));
  if (counter && !selected.includes(counter)) selected[selected.length - 1] = counter;
  return selected.map(r => r.text);
}
export function modelReport(result: ModelResult) {
  if (result.provider === 'DeepSeek') return ['AIチェッカー｜無料チェック結果', `AI文章の傾向（参考スコア）：${result.score === null ? '算出を保留' : result.score + '/100'}`, reviewConclusions[result.assessment], 'AIが書いた確率ではありません。文章だけでAI使用を断定できません。', '', '【主な理由】', ...(freeReviewReasons(result).length ? freeReviewReasons(result) : ['判断できるだけの根拠を取得できませんでした。']), '', '原文の詳しい説明や改善案は、詳細分析レポートで確認できます。'].join('\n');
  return ['AIチェッカー｜モデル判定レポート', ...(result.sandbox ? ['【テスト用の固定応答です。実際の文章の判定ではありません。】'] : []), `提供元：${result.provider}／モデル：${result.modelVersion}`, `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `AIと分類された割合：${Math.round(result.ai * 100)}%`, `人間と分類された割合：${Math.round(result.human * 100)}%`, 'これらは提供元の分類結果であり、執筆者やAI使用を証明しません。', '日本語ではAI Logicによる短語レベルの判定理由は提供されません。', '', ...result.sections.flatMap((s, i) => [`【区分 ${i + 1}】${s.classification === 2 ? 'AIの傾向' : '人間の傾向'}／分類の信頼度 ${Math.round(s.probability * 100)}%`, ...s.excerpts.map(e => e.text)]), '', `スキャンID：${result.scanId}`].join('\n');
}
