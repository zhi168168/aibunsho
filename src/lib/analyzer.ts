export const MIN_CHARS = 100;
export const MAX_CHARS = 10000;
export const countChars = (text: string) => Array.from(text.replace(/\s/gu, '')).length;

export type Signal = { id: string; name: string; value: number; detail: string; available: boolean };
export type Sentence = { text: string; score: number; evidence: string[] };
export type Analysis = {
  version: string; analyzedAt: string; characters: number; sentenceCount: number;
  score: number; signals: Signal[]; sentences: Sentence[]; limited: boolean;
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
  const lengths = parts.map(countChars);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const sd = Math.sqrt(lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length);
  const enoughSentences = parts.length >= 3;
  const uniformity = enoughSentences ? clamp(100 * (1 - Math.min(sd / mean, 1))) : 0;
  const hits = parts.map(s => phrases.filter(p => s.includes(p)));
  const phraseRate = clamp(hits.flat().length / Math.max(characters / 100, 1) * 25);
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
    { id: 'phrases', name: '定型的な表現', value: phraseRate, available: true, detail: `定義済みの接続語・定型句を ${hits.flat().length}件検出。100文字あたりの出現頻度から算出。` },
    { id: 'endings', name: '文末表現の繰り返し', value: repeatedEndings, available: enoughSentences, detail: enoughSentences ? '各文の末尾3文字を比較。同じ文末が繰り返されるほど高くなります。' : '3文以上の文章で計算できます。' },
    { id: 'repetition', name: 'フレーズの反復', value: repetition, available: true, detail: '句読点と空白を除いた4文字の連続パターンの重複率を比較します。' },
  ];
  const available = signals.filter(s => s.available);
  const score = clamp(available.reduce((n, s) => n + s.value, 0) / available.length);
  const sentences = parts.map((s, i) => {
    const evidence = [...hits[i].map(p => `「${p}」`), ...((frequencies.get(endings[i]) ?? 0) > 1 ? ['文末の繰り返し'] : [])];
    return { text: s, score: clamp(hits[i].length * 23 + ((frequencies.get(endings[i]) ?? 0) > 1 ? 25 : 0)), evidence };
  });
  return { version: 'style-statistics-1.0', analyzedAt: new Date().toISOString(), characters, sentenceCount: parts.length, score, signals, sentences, limited: characters < 300 || !enoughSentences };
}

export function reportText(result: Analysis): string {
  return ['AIチェッカー｜文章分析レポート', `分析日時：${new Date(result.analyzedAt).toLocaleString('ja-JP')}`, `エンジン：${result.version}`, `文字数：${result.characters}／文数：${result.sentenceCount}`, `文章の規則性スコア：${result.score}/100`, '', 'この値はAI生成確率ではありません。ブラウザ内の統計的な文章分析であり、AIの使用や執筆者を特定できません。', ...(result.limited ? ['注意：文章が短いか文数が少ないため、得られる情報が限られます。'] : []), '', '【分析指標】', ...result.signals.map(s => `${s.name}：${s.available ? s.value + '/100' : '算出不可'}\n${s.detail}`), '', '【文ごとの特徴】', ...result.sentences.map((s, i) => `${i + 1}. ${s.text}\n${s.evidence.join('、') || '定義済みの特徴は検出されませんでした。'}`)].join('\n');
}
