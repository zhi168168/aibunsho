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
    let printDetails: { element: HTMLDetailsElement; open: boolean }[] = [];
    const beforePrint = () => { printDetails = Array.from(element?.querySelectorAll('details') ?? []).map(item => ({ element: item, open: item.open })); printDetails.forEach(item => { item.element.open = true; }); };
    const afterPrint = () => { printDetails.forEach(item => { item.element.open = item.open; }); printDetails = []; };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint); element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  function download() {
    const url = URL.createObjectURL(new Blob(['\ufeff' + advancedReportText(report)], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `ai-checker-advanced-${report.analyzedAt.slice(0, 10)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const reviewed = report.sections.filter(s => s.status !== 'unreviewed').length;
  const concerns = report.sections.filter(s => s.status !== 'keep');
  const kept = report.sections.filter(s => s.status === 'keep');
  function reviewCard(s: Report['sections'][number]) {
    return <section className={`report-paragraph status-${s.status}`} key={s.id}>
      <div className="report-paragraph-heading"><h3>{sectionLabels[s.status]}</h3></div>
      {s.quote && <div className="report-citation"><h4>この一文について</h4><blockquote>{s.quote}</blockquote></div>}
      <h4>{s.status === 'keep' ? '良いところ' : s.status === 'unreviewed' ? '確認できなかったこと' : '気になるところ'}</h4><p>{s.finding}</p>
      {s.suggestion && <><h4>どうすればよい？</h4><p>{s.suggestion}</p></>}
      {s.rewrite && <div className="report-rewrite"><h4>書き換えるなら、このように</h4><p>{s.rewrite}</p><small>引用した部分だけの提案です。原文は変更していません。</small></div>}
      <details className="report-source"><summary>前後の文章を読む</summary><p>{s.text}</p></details>
    </section>;
  }
  return createPortal(<dialog ref={dialog} className="advanced-report-dialog" aria-labelledby="advanced-report-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <div className="advanced-report-toolbar"><span>AIチェッカー / 詳細レポート</span><div><button onClick={download}><ArrowDownToLine size={15} /> TXT保存</button><button onClick={() => window.print()}><Printer size={15} /> 印刷 / PDF保存</button><button className="icon-button" onClick={onClose} aria-label="詳細レポートを閉じる"><X size={19} /></button></div></div>
    <article className="advanced-report-document">
      <header><span className="report-eyebrow">AIチェッカー · WRITING REVIEW</span><h1 id="advanced-report-title">文章の詳細レポート</h1><p>良いところと、直すと伝わりやすくなるところ。</p><div className="report-metadata"><span>{new Date(report.analyzedAt).toLocaleString('ja-JP')}</span><span>{report.analysis.characters.toLocaleString('ja-JP')}文字 · {report.sections.length}か所を確認</span><span>{report.provider} / {report.modelVersion}</span></div></header>
      <p className="advanced-report-notice">文体・読みやすさの補助レビューです。AI生成確率や執筆者の証明ではありません。原文は変更していません。入力変更・再読み込みでレポートは消えるため、必要な結果は保存してください。PDF保存は印刷画面で「PDFに保存」を選択してください。</p>
      <section><h2>まず、全体の評価</h2><p>{report.summary}</p>{reviewed !== report.sections.length && <p className="coverage-note incomplete">{report.sections.length - reviewed}か所を確認できませんでした。下の説明をご確認ください。</p>}<div className="report-findings-grid"><div><h3>この文章の良いところ</h3>{report.strengths.length ? <ul>{report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>具体的な指摘を取得できませんでした。</p>}</div><div><h3>見直すなら、ここから</h3>{report.priorities.length ? <ol>{report.priorities.map((s, i) => <li key={i}>{s}</li>)}</ol> : <p>大きく直す必要がある箇所は挙がっていません。</p>}</div></div></section>
      <section><h2>気になる箇所と、直し方</h2><p className="report-note">提案は任意です。文章の目的や伝えたいことに合うものだけ取り入れてください。</p>{concerns.length ? concerns.map(reviewCard) : <p>今回のレビューでは、修正や追加確認が必要な箇所は挙がりませんでした。</p>}</section>
      <section><details><summary>そのまま残してよいところ（{kept.length}件）</summary>{kept.map(reviewCard)}</details></section>
      <section><details><summary>このレポートで分からないこと</summary><ul>{report.limitations.map((s, i) => <li key={i}>{s}</li>)}</ul></details></section>
      <section className="report-original"><details><summary>入力した文章の全文</summary><p>{report.sourceText}</p></details></section>
      <footer><span>aibunsho.com · {report.version} · {report.analysis.version}</span><span>レポートID：{report.scanId}</span></footer>
    </article>
  </dialog>, document.body);
}
