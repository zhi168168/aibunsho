import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import ModelResult from '../src/components/ModelResult';
import { modelReport, type DeepSeekResult } from '../src/lib/model';

test('free result and downloaded report expose scores and dimensions without source evidence or summary', () => {
  const result: DeepSeekResult = {
    provider: 'DeepSeek', modelVersion: 'test', sandbox: false, reviewVersion: 'evidence-review-2.0',
    score: 58, assessment: 'mixed_patterns', genre: 'creative', summary: 'INTERNAL_SUMMARY',
    limitations: ['INTERNAL_LIMITATION'], observations: [{ text: 'INTERNAL_QUOTE', reason: 'INTERNAL_REASON', direction: 'supports', dimension: 'structure' }],
    dimensions: (['structure', 'expression', 'specificity', 'consistency'] as const).map((id, i) => ({ id, score: 50 + i, explanation: `dimension-${id}` })),
    scanId: 'test', analyzedAt: '2026-11-06T00:00:00Z',
  };
  const html = renderToStaticMarkup(<ModelResult result={result} copied={false} onCopy={() => {}} onDownload={() => {}} />);
  const exported = modelReport(result);
  for (const output of [html, exported]) {
    assert.ok(output.includes('58'));
    for (const dimension of result.dimensions) assert.ok(output.includes(dimension.explanation));
    for (const hidden of ['INTERNAL_SUMMARY', 'INTERNAL_LIMITATION', 'INTERNAL_QUOTE', 'INTERNAL_REASON']) assert.ok(!output.includes(hidden));
  }
  const uncertain = modelReport({ ...result, score: null, assessment: 'uncertain' });
  assert.ok(uncertain.includes('算出を保留'));
  assert.ok(!uncertain.includes('総合スコア：0'));
});
