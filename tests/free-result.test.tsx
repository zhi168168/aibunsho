import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import ModelResult from '../src/components/ModelResult';
import { modelReport, type DeepSeekResult } from '../src/lib/model';

test('free result leads with a conclusion and explains source evidence, including alternative readings', () => {
  const result: DeepSeekResult = {
    provider: 'DeepSeek', modelVersion: 'test', sandbox: false, reviewVersion: 'evidence-review-2.0',
    score: 58, assessment: 'mixed_patterns', genre: 'creative', summary: 'INTERNAL_SUMMARY',
    limitations: ['REVIEW_LIMITATION'], observations: [{ text: 'SOURCE_QUOTE', reason: 'SOURCE_REASON', direction: 'supports', dimension: 'structure' }, { text: 'COUNTER_QUOTE', reason: 'COUNTER_REASON', direction: 'counter', dimension: 'specificity' }],
    dimensions: (['structure', 'expression', 'specificity', 'consistency'] as const).map((id, i) => ({ id, score: 50 + i, explanation: `dimension-${id}` })),
    scanId: 'test', analyzedAt: '2026-11-06T00:00:00Z',
  };
  const html = renderToStaticMarkup(<ModelResult result={result} copied={false} onCopy={() => {}} onDownload={() => {}} />);
  const exported = modelReport(result);
  for (const output of [html, exported]) {
    assert.ok(output.includes('58'));
    for (const dimension of result.dimensions) assert.ok(output.includes(dimension.explanation));
    for (const visible of ['INTERNAL_SUMMARY', 'SOURCE_QUOTE', 'SOURCE_REASON', 'COUNTER_QUOTE', 'COUNTER_REASON', 'REVIEW_LIMITATION', '別の読み方ができる箇所']) assert.ok(output.includes(visible));
    assert.ok(output.indexOf('INTERNAL_SUMMARY') < output.indexOf('58'));
    assert.ok(output.includes('数値が高いほど'));
    assert.ok(!output.includes('AIらしさの参考スコア'));
  }
  assert.match(html, /<details class="review-score-details"><summary>/);
  const uncertain = modelReport({ ...result, score: null, assessment: 'uncertain' });
  assert.ok(uncertain.includes('算出を保留'));
  assert.ok(!uncertain.includes('総合スコア：0'));
});

test('missing quotations and withheld scores provide an honest explanation, not an empty or zero result', () => {
  const result: DeepSeekResult = {
    provider: 'DeepSeek', modelVersion: 'test', sandbox: false, reviewVersion: 'evidence-review-2.0',
    score: null, assessment: 'uncertain', genre: 'unknown', summary: '判断できる材料が十分にありません。',
    limitations: [], observations: [], dimensions: [], scanId: 'test', analyzedAt: '2026-11-06T00:00:00Z',
  };
  const html = renderToStaticMarkup(<ModelResult result={result} copied={false} onCopy={() => {}} onDownload={() => {}} />);
  for (const output of [html, modelReport(result)]) {
    assert.ok(output.includes('原文を引用した説明を取得できませんでした'));
    assert.ok(output.includes('この文章だけでは、はっきり判断できません'));
    assert.ok(output.includes('保留'));
    assert.ok(!output.includes('0 / 100'));
  }
  assert.match(html, /<details class="review-score-details" open="">/);
});
