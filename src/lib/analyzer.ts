import { japaneseFeatures } from './japanese-features';
export const MIN_CHARS = 100;
export const MAX_CHARS = 10000;
export const countChars = (text: string) => Array.from(text.replace(/\s/gu, '')).length;

export type Signal = { id: string; name: string; value: number; detail: string; available: boolean };
export type Sentence = { text: string; score: number; evidence: string[] };
export type Analysis = {
  version: string; analyzedAt: string; characters: number; sentenceCount: number;
  score: number; signals: Signal[]; sentences: Sentence[]; limited: boolean;
  features: ReturnType<typeof japaneseFeatures>; cautions: string[];
};

const phrases = ['重要です', '不可欠です', '可能性があります', 'ことができます', 'と考えられます', 'と言えるでしょう', 'さらに', '加えて', 'したがって', '総じて', '結論として', 'このように', '一方で', '多岐にわたり', '現代社会', 'において'];
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

export function splitSentences(text: string): string[] {
  return (text.match(/[^。！？!?\n]+[。！？!?]*/gu) ?? []).map(s => s.trim()).filter(Boolean);
}

// Descriptive style statistics only. No trained model, perplexity, or calibrated probability.
export function analyzeText(text: string): Analysis {
  const characters = countChars(text);
  if (characters < MIN_CHARS || characters > MAX_CHARS) throw new Error(`${MIN_CHARS}〜${MAX_CHARS.toLocaleString()}文字で入力してください。`);
  const parts = splitSentences(text);
  if (!parts.length || !/[\p{L}\p{N}]/u.test(text)) throw new Error('文章として読める文字を入力してください。');
  const features = japaneseFeatures(text, parts);
  const lengths = parts.map(countChars);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = Math.sqrt(lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length);
  const enoughSentences = parts.length >= 3;
  const uniformity = enoughSentences ? clamp(100 * (1 - Math.min(sd / mean, 1))) : 0;
  const hits = parts.map(s => phrases.filter(p => s.includes(p)));
  const weak = new Set(['さらに', '加えて', 'したがって', 'このように', '一方で', 'において']);
  const weightedHits = hits.flat().reduce((sum, phrase) => sum + (weak.has(phrase) ? 0 : 1), 0);
  const phraseRate = clamp(weightedHits / Math.max(characters / 100, 1) * 22);
  const endings = parts.map(s => s.replace(/[。！？!?\s]+$/gu, '').slice(-3));
  const frequencies = new Map<string, number>();
  for (const ending of endings) frequencies.set(ending, (frequencies.get(ending) ?? 0) + 1);
  const repeatedEndings = enoughSentences ? clamp((Math.max(...frequencies.values()) - 1) / (parts.length - 1) * 100) : 0;
  const grams = new Map<string, number>();
  const compact = Array.from(text.replace(/[\s\p{P}]/gu, ''));
  for (let i = 0; i <= compact.length - 4; i++) {
    const gram = compact.slice(i, i + 4).join('');
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  const repeated = [...grams.values()].reduce((n, v) => n + Math.max(0, v - 1), 0);
  const repetition = clamp(repeated / Math.max(compact.length - 3, 1) * 200);
  const signals: Signal[] = [
    { id: 'uniformity', name: '文の長さの規則性', value: uniformity, available: enoughSentences, detail: enoughSentences ? `平均 ${Math.round(mean)}文字／標準偏差 ${sd.toFixed(1)}文字。文の長さが揃うほど高くなります。` : '3文以上の文章で計算できます。' },
    { id: 'phrases', name: '定型的な表現', value: phraseRate, available: true, detail: `定義済みの表現を ${hits.flat().length}件検出。一般的な接続語だけでは加点しません。` },
    { id: 'endings', name: '文末表現の繰り返し', value: repeatedEndings, available: enoughSentences, detail: enoughSentences ? '各文の末尾3文字を比較。同じ文末が繰り返されるほど高くなります。' : '3文以上の文章で計算できます。' },
    { id: 'repetition', name: 'フレーズの反復', value: repetition, available: true, detail: '句読点と空白を除いた4文字の連続パターンの重複率を比較します。' },
    { id: 'openings', name: '文の書き出しの反復', value: clamp(features.repeatedStartRatio * 100), available: enoughSentences, detail: '各文の冒頭5文字の一致を比較。箇条書きや同じ主語でも高くなります。' },
    { id: 'vocabulary', name: '局所的な語句の偏り', value: features.localBigramDiversity === null ? 0 : clamp((1 - features.localBigramDiversity) * 160), available: features.localBigramDiversity !== null, detail: '80文字の固定窓で2文字パターンの多様性を比較。専門用語の反復も含まれ、形態素解析ではありません。' },
    { id: 'paragraphs', name: '段落の長さの規則性', value: clamp((1 - Math.min(1, features.paragraphVariation)) * 100), available: features.paragraphCount >= 3, detail: '空行で区切られた3段落以上で計算。整った構成はAIの証拠ではありません。' },
    { id: 'similarity', name: '隣り合う文の類似', value: clamp(features.nearDuplicatePairs / Math.max(1, parts.length - 1) * 100), available: enoughSentences, detail: `${features.nearDuplicatePairs}組に高い2文字パターンの重なり。意味や事実の一致を判定する指標ではありません。` },
  ];
  const available = signals.filter(s => s.available);
  // Hand-set descriptive weights, not learned or calibrated detection probabilities.
  const weights: Record<string, number> = { uniformity: .1, phrases: .2, endings: .05, repetition: .15, openings: .15, vocabulary: .1, paragraphs: .05, similarity: .2 };
  const score = clamp(available.reduce((n, s) => n + s.value * weights[s.id], 0) / available.reduce((n, s) => n + weights[s.id], 0));
  const sentences = parts.map((s, i) => {
    const evidence = [...hits[i].map(p => `「${p}」`), ...((frequencies.get(endings[i]) ?? 0) > 1 ? ['文末の繰り返し（通常の敬体でも生じます）'] : [])];
    const strength = hits[i].reduce((n, p) => n + (weak.has(p) ? 0 : 15), 0);
    return { text: s, score: clamp(strength + ((frequencies.get(endings[i]) ?? 0) > 1 ? 8 : 0)), evidence };
  });
  return { version: 'japanese-style-2.0', analyzedAt: new Date().toISOString(), characters, sentenceCount: parts.length, score, signals, sentences, limited: characters < 300 || !enoughSentences || features.japaneseRatio < .35, features, cautions: features.contexts };
}

export function reportText(result: Analysis): string {
  return ['AIチェッカー｜文章分析レポート', `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `エンジン：${result.version}`, `文字数：${result.characters}／文数：${result.sentenceCount}`, `文章の規則性スコア：${result.score}/100`, '', 'この値はAI生成確率ではありません。ブラウザ内の統計的な文章分析であり、AIの使用や執筆者を特定できません。', ...(result.limited ? ['注意：文章が短いか文数が少ないため、得られる情報が限られます。'] : []), '', ...result.cautions.map(note => `注意：${note}`), '【分析指標】', ...result.signals.map(s => `${s.name}：${s.available ? s.value + '/100' : '算出不可'}\n${s.detail}`), '', '【文ごとの特徴】', ...result.sentences.map((s, i) => `${i + 1}. ${s.text}\n${s.evidence.join('、') || '定義済みの特徴は検出されませんでした。'}`)].join('\n');
}
