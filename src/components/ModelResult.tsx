import { AlertTriangle, ArrowDownToLine, Check, Copy } from 'lucide-react';
import { dimensionNames, type ModelResult as ModelResultType } from '../lib/model';
export default function ModelResult({ result, copied, onCopy, onDownload }: { result: ModelResultType; copied: boolean; onCopy: () => void; onDownload: () => void }) {
  if (result.provider === 'DeepSeek') {
    const labels = { uncertain: '判断材料が不足・不確実', few_patterns: '定型的な特徴は少ない', mixed_patterns: '特徴が混在しています', many_patterns: '複数の定型的な特徴があります' };
    const genreNames: Record<string, string> = { general: '一般的な文章', academic: '学術・レポート', business: 'ビジネス', creative: '創作・随筆', technical: '技術的な文章', list: '箇条書き・手順', mixed: '複数の形式', unknown: '種類は不明' };
    return <div className="model-result deepseek-result">
      <div className="score-block"><div className={`score-ring ${result.score === null ? 'score-withheld' : ''}`} style={{ '--score': `${result.score ?? 0}%` } as React.CSSProperties}><span><b>{result.score ?? '—'}</b><small>{result.score === null ? '保留' : '/ 100'}</small></span></div><div><span className="score-label">DeepSeek 根拠比較レビュー</span><h2>{labels[result.assessment]}</h2><p>AI生成確率ではありません。特徴が少なくても人間の証明にはなりません。</p></div></div>
      <p className="review-genre">文章の種類（推定）：{genreNames[result.genre] ?? result.genre}</p>
      <p className="review-summary">{result.summary}</p>
      <div className="review-dimensions" aria-label="4項目の文体レビュー">{result.dimensions.map(d => <details key={d.id}><summary>{dimensionNames[d.id]}<span>{d.score} / 100</span></summary><p>{d.explanation}</p></details>)}</div>
      <p className="review-scale-note">項目スコアは定型的な文体特徴の強さです。検出確率ではなく、単純平均もしません。</p>
      <div className="model-sections review-evidence">{(['supports', 'counter', 'neutral'] as const).map(direction => {
        const items = result.observations.filter(o => o.direction === direction);
        return <section key={direction}><h3>{direction === 'supports' ? '定型性を示す特徴' : direction === 'counter' ? '別の解釈につながる特徴' : '判断が分かれる特徴'}</h3>{items.length ? items.map((o, i) => <article className={`review-observation evidence-${direction}`} key={i}><small>{dimensionNames[o.dimension]}</small><blockquote>{o.text}</blockquote><p>{o.reason}</p></article>) : <p className="no-evidence">原文に基づく十分な指摘はありません。</p>}</section>;
      })}</div>
      <details className="review-limitations" open={result.score === null}><summary>評価の限界と注意点（{result.limitations.length}件）</summary><ul>{result.limitations.map((note, i) => <li key={i}>{note}</li>)}</ul></details>
      <p className="model-disclaimer">本文に基づく1回のモデル呼び出しによる補助評価です。専用検出器ではなく、AI使用や執筆者を証明しません。</p>
      <div className="report-actions"><span>DeepSeek · {result.modelVersion}</span><button className="icon-button" onClick={onCopy} aria-label={copied ? 'コピーしました' : 'レポートをコピー'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={onDownload} aria-label="レポートをダウンロード"><ArrowDownToLine size={15} /></button></div>
    </div>;
  }
  return <div className="model-result">
    {result.sandbox && <div className="sandbox-note"><AlertTriangle size={15} /><span>テスト応答です。文章の実際の判定ではありません。</span></div>}
    <div className="score-block"><div className="score-ring" style={{ '--score': `${result.ai * 100}%` } as React.CSSProperties}><span><b>{Math.round(result.ai * 100)}</b><small>%</small></span></div><div><span className="score-label">Copyleaks モデル判定</span><h2>AIと分類された割合</h2><p>文章の分類結果であり、執筆者を証明しません。</p></div></div>
    <div className="model-legend"><span><i /> AIの傾向 <b>{Math.round(result.ai * 100)}%</b></span><span><i /> 人間の傾向 <b>{Math.round(result.human * 100)}%</b></span></div>
    <div className="model-sections"><p>テキスト区分ごとの判定</p>{result.sections.length ? result.sections.map((section, i) => <article className={`sentence ${section.classification === 2 ? 'high' : 'low'}`} key={i}><span className="sentence-number">{String(i + 1).padStart(2, '0')}</span><div><small>{section.classification === 2 ? 'AIの傾向' : '人間の傾向'} · 分類の信頼度 {Math.round(section.probability * 100)}%</small>{section.excerpts.length ? section.excerpts.map((e, j) => <p key={j}>{e.text}</p>) : <p>この区分のテキスト範囲は提供されませんでした。</p>}</div></article>) : <p>区分ごとの結果は提供されませんでした。</p>}</div>
    <p className="model-disclaimer">日本語では、AI Logicによる短語レベルの理由は提供されません。</p>
    <div className="report-actions"><span>Copyleaks · {result.modelVersion}</span><button className="icon-button" onClick={onCopy} aria-label={copied ? 'コピーしました' : 'レポートをコピー'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={onDownload} aria-label="レポートをダウンロード"><ArrowDownToLine size={15} /></button></div>
  </div>;
}
