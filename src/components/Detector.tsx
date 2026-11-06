import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowRight, ArrowUpRight, FileText, Info, LoaderCircle, LockKeyhole, ScanLine, Trash2, Upload, X } from 'lucide-react';
import { countChars, MAX_CHARS } from '../lib/analyzer';
import { importText } from '../lib/import-text';
import { openAccount, openPricing, openReportUpgrade } from '../lib/account-dialog';
import { modelReport, type ModelResult as ModelResultType, type ServiceStatus } from '../lib/model';
import ModelResult from './ModelResult';
import AnalysisLoading, { type AnalysisPhase } from './AnalysisLoading';
import AdvancedReport from './AdvancedReport';
import type { AdvancedReport as AdvancedReportType } from '../lib/advanced-report';

export default function Detector() {
  const [text, setText] = useState('');
  const [service, setService] = useState<ServiceStatus | null>(null);
  const [modelResult, setModelResult] = useState<ModelResultType | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('reading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedReportType | null>(null);
  const [advancedBusy, setAdvancedBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef(0);
  const upgradeTicket = useRef<number | null>(null);
  const count = countChars(text);
  const minimum = service?.minCharacters ?? 100;
  const provider = service?.provider ?? 'DeepSeek';
  const reviewMode = provider === 'DeepSeek';
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/detect', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(data => { if (data && typeof data.configured === 'boolean') setService(data); }).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('aibunsho:draft');
      if (draft) { setText(draft); sessionStorage.removeItem('aibunsho:draft'); }
    } catch { /* Storage may be disabled; analysis remains available. */ }
  }, []);
  useEffect(() => {
    const save = () => { try { sessionStorage.setItem('aibunsho:draft', text); } catch {} };
    const clear = () => { requestRef.current++; setAdvanced(null); setReportOpen(false); setAdvancedBusy(false); setBusy(false); };
    window.addEventListener('aibunsho:preserve-draft',save);
    window.addEventListener('aibunsho:signed-out',clear);
    return () => { window.removeEventListener('aibunsho:preserve-draft',save); window.removeEventListener('aibunsho:signed-out',clear); };
  }, [text]);
  function updateText(value: string) {
    requestRef.current++;
    setAdvanced(null); setAdvancedBusy(false); setReportOpen(false);
    setBusy(false); setText(value); setModelResult(null); setError(''); setNotice(''); setCopied(false);
  }
  async function loadFile(file?: File) {
    if (!file) return;
    const ticket = ++requestRef.current;
    try {
      const content = await importText(file);
      if (ticket !== requestRef.current) return;
      updateText(content); setNotice(`${file.name} を読み込みました。`);
    } catch (e) { if (ticket === requestRef.current) setError(e instanceof Error ? e.message : 'ファイルを読み込めませんでした。再度お試しください。'); }
  }
  async function runAnalysis() {
    if (busy || advancedBusy) return;
    if (count < minimum || count > MAX_CHARS) { setError(`${minimum}〜10,000文字の文章を入力してください。`); editorRef.current?.focus(); return; }
    const ticket = ++requestRef.current;
    const startedAt = performance.now();
    setBusy(true); setPhase('reading'); setError(''); setNotice(''); setModelResult(null); setCopied(false);
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
      const response = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(120000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AIレビューを完了できませんでした。');
      await prepareResult();
      if (ticket === requestRef.current) setModelResult(data as ModelResultType);
    } catch (e) { if (ticket === requestRef.current) setError(e instanceof Error ? e.message : '分析に失敗しました。'); }
    finally { if (ticket === requestRef.current) setBusy(false); }
  }
  useEffect(() => {
    const generate = () => { if(upgradeTicket.current===requestRef.current && modelResult) { upgradeTicket.current=null;void generateAdvanced(); } };
    window.addEventListener('aibunsho:generate-report',generate);
    return () => window.removeEventListener('aibunsho:generate-report',generate);
  }, [text, advanced, busy, advancedBusy, modelResult]);
  async function generateAdvanced() {
    if (advanced) { setReportOpen(true); return; }
    if (busy || advancedBusy || count < 100 || count > MAX_CHARS) return;
    const ticket = ++requestRef.current;
    setAdvancedBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, report: 'advanced' }), signal: AbortSignal.timeout(120000) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) openAccount();
        if (response.status === 402) openPricing();
        throw new Error(data.error || '詳細レポートを作成できませんでした。');
      }
      window.dispatchEvent(new Event('aibunsho:usage'));
      if (data.kind !== 'advanced' || !Array.isArray(data.sections)) throw new Error('詳細レポートの応答を読み取れませんでした。');
      if (ticket === requestRef.current) { setAdvanced(data as AdvancedReportType); setReportOpen(true); }
    } catch (e) { if (ticket === requestRef.current) setError(e instanceof Error ? e.message : '詳細レポートを作成できませんでした。'); }
    finally { if (ticket === requestRef.current) setAdvancedBusy(false); }
  }
  async function copyReport() {
    if (!modelResult) return;
    try { await navigator.clipboard.writeText(modelReport(modelResult)); setCopied(true); }
    catch { setError('コピーできませんでした。レポートをダウンロードしてください。'); }
  }
  function downloadReport() {
    if (!modelResult) return;
    const blob = new Blob(['\ufeff' + (modelReport(modelResult))], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ai-checker-report-${modelResult.analyzedAt.slice(0, 10)}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) { void loadFile(event.target.files?.[0]); event.target.value = ''; }
  function onDrop(event: DragEvent) { event.preventDefault(); setDragging(false); void loadFile(event.dataTransfer.files[0]); }

  return <section id="checker" className={`detector ${dragging ? 'dragging' : ''}`} aria-label="AIチェッカー 文章分析ツール" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={onDrop}>
    <div className="detector-toolbar"><span className="tool-name"><ScanLine size={16} /> テキストチェッカー</span><span className="local-status"><i /> {service?.configured ? service.sandbox ? 'テストモード' : '無料AIレビュー' : '準備中'}</span></div>
    <div className="workspace">
      <div className="editor-pane">
        <div className="pane-heading"><label htmlFor="check-text">チェックする文章</label></div>
        <textarea id="check-text" ref={editorRef} value={text} onChange={e => updateText(e.target.value)} placeholder={'ここに文章を貼り付けてください。\n\n文章のリズムや表現の特徴を分析し、\nAIらしさを考えるヒントを見つけます。'} spellCheck={false} aria-describedby="text-limits" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); void runAnalysis(); } }} />
        <div className="editor-meta"><span id="text-limits" className={count > MAX_CHARS ? 'over-limit' : ''}><b>{count.toLocaleString('ja-JP')}</b> / 10,000 文字</span><button className="icon-button" onClick={() => { updateText(''); editorRef.current?.focus(); }} aria-label="文章をクリア" disabled={!text}><Trash2 size={15} /></button></div>
        <div className="editor-actions"><button className="upload-button" onClick={() => fileRef.current?.click()}><Upload size={15} /> TXT・Word を読み込む</button><span>{minimum}文字以上</span><input ref={fileRef} type="file" accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onFileChange} hidden aria-label="TXT・Wordファイルを選択" /></div>
        <p className="import-hint">TXT・Word（.docx）対応。ファイルをここにドラッグしても読み込めます。</p>
        <div className="check-actions"><button className="primary-button" disabled={busy || advancedBusy || count < minimum || count > MAX_CHARS || (!service?.configured)} onClick={() => void runAnalysis()}>{busy ? <LoaderCircle size={17} className="spin" /> : <ScanLine size={17} />} {busy ? '分析しています' : service?.sandbox ? 'テスト判定を開始' : '無料でチェックを開始'}<ArrowRight size={16} /></button><small>登録不要・無料</small></div>
        <div className="check-privacy"><span><LockKeyhole size={13} /> {`開始すると文章が${provider}に送信されます。${reviewMode ? '入力と生成結果をWaffoで内容確認します。' : ''}`}</span></div>
      </div>
      <div className="results-pane" aria-busy={busy}>
        <div className="pane-heading"><span>分析結果</span><span className={`result-status ${modelResult ? 'done' : ''}`}>{busy ? '分析中' : modelResult ? '分析完了' : '入力待ち'}</span></div>
        <div className="results-content" aria-live="polite">
          {!modelResult && !busy && <div className="empty-result"><div className="scan-illustration" aria-hidden="true"><span className="scan-corner top-left" /><span className="scan-corner top-right" /><span className="scan-corner bottom-left" /><span className="scan-corner bottom-right" /><FileText size={31} strokeWidth={1.1} /><span className="scan-beam" /></div><h2>{!service?.configured ? `${reviewMode ? 'AIレビュー' : 'AI判定'}は、ただいま準備中。` : 'その文章を、もう少し深く。'}</h2><p>{!service?.configured ? <>現在、モデルサービスの接続を確認しています。<br />しばらくしてから再度お試しください。</> : <>文章を入力して、チェックを開始。<br />分析結果がここに表示されます。</>}</p><div className="empty-signal"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></div>}
          {busy && <AnalysisLoading phase={phase} model={true} />}
          {modelResult && <ModelResult result={modelResult} copied={copied} onCopy={() => void copyReport()} onDownload={downloadReport} onAdvanced={()=>{if(advanced){setReportOpen(true);}else{upgradeTicket.current=requestRef.current;openReportUpgrade();}}} advancedBusy={advancedBusy} />}

        </div>
      </div>
    </div>
    {reportOpen && advanced && <AdvancedReport report={advanced} onClose={() => setReportOpen(false)} />}
    {(error || notice) && <div role={error ? 'alert' : 'status'} className={`feedback ${error ? 'error' : ''}`}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }} aria-label="通知を閉じる"><X size={14} /></button></div>}
    <div className="method-note"><Info size={13} /><p>{<>{provider}の結果は参考情報です。<a href={reviewMode ? 'https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html' : 'https://copyleaks.com/privacy-policy'} target="_blank" rel="noreferrer">提供元のプライバシー <ArrowUpRight size={11} /></a>{service?.sandbox && <strong> テストモード：固定応答が返されます。実際の判定ではありません。</strong>}</>}</p></div>
  </section>;
}
