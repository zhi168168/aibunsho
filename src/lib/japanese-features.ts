// Observable text features, not authorship labels or a trained probability model.
export function japaneseFeatures(text: string, sentences: string[]) {
  const compact = Array.from(text.replace(/[\s\p{P}]/gu, ''));
  const lengths = sentences.map(s => Array.from(s.replace(/\s/gu, '')).length);
  const paragraphs = text.split(/\n\s*\n/u).map(p => p.trim()).filter(Boolean);
  const openings = sentences.map(s => s.replace(/^[「『（\s]+/u, '').slice(0, 5));
  const frequency = (items: string[]) => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
    return map;
  };
  const repeatedStarts = [...frequency(openings).values()].reduce((sum, n) => sum + Math.max(0, n - 1), 0);
  // Fixed-size windows keep vocabulary comparisons from simply penalizing longer documents.
  const diversity: number[] = [];
  for (let start = 0; start + 80 <= compact.length; start += 80) {
    const chunk = compact.slice(start, start + 80);
    const grams = chunk.slice(0, -1).map((c, i) => c + chunk[i + 1]);
    diversity.push(new Set(grams).size / grams.length);
  }
  const bigrams = sentences.map(s => {
    const chars = Array.from(s.replace(/[\s\p{P}]/gu, ''));
    return new Set(chars.slice(0, -1).map((c, i) => c + chars[i + 1]));
  });
  let nearDuplicatePairs = 0;
  // Compare adjacent sentences: linear work, rather than all pairs on 10,000 characters.
  for (let i = 1; i < bigrams.length; i++) {
    if (lengths[i] < 15 || lengths[i - 1] < 15) continue;
    const a = bigrams[i - 1], b = bigrams[i];
    const intersection = [...a].filter(g => b.has(g)).length;
    if (intersection / Math.max(1, a.size + b.size - intersection) > .65) nearDuplicatePairs++;
  }
  const paragraphLengths = paragraphs.map(p => Array.from(p.replace(/\s/gu, '')).length);
  const mean = paragraphLengths.reduce((sum, n) => sum + n, 0) / Math.max(1, paragraphLengths.length);
  const paragraphVariation = Math.sqrt(paragraphLengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / Math.max(1, paragraphLengths.length)) / Math.max(1, mean);
  const japaneseRatio = (text.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu)?.length ?? 0) / Math.max(1, compact.length);
  const listLines = text.split('\n').filter(s => /^\s*(?:[-*・●]|\d+[.)．、]|[①-⑳])/u.test(s)).length;
  const quotationCount = (text.match(/「[^」]+」|『[^』]+』|https?:\/\/\S+|\[\d+\]/gu) ?? []).length;
  const numericDetails = (text.match(/\d+(?:[.,]\d+)*(?:年|月|日|時|分|秒|円|人|件|回|個|％|%|km|kg)/gu) ?? []).length;
  const contexts: string[] = [];
  if (listLines >= 3) contexts.push('箇条書き・手順の形式が多く、構造の反復は形式上の特徴かもしれません。');
  if (/第[一二三四五六七八九十\d]+条|本契約|ものとする|被験者|有意差|先行研究|参考文献/u.test(text)) contexts.push('契約・学術的な表現があります。定型句や文末の一致だけではAIの根拠になりません。');
  if (/```|(?:function|const|import)\s|<\/?[a-z]+[\s>]/u.test(text)) contexts.push('コードやマークアップを含むため、通常の日本語散文としての評価には限界があります。');
  if (quotationCount >= 2) contexts.push('引用・会話・出典の表記があります。引用や発話の部分と地の文を区別して読んでください。');
  if (japaneseRatio < .35) contexts.push('日本語の割合が低く、日本語向けルールでは十分に評価できません。');
  return {
    sentenceCount: sentences.length, paragraphCount: paragraphs.length,
    meanSentenceLength: Math.round(lengths.reduce((sum, n) => sum + n, 0) / Math.max(1, lengths.length)),
    repeatedStartRatio: repeatedStarts / Math.max(1, sentences.length - 1),
    localBigramDiversity: diversity.length ? diversity.reduce((a, b) => a + b, 0) / diversity.length : null,
    nearDuplicatePairs, paragraphVariation, japaneseRatio, listLines, quotationCount, numericDetails, contexts,
  };
}
