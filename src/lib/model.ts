export type CopyleaksResult = {
  provider: 'Copyleaks'; modelVersion: string; sandbox: boolean; ai: number; human: number;
  sections: { classification: 1 | 2; probability: number; excerpts: { start: number; length: number; text: string }[] }[];
  credits: number | null; scanId: string; analyzedAt: string;
};
export const reviewDimensions = ['structure', 'expression', 'specificity', 'consistency'] as const;
export type ReviewDimension = typeof reviewDimensions[number];
export const dimensionNames: Record<ReviewDimension, string> = { structure: '構成と反復', expression: '表現のパターン', specificity: '具体性と根拠', consistency: '文脈と文体の一貫性' };
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
  if (result.provider === 'DeepSeek') return ['AIチェッカー｜AI補助レビュー', `提供元：DeepSeek／モデル：${result.modelVersion}`, `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `判定：${result.score === null ? '判断材料が不足・不確実' : result.assessment === 'many_patterns' ? '複数の定型的特徴' : result.assessment === 'few_patterns' ? '定型的特徴は少ない' : '特徴が混在'}`, `AI的な文体特徴の参考スコア：${result.score === null ? '算出を保留' : result.score + '/100'}`, `レビュー方式：${result.reviewVersion}／文章の種類：${result.genre}`, 'このスコアは言語モデルによる主観的な参考指標であり、AI生成確率や検出精度ではありません。AI使用や執筆者を証明できません。', '', result.summary, '', '【分項レビュー】', ...result.dimensions.map(d => `${dimensionNames[d.id]}：${d.score}/100（文体特徴）\n${d.explanation}`), '', '【評価の限界】', ...result.limitations, '', ...result.observations.flatMap((o, i) => [`【観察 ${i + 1}／${o.direction === 'supports' ? '定型性を示す特徴' : o.direction === 'counter' ? '別の解釈につながる特徴' : '判断が分かれる特徴'}】${o.text}`, o.reason]), '', `リクエストID：${result.scanId}`].join('\n');
  return ['AIチェッカー｜モデル判定レポート', ...(result.sandbox ? ['【テスト用の固定応答です。実際の文章の判定ではありません。】'] : []), `提供元：${result.provider}／モデル：${result.modelVersion}`, `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `AIと分類された割合：${Math.round(result.ai * 100)}%`, `人間と分類された割合：${Math.round(result.human * 100)}%`, 'これらは提供元の分類結果であり、執筆者やAI使用を証明しません。', '日本語ではAI Logicによる短語レベルの判定理由は提供されません。', '', ...result.sections.flatMap((s, i) => [`【区分 ${i + 1}】${s.classification === 2 ? 'AIの傾向' : '人間の傾向'}／分類の信頼度 ${Math.round(s.probability * 100)}%`, ...s.excerpts.map(e => e.text)]), '', `スキャンID：${result.scanId}`].join('\n');
}
