import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { analyzeText } from '../src/lib/analyzer';
import { samples } from '../src/lib/samples';
import { createDeepSeekClient } from '../server/deepseek';

// Handcrafted engineering fixtures, not ground-truth human/AI evaluation data.
const fixtures = [
  { id: 'common-connectors', text: 'さらに、図書館の返却期限を確認してください。一方で、予約資料は別の窓口で受け取れます。加えて、児童書の棚は入口の左側にあります。したがって、希望する本の分類を先に調べると便利です。このように、利用案内は各階の掲示板にも掲載されています。' },
  { id: 'formal-template', text: '第1条 本契約の適用範囲を以下に定めるものとする。第2条 提出期限は毎月末日とする。第3条 書類の保管場所は受付窓口とする。'.repeat(3) },
  { id: 'repeated-content', text: '地域の図書館では毎週土曜日に読書の集まりを開いています。'.repeat(12) },
  { id: 'structured-example', text: samples.structured },
  { id: 'personal-example', text: samples.personal },
  { id: 'non-japanese', text: 'This is a technical report containing several ordinary English sentences. The contents need a language-specific assessment, rather than Japanese-only rules. '.repeat(3) },
];
const directory = mkdtempSync(join(tmpdir(), 'aibunsho-eval-'));
const baselinePath = join(directory, 'baseline.ts');
let baseline: { analyzeText: typeof analyzeText };
try {
  writeFileSync(baselinePath, execFileSync('git', ['show', 'c144512:src/lib/analyzer.ts']));
  baseline = await import(pathToFileURL(baselinePath).href);
} finally { unlinkSync(baselinePath); rmdirSync(directory); }
const historical = JSON.parse(readFileSync('tests/fixtures/historical-ja.json', 'utf8')) as { text: string; title: string; author: string; source: string; provenance: string };
fixtures.push({ id: 'historical-literary-excerpt', text: historical.text });
const results = fixtures.map(f => {
  const before = baseline.analyzeText(f.text), after = analyzeText(f.text);
  return { id: f.id, characters: after.characters, beforeStyleScore: before.score, afterStyleScore: after.score, beforePhraseScore: before.signals.find(s => s.id === 'phrases')!.value, afterPhraseScore: after.signals.find(s => s.id === 'phrases')!.value, limited: after.limited, cautions: after.cautions };
});
const report: Record<string, unknown> = { baseline: 'c144512', version: 'japanese-style-2.0', scope: 'Six handcrafted engineering fixtures plus one sourced historical literary excerpt. Not representative accuracy evaluation. No FPR/TPR claim.', historicalSource: { title: historical.title, author: historical.author, url: historical.source, provenance: historical.provenance }, results };
if (process.argv.includes('--live') || process.argv.includes('--historical')) {
  const env = loadEnv('production', process.cwd(), '');
  const review = createDeepSeekClient();
  const live: unknown[] = process.argv.includes('--historical') && existsSync('docs/enhancement-evaluation.json') ? JSON.parse(readFileSync('docs/enhancement-evaluation.json', 'utf8')).live ?? [] : [];
  for (const id of (process.argv.includes('--historical') ? ['historical-literary-excerpt'] : ['structured-example', 'personal-example', 'historical-literary-excerpt'])) {
    const f = fixtures.find(f => f.id === id)!;
    const start = Date.now();
    try {
      const result = await review(f.text, env.DEEPSEEK_API_KEY, env.DEEPSEEK_MODEL || 'deepseek-flash');
      live.push({ id, milliseconds: Date.now() - start, result });
    } catch (error) {
      live.push({ id, milliseconds: Date.now() - start, error: error instanceof Error ? error.message : 'Review failed' });
    }
  }
  report.live = live;
}
writeFileSync('docs/enhancement-evaluation.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ completed: results.length, live: process.argv.includes('--live') || process.argv.includes('--historical'), output: 'docs/enhancement-evaluation.json' }));
