import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, Copy, FileText, Info, LoaderCircle, LockKeyhole, ScanLine, TextCursorInput, Trash2, Upload, X } from 'lucide-react';
import { analyzeText, countChars, MAX_CHARS, MIN_CHARS, reportText, type Analysis } from '../lib/analyzer';
import { samples } from '../lib/samples';
import { modelReport, type ModelResult as ModelResultType, type ServiceStatus } from '../lib/model';
import ModelResult from './ModelResult';
import AnalysisLoading, { type AnalysisPhase } from './AnalysisLoading';
import AdvancedReport from './AdvancedReport';
import type { AdvancedReport as AdvancedReportType } from '../lib/advanced-report';

type ResultTab = 'overview' | 'sentences';
export default function Detector() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'local' | 'model'>('local');
  const [service, setService] = useState<ServiceStatus | null>(null);
  const [modelResult, setModelResult] = useState<ModelResultType | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('reading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<ResultTab>('overview');
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedReportType | null>(null);
  const [advancedBusy, setAdvancedBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef(0);
  const count = countChars(text);
  const minimum = mode === 'model' ? (service?.minCharacters ?? 100) : MIN_CHARS;
  const provider = service?.provider ?? 'DeepSeek';
  const reviewMode = provider === 'DeepSeek';
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/detect', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => { if (data && typeof data.configured === 'boolean') setService(data); }).catch(() => {});
    return () => controller.abort();
  }, []);

  function updateText(value: string) {
    requestRef.current++;
    setAdvanced(null); setAdvancedBusy(false); setReportOpen(false);
    setBusy(false); setText(value); setResult(null); setModelResult(null); setError(''); setNotice(''); setCopied(false);
  }
  async function loadFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.txt')) { setError('UTF-8形式の .txt ファイルを選択してください。'); return; }
    if (file.size > 200000) { setError('ファイルは200 KB以下にしてください。'); return; }
    const ticket = ++requestRef.current;
    try {
      const content = await file.text();
      if (ticket !== requestRef.current) return;
      if (content.includes('\ufffd')) { setError('文字コードを読み取れません。UTF-8で保存してから再度お試しください。'); return; }
      if (countChars(content) > MAX_CHARS) { setError('10,000文字以内のファイルを選択してください。'); return; }
      updateText(content); setNotice(`${file.name} を読み込みました。`);
    } catch { setError('ファイルを読み込めませんでした。再度お試しください。'); }
  }
  async function runAnalysis() {
    if (busy || advancedBusy) return;
    if (count < minimum || count > MAX_CHARS) { setError(`${minimum}〜10,000文字の文章を入力してください。`); editorRef.current?.focus(); return; }
    const ticket = ++requestRef.current;
    const startedAt = performance.now();
    setBusy(true); setPhase('reading'); setError(''); setNotice(''); setResult(null); setModelResult(null); setCopied(false);
    // Briefly show the reading transition; never delay the provider request for a full animation cycle.
    await new Promise<void>(resolve => setTimeout(resolve, 180));
    if (ticket !== requestRef.current) return;
    setPhase('analyzing');
    async function prepareResult() {
      if (ticket !== requestRef.current) return;
      setPhase('preparing');
      // Keep very fast local checks legible, with no added wait for slower API calls.
      await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, 1100 - (performance.now() - startedAt))));
    }
    try {
      if (mode === 'model') {
        const response = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(65000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'AI判定を完了できませんでした。');
        await prepareResult();
        if (ticket === requestRef.current) setModelResult(data as ModelResultType);
      } else {
        const next = analyzeText(text);
        await prepareResult();
        if (ticket === requestRef.current) { setResult(next); setTab('overview'); }
      }
    } catch (e) { if (ticket === requestRef.current) setError(e instanceof Error ? e.message : '分析に失敗しました。'); }
    finally { if (ticket === requestRef.current) setBusy(false); }
  }
  async function generateAdvanced() {
    if (advanced) { setReportOpen(true); return; }
    if (busy || advancedBusy || count < 100 || count > MAX_CHARS) return;
    const ticket = ++requestRef.current;
    setAdvancedBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, report: 'advanced' }), signal: AbortSignal.timeout(65000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '詳細レポートを作成できませんでした。');
      if (data.kind !== 'advanced' || !Array.isArray(data.sections)) throw new Error('詳細レポートの応答を読み取れませんでした。');
      if (ticket === requestRef.current) { setAdvanced(data as AdvancedReportType); setReportOpen(true); }
    } catch (e) { if (ticket === requestRef.current) setError(e instanceof Error ? e.message : '詳細レポートを作成できませんでした。'); }
    finally { if (ticket === requestRef.current) setAdvancedBusy(false); }
  }
  async function copyReport() {
    if (!result && !modelResult) return;
    try { await navigator.clipboard.writeText(modelResult ? modelReport(modelResult) : reportText(result!)); setCopied(true); }
    catch { setError('コピーできませんでした。レポートをダウンロードしてください。'); }
  }
  function downloadReport() {
    if (!result && !modelResult) return;
    const blob = new Blob(['\ufeff' + (modelResult ? modelReport(modelResult) : reportText(result!))], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ai-checker-${modelResult ? 'model' : 'style'}-report-${(modelResult || result)!.analyzedAt.slice(0, 10)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) { void loadFile(event.target.files?.[0]); event.target.value = ''; }
  function onDrop(event: DragEvent) { event.preventDefault(); setDragging(false); void loadFile(event.dataTransfer.files[0]); }

  return <section id="checker" className={`detector ${dragging ? 'dragging' : ''}`} aria-label="AIチェッカー 文章分析ツール" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={onDrop}>
    <div className="detector-toolbar"><span className="tool-name"><ScanLine size={16} /> テキストチェッカー</span><div className="engine-switch" role="group" aria-label="分析エンジン"><button aria-pressed={mode === 'local'} onClick={() => { updateText(text); setMode('local'); }}>文章分析</button><button aria-pressed={mode === 'model'} onClick={() => { updateText(text); setMode('model'); }}>{reviewMode ? 'AIレビュー' : 'AI判定'}</button></div><span className="local-status"><i /> {mode === 'local' ? 'ブラウザ内で分析' : service?.configured ? service.sandbox ? 'テストモード' : `${provider} API` : '準備中'}</span></div>
    <div className="workspace">
      <div className="editor-pane">
        <div className="pane-heading"><label htmlFor="check-text">チェックする文章</label><span className="language-label">日本語 <ChevronDown size={12} /></span></div>
        <textarea id="check-text" ref={editorRef} value={text} onChange={e => updateText(e.target.value)} placeholder={'ここに文章を貼り付けてください。\n\n文章のリズムや表現の特徴を分析し、\nAIらしさを考えるヒントを見つけます。'} spellCheck={false} aria-describedby="text-limits" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void runAnalysis(); } }} />
        <div className="editor-meta"><span id="text-limits" className={count > MAX_CHARS ? 'over-limit' : ''}><b>{count.toLocaleString('ja-JP')}</b> / 10,000 文字</span><button className="icon-button" onClick={() => { updateText(''); editorRef.current?.focus(); }} aria-label="文章をクリア" disabled={!text}><Trash2 size={15} /></button></div>
        <div className="editor-bottom"><span>サンプルを試す</span><div className="sample-buttons"><button onClick={() => updateText(samples.structured)}><ScanLine size={13} /> 定型的な文章</button><button onClick={() => updateText(samples.personal)}><TextCursorInput size={13} /> 自然な文章</button></div></div>
        <div className="editor-actions"><button className="upload-button" onClick={() => fileRef.current?.click()}><Upload size={15} /> TXT を読み込む</button><span>{minimum}文字以上</span><input ref={fileRef} type="file" accept=".txt,text/plain" onChange={onFileChange} hidden aria-label="TXTファイルを選択" /></div>
      </div>
      <div className="results-pane" aria-busy={busy}>
        <div className="pane-heading"><span>分析結果</span><span className={`result-status ${result || modelResult ? 'done' : ''}`}>{busy ? '分析中' : result || modelResult ? '分析完了' : '入力待ち'}</span></div>
        <div className="results-content" aria-live="polite">
          {!result && !modelResult && !busy && <div className="empty-result"><div className="scan-illustration" aria-hidden="true"><span className="scan-corner top-left" /><span className="scan-corner top-right" /><span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" /><FileText size={31} strokeWidth={1.1} /><span className="scan-beam" /></div><h2>{mode === 'model' && !service?.configured ? `${reviewMode ? 'AIレビュー' : 'AI判定'}は、ただいま準備中。` : 'その文章を、もう少し深く。'}</h2><p>{mode === 'model' && !service?.configured ? <>現在は文章分析をご利用いただけます。<br />文章の特徴を無料で確認できます。</> : <>文章を入力して、チェックを開始。<br />分析結果がここに表示されます。</>}</p><div className="empty-signal"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></div>}
          {busy && <AnalysisLoading phase={phase} model={mode === 'model'} provider={provider} />}
          {modelResult && <ModelResult result={modelResult} copied={copied} onCopy={() => void copyReport()} onDownload={downloadReport} />}
          {result && <>
            <div className="result-tabs" role="tablist" aria-label="分析表示"><button id="overview-tab" role="tab" aria-selected={tab === 'overview'} aria-controls="result-overview" onClick={() => setTab('overview')}>分析サマリー</button><button id="sentences-tab" role="tab" aria-selected={tab === 'sentences'} aria-controls="result-sentences" onClick={() => setTab('sentences')}>文ごとの特徴 <span>{result.sentenceCount}</span></button></div>
            {tab === 'overview' ? <div id="result-overview" role="tabpanel" aria-labelledby="overview-tab" className="overview-result"><div className="score-block"><div className="score-ring" style={{ '--score': `${result.score}%` } as React.CSSProperties}><span><b>{result.score}</b><small>/ 100</small></span></div><div><span className="score-label">文章の規則性スコア</span><h2>{result.score >= 65 ? '整ったパターンが見られます' : result.score >= 35 ? 'いくつかの特徴が見られます' : '表現にばらつきがあります'}</h2><p>AI生成の確率を示すものではありません。</p></div></div><div className="signal-list">{result.signals.map(signal => <div className="signal" key={signal.id}><div><span>{signal.name}</span><span>{signal.available ? <><b>{signal.value}</b><small> / 100</small></> : '—'}</span></div><div className="signal-track"><i style={{ width: signal.available ? `${signal.value}%` : '0%' }} /></div><span className="signal-description">{signal.detail}</span></div>)}</div>{result.cautions.length > 0 && <details className="review-limitations"><summary>文章の形式に関する注意（{result.cautions.length}件）</summary><ul>{result.cautions.map(note => <li key={note}>{note}</li>)}</ul></details>}{result.limited && <p className="limited-note"><Info size={13} /> 短さ・文数・言語により、十分に評価できない場合があります。</p>}</div> : <div id="result-sentences" role="tabpanel" aria-labelledby="sentences-tab" className="sentence-result"><p className="sentence-intro">色が濃いほど、定型表現や文末の反復が多い文です。</p><div className="sentence-list">{result.sentences.map((sentence, index) => <div className={`sentence ${sentence.score >= 60 ? 'high' : sentence.score >= 25 ? 'medium' : 'low'}`} key={index}><span className="sentence-number">{String(index + 1).padStart(2, '0')}</span><div><p>{sentence.text}</p><small>{sentence.evidence.join(' · ') || '定義済みの特徴なし'}</small></div></div>)}</div></div>}
            <div className="report-actions"><span><CheckCheck size={13} /> {result.characters}文字・{result.sentenceCount}文を分析</span><button className="icon-button" onClick={() => void copyReport()} aria-label={copied ? 'コピーしました' : 'レポートをコピー'}>{copied ? <Check size={15} /> : <Copy size={15} />}</button><button className="icon-button" onClick={downloadReport} aria-label="レポートをダウンロード"><ArrowDownToLine size={15} /></button></div>
          </>}
        </div>
      </div>
    </div>
    <div className="advanced-report-entry" aria-busy={advancedBusy}><div><span className="report-eyebrow">DETAILED WRITING REVIEW</span><h3>原文の根拠から、具体的な改善案まで。</h3><p>区分別の解説・書き換え例・8指標を1つのレポートに。印刷・PDF保存に対応。</p><small>{advanced ? '作成済みのレポートを再表示します。追加の送信はありません。' : '作成時に全文をDeepSeekへ送信します。通常レビューとは別に1回の利用として数えます。現在は無料で提供・回数制限あり。'}</small></div><button className="primary-button" disabled={busy || advancedBusy || count < 100 || count > MAX_CHARS || !service?.configured || !reviewMode} onClick={() => void generateAdvanced()}>{advancedBusy ? <LoaderCircle size={17} className="spin" /> : <FileText size={17} />}{advancedBusy ? '詳細レポートを作成中…' : advanced ? '詳細レポートを開く' : '詳細レポートを作成'}</button>{advancedBusy && <p className="advanced-progress" role="status">原文の各区分と改善案を確認しています。このままお待ちください。</p>}{(!service?.configured || !reviewMode) && <small>詳細レポートはDeepSeek提供時に利用できます。</small>}</div>
    {reportOpen && advanced && <AdvancedReport report={advanced} onClose={() => setReportOpen(false)} />}
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`feedback ${error ? 'error' : ''}`}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="通知を閉じる"><X size={14} /></button></div>}
    <div className="detector-footer"><span><LockKeyhole size={13} /> {mode === 'local' ? '文章分析は外部への送信・保存なし。' : `開始すると文章が${provider}に送信されます。`}</span><button className="primary-button" disabled={busy || advancedBusy || count < minimum || count > MAX_CHARS || (mode === 'model' && !service?.configured)} onClick={() => void runAnalysis()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ScanLine size={17} />} {busy ? '分析しています' : mode === 'model' ? service?.sandbox ? 'テスト判定を開始' : reviewMode ? 'AIレビューを開始' : 'AI判定を開始' : '無料でチェックする'}<ArrowRight size={16} /></button></div>
    <div className="method-note"><Info size={13} /><p>{mode === 'model' ? <>{provider}の結果は参考情報です。<a href={reviewMode ? 'https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html' : 'https://copyleaks.com/privacy-policy'} target="_blank" rel="noreferrer">提供元のプライバシー <ArrowUpRight size={11} /></a>{service?.sandbox && <strong> テストモード：固定応答が返されます。実際の判定ではありません。</strong>}</> : <>統計的な文章分析による参考指標です。AIの使用を断定するものではありません。<a href="#method">分析の仕組み <ArrowUpRight size={11} /></a></>}</p></div>
  </section>;
}
