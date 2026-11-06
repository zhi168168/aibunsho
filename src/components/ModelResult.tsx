import { AlertTriangle, ArrowDownToLine, Check, Copy } from 'lucide-react';
import { dimensionNames, observationLabels, reviewConclusions, reviewScoreNote, type ModelResult as ModelResultType } from '../lib/model';
export default function ModelResult({ result, copied, onCopy, onDownload }: { result: ModelResultType; copied: boolean; onCopy: () => void; onDownload: () => void }) {
  if (result.provider === 'DeepSeek') {
    return <div className="model-result deepseek-result">
      <div className="review-verdict"><span className="report-eyebrow">この文章について</span><h2>{reviewConclusions[result.assessment]}</h2><p>{result.summary}</p></div>
      <p className="review-caveat">文章の特徴をもとにした参考意見です。AIが書いたかどうかは断定できません。</p>
      <section className="review-evidence" aria-label="原文と、その理由"><h3>どこを見て、そう考えた？</h3>{result.observations.length ? result.observations.map((o, i) => <article className={`review-example direction-${o.direction}`} key={i}><span>{observationLabels[o.direction]}</span><blockquote>{o.text}</blockquote><p>{o.reason}</p></article>) : <p className="review-empty-evidence">原文を引用した説明を取得できませんでした。下の項目別の説明を参考にしてください。</p>}</section>
      <details className="review-score-details" open={result.observations.length === 0}><summary>数値の内訳と、4つの観点を見る</summary><p>{reviewScoreNote}</p><p className="review-overall-score">文体の参考スコア：<strong>{result.score === null ? '今回は算出を保留' : `${result.score} / 100`}</strong>{result.score === null && <small>短さや根拠不足、異なる特徴の混在により、数値を出せるだけの判断材料がそろいませんでした。</small>}</p><div className="review-dimension-explanations" aria-label="4項目の文体レビュー">{result.dimensions.map(d => <article key={d.id}><h4>{dimensionNames[d.id]}<span>{d.score} / 100</span></h4><p>{d.explanation}</p></article>)}</div></details>
      {result.limitations.length > 0 && <details className="review-limits"><summary>今回の確認で分からないこと</summary><ul>{result.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
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
