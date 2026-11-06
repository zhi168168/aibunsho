import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import ModelResult from '../src/components/ModelResult';
import { freeReviewReasons, modelReport, type DeepSeekResult } from '../src/lib/model';

const result: DeepSeekResult = {
  provider: 'DeepSeek', modelVersion: 'test', sandbox: false, reviewVersion: 'evidence-review-2.0',
  score: 58, assessment: 'mixed_patterns', genre: 'creative', summary: 'DETAILED_SUMMARY',
  limitations: ['DETAILED_LIMITATION'],
  observations: [
    { text: 'SOURCE_QUOTE', reason: 'LONG_REASON', direction: 'supports', dimension: 'structure' },
    { text: 'COUNTER_QUOTE', reason: 'COUNTER_DETAIL', direction: 'counter', dimension: 'specificity' },
  ],
  briefReasons: [{dimension:'structure',text:'同じ説明が繰り返されています。'}, {dimension:'specificity',text:'具体的な出来事の説明も含まれています。'}],
  dimensions: (['structure', 'expression', 'specificity', 'consistency'] as const).map(id => ({ id, score: 50, explanation: `DETAILED_${id}` })),
  scanId: 'test', analyzedAt: '2026-11-06T00:00:00Z',
};

test('free result and export show a reference score and short reasons without detailed analysis or probability claims', () => {
  const html = renderToStaticMarkup(<ModelResult result={result} copied={false} onCopy={() => {}} onDownload={() => {}} onAdvanced={() => {}} />);
  for (const output of [html, modelReport(result)]) {
    assert.ok(output.includes('58'));
    assert.ok(output.includes('参考スコア'));
    assert.ok(output.includes('AIが書いた確率ではありません'));
    for (const reason of result.briefReasons!) assert.ok(output.includes(reason.text));
    for (const hidden of ['SOURCE_QUOTE', 'COUNTER_QUOTE', 'LONG_REASON', 'DETAILED_SUMMARY', 'DETAILED_LIMITATION', 'DETAILED_structure']) assert.ok(!output.includes(hidden));
    assert.ok(!output.includes('58%'));
  }
  assert.ok(html.includes('詳細分析レポートを見る'));
  assert.ok(html.indexOf('詳細分析レポートを見る') > html.indexOf('具体的な出来事'));
});

test('uncertain result stays withheld and missing reasons do not become invented evidence', () => {
  const uncertain = {...result, score:null, assessment:'uncertain' as const, observations:[], briefReasons:[]};
  const html = renderToStaticMarkup(<ModelResult result={uncertain} copied={false} onCopy={() => {}} onDownload={() => {}} />);
  for (const output of [html, modelReport(uncertain)]) {
    assert.ok(output.includes('保留'));
    assert.ok(output.includes('判断できるだけの根拠を取得できませんでした'));
    assert.ok(!output.includes('0 / 100'));
  }
});

test('brief reasons preserve an alternative reading when more than three reasons are returned', () => {
  const reasons = freeReviewReasons({...result, briefReasons:[
    {dimension:'structure',text:'reason-one'}, {dimension:'expression',text:'reason-two'},
    {dimension:'consistency',text:'reason-three'}, {dimension:'specificity',text:'alternative-reading'},
  ]});
  assert.equal(reasons.length,3);
  assert.ok(reasons.includes('alternative-reading'));
});
