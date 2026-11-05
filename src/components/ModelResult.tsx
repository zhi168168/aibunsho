import { AlertTriangle, ArrowDownToLine, Check, Copy } from 'lucide-react';
import type { ModelResult as ModelResultType } from '../lib/model';
export default function ModelResult({ result, copied, onCopy, onDownload }: { result: ModelResultType; copied: boolean; onCopy: () => void; onDownload: () => void }) {
  if (result.provider === 'DeepSeek') return <div className="model-result deepseek-result">
    <div className="score-block"><div className="score-ring" style={{ '--score': `${result.score}%` } as React.CSSProperties}><span><b>{result.score}</b><small>/ 100</small></span></div><div><span className="score-label">DeepSeek 補助レビュー</span><h2>AI的な文体特徴の参考スコア</h2><p>AI生成確率ではなく、モデルの主観的な評価です。</p></div></div>
    <p className="review-summary">{result.summary}</p>
    <div className="model-sections"><p>原文に基づく観察</p>{result.observations.length ? result.observations.map((o, i) => <article className="review-observation" key={i}><blockquote>{o.text}</blockquote><p>{o.reason}</p></article>) : <p>具体的な根拠は十分に確認できませんでした。文章だけでAI使用は判断できません。</p>}</div>
    <p className="model-disclaimer">汎用の言語モデルによる文体レビューです。専用のAI検出器ではなく、執筆者やAI使用を証明するものではありません。</p>
    <div className="report-actions"><span>DeepSeek · {result.modelVersion}</span><button className="icon-button" onClick={onCopy} aria-label={copied ? 'コピーしました' : 'レポートをコピー'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={onDownload} aria-label="レポートをダウンロード"><ArrowDownToLine size={15} /></button></div>
  </div>;
  return <div className="model-result">
    {result.sandbox && <div className="sandbox-note"><AlertTriangle size={15} /><span>テスト応答です。文章の実際の判定ではありません。</span></div>}
    <div className="score-block"><div className="score-ring" style={{ '--score': `${result.ai * 100}%` } as React.CSSProperties}><span><b>{Math.round(result.ai * 100)}</b><small>%</small></span></div><div><span className="score-label">Copyleaks モデル判定</span><h2>AIと分類された割合</h2><p>文章の分類結果であり、執筆者を証明しません。</p></div></div>
    <div className="model-legend"><span><i /> AIの傾向 <b>{Math.round(result.ai * 100)}%</b></span><span><i /> 人間の傾向 <b>{Math.round(result.human * 100)}%</b></span></div>
    <div className="model-sections"><p>テキスト区分ごとの判定</p>{result.sections.length ? result.sections.map((section, i) => <article className={`sentence ${section.classification === 2 ? 'high' : 'low'}`} key={i}><span className="sentence-number">{String(i + 1).padStart(2, '0')}</span><div><small>{section.classification === 2 ? 'AIの傾向' : '人間の傾向'} · 分類の信頼度 {Math.round(section.probability * 100)}%</small>{section.excerpts.length ? section.excerpts.map((e, j) => <p key={j}>{e.text}</p>) : <p>この区分のテキスト範囲は提供されませんでした。</p>}</div></article>) : <p>区分ごとの結果は提供されませんでした。</p>}</div>
    <p className="model-disclaimer">日本語では、AI Logicによる短語レベルの理由は提供されません。</p>
    <div className="report-actions"><span>Copyleaks · {result.modelVersion}</span><button className="icon-button" onClick={onCopy} aria-label={copied ? 'コピーしました' : 'レポートをコピー'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={onDownload} aria-label="レポートをダウンロード"><ArrowDownToLine size={15} /></button></div>
  </div>;
}
