import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeText, countChars, reportText, splitSentences } from '../src/lib/analyzer';
import { samples } from '../src/lib/samples';
test('rejects short, blank, and excessive input', () => {
  for (const text of ['', ' '.repeat(150), '短い文章です。', 'あ'.repeat(10001)]) assert.throws(() => analyzeText(text));
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
  assert.ok(report.includes('style-statistics-1.0'));
  assert.ok(report.includes(samples.structured.split('。')[0]));
});
