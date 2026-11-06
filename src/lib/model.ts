export type CopyleaksResult = {
  provider: 'Copyleaks'; modelVersion: string; sandbox: boolean; ai: number; human: number;
  sections: { classification: 1 | 2; probability: number; excerpts: { start: number; length: number; text: string }[] }[];
  credits: number | null; scanId: string; analyzedAt: string;
};
export const reviewDimensions = ['structure', 'expression', 'specificity', 'consistency'] as const;
export type ReviewDimension = typeof reviewDimensions[number];
export const dimensionNames: Record<ReviewDimension, string> = { structure: '同じ内容の繰り返し', expression: 'よくある言い回し', specificity: '具体的な説明の不足', consistency: '話のつながりの不自然さ' };
export const reviewConclusions = {
  uncertain: 'この文章だけでは、はっきり判断できません。',
  few_patterns: '型どおりの表現は、あまり見られません。',
  mixed_patterns: '一部に、型どおりの表現が見られます。',
  many_patterns: '型どおりの表現が、複数の箇所で目立ちます。',
};
export const observationLabels = { supports: '型どおりに見える箇所', counter: '別の読み方ができる箇所', neutral: '判断が分かれる箇所' };
export const reviewScoreNote = '数値が高いほど、繰り返しや説明不足など、型どおりに見える特徴が強いという評価です。文章の良し悪しや、AIが書いた確率を表すものではありません。';
export type DeepSeekResult = {
  provider: 'DeepSeek'; modelVersion: string; sandbox: false; score: number | null; reviewVersion: 'evidence-review-2.0'; genre: string; limitations: string[];
  dimensions: { id: ReviewDimension; score: number; explanation: string }[];
  assessment: 'uncertain' | 'few_patterns' | 'mixed_patterns' | 'many_patterns';
  summary: string; observations: { text: string; reason: string; direction: 'supports' | 'counter' | 'neutral'; dimension: ReviewDimension }[];
  scanId: string; analyzedAt: string;
};
export type ModelResult = CopyleaksResult | DeepSeekResult;
export type ServiceStatus = { configured: boolean; sandbox: boolean; provider: string; minCharacters: number };
export function modelReport(result: ModelResult) {
  if (result.provider === 'DeepSeek') return ['AIチェッカー｜無料チェック結果', '', '【この文章について】', reviewConclusions[result.assessment], result.summary, '文章の特徴をもとにした参考意見です。AIが書いたかどうかは断定できません。', '', '【原文と、その理由】', ...(result.observations.length ? result.observations.map(o => `${observationLabels[o.direction]}\n「${o.text}」\n${o.reason}`) : ['原文を引用した説明を取得できませんでした。以下の項目別の説明を参考にしてください。']), '', '【数値の内訳】', reviewScoreNote, `総合スコア：${result.score === null ? '算出を保留（判断材料が十分にそろいませんでした）' : result.score + '/100'}`, ...result.dimensions.map(d => `${dimensionNames[d.id]}：${d.score}/100\n${d.explanation}`), '', '【今回の確認で分からないこと】', ...result.limitations].join('\n');
  return ['AIチェッカー｜モデル判定レポート', ...(result.sandbox ? ['【テスト用の固定応答です。実際の文章の判定ではありません。】'] : []), `提供元：${result.provider}／モデル：${result.modelVersion}`, `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `AIと分類された割合：${Math.round(result.ai * 100)}%`, `人間と分類された割合：${Math.round(result.human * 100)}%`, 'これらは提供元の分類結果であり、執筆者やAI使用を証明しません。', '日本語ではAI Logicによる短語レベルの判定理由は提供されません。', '', ...result.sections.flatMap((s, i) => [`【区分 ${i + 1}】${s.classification === 2 ? 'AIの傾向' : '人間の傾向'}／分類の信頼度 ${Math.round(s.probability * 100)}%`, ...s.excerpts.map(e => e.text)]), '', `スキャンID：${result.scanId}`].join('\n');
}
