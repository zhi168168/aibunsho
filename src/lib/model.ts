export type CopyleaksResult = {
  provider: 'Copyleaks'; modelVersion: string; sandbox: boolean; ai: number; human: number;
  sections: { classification: 1 | 2; probability: number; excerpts: { start: number; length: number; text: string }[] }[];
  credits: number | null; scanId: string; analyzedAt: string;
};
export type DeepSeekResult = {
  provider: 'DeepSeek'; modelVersion: string; sandbox: false; score: number;
  assessment: 'uncertain' | 'few_patterns' | 'mixed_patterns' | 'many_patterns';
  summary: string; observations: { text: string; reason: string }[];
  scanId: string; analyzedAt: string;
};
export type ModelResult = CopyleaksResult | DeepSeekResult;
export type ServiceStatus = { configured: boolean; sandbox: boolean; provider: string; minCharacters: number };
export function modelReport(result: ModelResult) {
  if (result.provider === 'DeepSeek') return ['AIチェッカー｜AI補助レビュー', `提供元：DeepSeek／モデル：${result.modelVersion}`, `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `AI的な文体特徴の参考スコア：${result.score}/100`, 'このスコアは言語モデルによる主観的な参考指標であり、AI生成確率や検出精度ではありません。AI使用や執筆者を証明できません。', '', result.summary, '', ...result.observations.flatMap((o, i) => [`【観察 ${i + 1}】${o.text}`, o.reason]), '', `リクエストID：${result.scanId}`].join('\n');
  return ['AIチェッカー｜モデル判定レポート', ...(result.sandbox ? ['【テスト用の固定応答です。実際の文章の判定ではありません。】'] : []), `提供元：${result.provider}／モデル：${result.modelVersion}`, `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `AIと分類された割合：${Math.round(result.ai * 100)}%`, `人間と分類された割合：${Math.round(result.human * 100)}%`, 'これらは提供元の分類結果であり、執筆者やAI使用を証明しません。', '日本語ではAI Logicによる短語レベルの判定理由は提供されません。', '', ...result.sections.flatMap((s, i) => [`【区分 ${i + 1}】${s.classification === 2 ? 'AIの傾向' : '人間の傾向'}／分類の信頼度 ${Math.round(s.probability * 100)}%`, ...s.excerpts.map(e => e.text)]), '', `スキャンID：${result.scanId}`].join('\n');
}
