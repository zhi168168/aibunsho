import { AlertTriangle, ArrowDownToLine, ArrowRight, Check, Copy, FileText, LoaderCircle } from 'lucide-react';
import { freeReviewReasons, reviewConclusions, type ModelResult as ModelResultType } from '../lib/model';
export default function ModelResult({ result, copied, onCopy, onDownload, onAdvanced, advancedBusy = false }: { result: ModelResultType; copied: boolean; onCopy: () => void; onDownload: () => void; onAdvanced?: () => void; advancedBusy?: boolean }) {
  if (result.provider === 'DeepSeek') {
    return <div className="model-result deepseek-result">
      <div className="free-review-conclusion"><span className="report-eyebrow">チェック結果</span><div className="free-review-score"><strong>{result.score === null ? '判断を保留' : result.score}<span>{result.score === null ? '' : '/ 100'}</span></strong><span>AI文章の傾向 · 参考スコア</span></div><h2>{reviewConclusions[result.assessment]}</h2><p>AIが書いた確率ではありません。文章だけでAI使用を断定できません。</p></div>
      <section className="free-review-reasons" aria-label="主な理由"><h3>主な理由</h3>{freeReviewReasons(result).length ? <ul>{freeReviewReasons(result).map((reason, i)=><li key={i}>{reason}</li>)}</ul> : <p>判断できるだけの根拠を取得できませんでした。</p>}</section>
      <div className="report-actions"><span>無料チェック結果</span><button className="icon-button" onClick={onCopy} aria-label={copied ? 'コピーしました' : 'レポートをコピー'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={onDownload} aria-label="レポートをダウンロード"><ArrowDownToLine size={15} /></button></div>
      {onAdvanced && <div className="free-review-upgrade"><button className="primary-button" disabled={advancedBusy} onClick={onAdvanced}>{advancedBusy ? <LoaderCircle size={17} className="spin"/> : <FileText size={17}/>} {advancedBusy?'詳細分析レポートを作成中…':'詳細分析レポートを見る'}<ArrowRight size={16}/></button><p>原文ごとの詳しい説明・改善案・書き換え例を確認。Basic・Pro対象。</p></div>}
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
