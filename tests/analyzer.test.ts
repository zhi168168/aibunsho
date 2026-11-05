import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, countChars, reportText, splitSentences } from '../src/lib/analyzer';
import { samples } from '../src/lib/samples';
test('rejects short, blank, and excessive input', () => {
  for (const text of ['。'.repeat(150), '！'.repeat(150), '', ' '.repeat(150), '短い文章です。', 'あ'.repeat(10001)]) assert.throws(() => analyzeText(text));
});
test('counts unicode characters and splits Japanese sentences', () => {
  assert.equal(countChars('あ 😀\nい'), 3);
  assert.deepEqual(splitSentences('第一文です。\n第二文！第三文？'), ['第一文です。', '第二文！', '第三文？']);
});
test('measures actual patterns rather than hardcoded sample scores', () => {
  const structured = analyzeText(samples.structured);
  const personal = analyzeText(samples.personal);
  assert.ok(structured.score > personal.score);
  assert.equal(structured.sentences.map(s => s.text).join(''), samples.structured);
  assert.equal(structured.sentenceCount, splitSentences(samples.structured).length);
  for (const result of [structured, personal, analyzeText('あ'.repeat(10000))]) {
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.ok(result.signals.every(s => Number.isFinite(s.value) && s.value >= 0 && s.value <= 100));
  }
});
test('single sentences do not pretend to have sentence variance', () => {
  const result = analyzeText('あ'.repeat(120));
  assert.equal(result.limited, true);
  assert.equal(result.signals.find(s => s.id === 'uniformity')?.available, false);
  assert.equal(result.signals.find(s => s.id === 'endings')?.available, false);
});
test('exports explicit method and limitations with every report', () => {
  const report = reportText(analyzeText(samples.structured));
  assert.ok(report.includes('AI生成確率ではありません'));
  assert.ok(report.includes('japanese-style-2.0'));
  assert.ok(report.includes(samples.structured.split('。')[0]));
});

test('common connectors and polite endings alone do not create a strong style score', () => {
  const formal = 'さらに、図書館の返却期限を確認してください。一方で、予約資料は別の窓口で受け取れます。加えて、児童書の棚は入口の左側にあります。したがって、希望する本の分類を先に調べると便利です。このように、利用案内は各階の掲示板にも掲載されています。';
  const result = analyzeText(formal);
  assert.ok(result.signals.find(s => s.id === 'phrases')!.value < 10);
  assert.ok(result.score < 50);
  assert.equal(result.signals.length, 8);
});

test('genre cautions and paragraph availability are based on actual input', () => {
  const legal = '第1条 本契約の適用範囲を以下に定めるものとする。'.repeat(6);
  assert.ok(analyzeText(legal).cautions.some(s => s.includes('契約')));
  const one = analyzeText(samples.personal);
  const three = analyzeText(samples.personal + '\n\n' + samples.structured + '\n\n' + samples.personal);
  assert.equal(one.signals.find(s => s.id === 'paragraphs')!.available, false);
  assert.equal(three.signals.find(s => s.id === 'paragraphs')!.available, true);
  assert.equal(analyzeText('This is English prose with insufficient Japanese support. '.repeat(4)).limited, true);
});

test('adjacent near duplicates are measured without inferring factual truth or authorship', () => {
  const repeated = analyzeText('地域の図書館では毎週土曜日に読書の集まりを開いています。'.repeat(8));
  assert.ok(repeated.features.nearDuplicatePairs > 0);
  assert.ok(repeated.signals.find(s => s.id === 'similarity')!.value > 50);
  assert.ok(reportText(repeated).includes('AIの使用や執筆者を特定できません'));
});
