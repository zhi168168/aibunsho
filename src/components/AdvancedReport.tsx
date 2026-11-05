import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownToLine, Printer, X } from 'lucide-react';
import { advancedReportText, sectionLabels, type AdvancedReport as Report } from '../lib/advanced-report';

export default function AdvancedReport({ report, onClose }: { report: Report; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  function download() {
    const url = URL.createObjectURL(new Blob(['\ufeff' + advancedReportText(report)], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `ai-checker-advanced-${report.analyzedAt.slice(0, 10)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const reviewed = report.sections.filter(s => s.status !== 'unreviewed').length;
  return createPortal(<dialog ref={dialog} className="advanced-report-dialog" aria-labelledby="advanced-report-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="advanced-report-toolbar"><span>AIチェッカー / 詳細レポート</span><div><button onClick={download}><ArrowDownToLine size={15} /> TXT保存</button><button onClick={() => window.print()}><Printer size={15} /> 印刷 / PDF保存</button><button className="icon-button" onClick={onClose} aria-label="詳細レポートを閉じる"><X size={19} /></button></div></div>
    <article className="advanced-report-document">
      <header><span className="report-eyebrow">AIチェッカー · WRITING REVIEW</span><h1 id="advanced-report-title">文章の詳細レポート</h1><p>原文を読み解き、次の修正へ。</p><div className="report-metadata"><span>{new Date(report.analyzedAt).toLocaleString('ja-JP')}</span><span>{report.analysis.characters.toLocaleString('ja-JP')}文字 · {report.sections.length}区分</span><span>{report.provider} / {report.modelVersion}</span></div></header>
      <p className="advanced-report-notice">文体・読みやすさの補助レビューです。AI生成確率や執筆者の証明ではありません。原文は変更していません。入力変更・再読み込みでレポートは消えるため、必要な結果は保存してください。PDF保存は印刷画面で「PDFに保存」を選択してください。</p>
      <section><h2>01 / 総評</h2><p>{report.summary}</p><p className={`coverage-note ${reviewed !== report.sections.length ? 'incomplete' : ''}`}>有効な原文引用付きレビュー：{reviewed} / {report.sections.length}区分{reviewed !== report.sections.length ? '（一部未取得）' : ''}。長文は分割し、短い段落が多い場合はまとめて表示しています。</p><div className="report-findings-grid"><div><h3>維持したい点</h3>{report.strengths.length ? <ul>{report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>十分な指摘は取得できませんでした。</p>}</div><div><h3>優先して確認する点</h3>{report.priorities.length ? <ol>{report.priorities.map((s, i) => <li key={i}>{s}</li>)}</ol> : <p>追加の確認事項は取得できませんでした。</p>}</div></div></section>
      <section><h2>02 / 文章の観測指標</h2><p className="report-note">ルールによる観測値です。AI生成確率ではありません。</p><div className="report-metrics">{report.analysis.signals.map(s => <div key={s.id}><h3>{s.name}<span>{s.available ? `${s.value} / 100` : '算出不可'}</span></h3><p>{s.detail}</p></div>)}</div></section>
      <section><h2>03 / 原文と区分別レビュー</h2><p className="report-note">書き換え例は根拠の引用部分だけの提案です。自動適用されません。意味・事実・出典を確認してから利用してください。</p>{report.sections.map(s => <section className={`report-paragraph status-${s.status}`} key={s.id}><div className="report-paragraph-heading"><h3>区分 {String(s.id).padStart(2, '0')}</h3><span>{sectionLabels[s.status]}</span></div><div className="report-source"><span>原文</span><p>{s.text}</p></div>{s.quote && <div className="report-citation"><h4>着目した原文</h4><blockquote>{s.quote}</blockquote></div>}<h4>{s.status === 'unreviewed' ? '取得状況' : '根拠と解釈'}</h4><p>{s.finding}</p>{s.suggestion && <><h4>確認・改善案</h4><p>{s.suggestion}</p></>}{s.rewrite && <div className="report-rewrite"><h4>引用部分の書き換え例 · 未適用</h4><p>{s.rewrite}</p></div>}</section>)}</section>
      <section><h2>04 / 評価の限界</h2><ul>{[...report.limitations, ...report.analysis.cautions, ...(report.analysis.limited ? ['短さ・文数・言語のため統計評価の材料が限られています。'] : []), 'スコアを下げるためではなく、文章の目的に合うかを基準に見直してください。'].map((s, i) => <li key={i}>{s}</li>)}</ul></section>
      <section className="report-original"><h2>05 / 入力原文（全文）</h2><p>{report.sourceText}</p></section>
      <footer><span>aibunsho.com · {report.version} · {report.analysis.version}</span><span>レポートID：{report.scanId}</span></footer>
    </article>
  </dialog>, document.body);
}
