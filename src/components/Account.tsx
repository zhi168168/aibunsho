import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, CreditCard, LogIn, LogOut, X } from 'lucide-react';

type User = { id: string; name: string; email: string };
type Capabilities = { configured: boolean; google: boolean; emailRegistration: boolean; passwordReset: boolean; checkoutEnabled: boolean };
type Status = { plan: string; fullReport: boolean; remainingWords: number; usedWords: number; words: number; periodEnd: number; mode: string; hasSubscription: boolean; introductoryEligible: boolean };
type View = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

async function api(path: string, body?: unknown) {
  const response = await fetch(`/api/${path}`, {method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
    headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const data = await response.json().catch(()=>({}));
  if (!response.ok) {
    const message = path.startsWith('auth/') ? (data.code==='EMAIL_NOT_VERIFIED' ? 'メールアドレスを確認してください。確認メールを再送できます。' : data.code==='USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ? 'このメールアドレスは登録済みです。ログインしてください。' : '手続きを完了できませんでした。入力内容やメールの確認状態を確認して再度お試しください。') : data.error || '決済サービスに接続できません。';
    throw new Error(message);
  }
  return data;
}
function preserveDraft() { window.dispatchEvent(new Event('aibunsho:preserve-draft')); }
function secureNavigate(value: string, google = false) {
  const url = new URL(value);
  if(url.protocol!=='https:' || url.username || url.password || (google && url.hostname!=='accounts.google.com')) throw new Error('安全な移動先を確認できませんでした。');
  preserveDraft(); window.location.assign(url.href);
}

export default function Account({ onUserChange }: { onUserChange?: (signedIn: boolean) => void }) {
  const [config,setConfig] = useState<Capabilities|null>(null);
  const [user,setUser] = useState<User|null>(null);
  const [status,setStatus] = useState<Status|null>(null);
  const [view,setView] = useState<View>('login');
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [agreed,setAgreed] = useState(false);
  const [open,setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { onUserChange?.(Boolean(user)); }, [user, onUserChange]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [open]);
  async function refresh() {
    try {
      const capabilities = await api('auth/config'); setConfig(capabilities);
      if (!capabilities.configured) return;
      const session = await api('auth/get-session'); setUser(session?.user||null);
      if(session?.user) {
        const order = new URLSearchParams(window.location.search).get('payment');
        try { setStatus(await (order && /^[a-f0-9]{32}$/.test(order) ? api('billing/reconcile',{orderId:order}) : api('billing/status'))); }
        catch(e) { setStatus(null);setMessage(e instanceof Error?e.message:'契約情報を取得できません。'); }
      } else setStatus(null);
    } catch { setMessage('アカウント情報を取得できません。再読み込みしてお試しください。'); }
    finally {setLoading(false);}
  }
  useEffect(()=>{
    const query=new URLSearchParams(window.location.search);
    if(query.get('view')==='reset') { setView('reset'); setOpen(true); }
    if(query.get('error')) { setMessage('認証リンクが無効か、期限切れです。もう一度お試しください。'); setOpen(true); }
    const fromHash=()=>{if(window.location.hash==='#account') setOpen(true);};
    fromHash();
    const show=(event:Event)=>{setView((event as CustomEvent).detail==='register'?'register':'login');setMessage('');setOpen(true);};
    window.addEventListener('aibunsho:open-account',show);
    window.addEventListener('hashchange',fromHash);
    void refresh();
    const update=()=>{void refresh();};
    window.addEventListener('aibunsho:usage',update);
    return()=>{window.removeEventListener('aibunsho:usage',update);window.removeEventListener('aibunsho:open-account',show);window.removeEventListener('hashchange',fromHash);};
  },[]);
  async function action(task:()=>Promise<void>) {
    setBusy(true);setMessage('');
    try {await task();}catch(e){setMessage(e instanceof Error?e.message:'手続きを完了できませんでした。');}finally{setBusy(false);}
  }
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=new FormData(e.currentTarget);
    const email=String(form.get('email')||'');const password=String(form.get('password')||'');
    await action(async()=>{
      const callbackURL=`${window.location.origin}/#account`;
      if(view==='login'){await api('auth/sign-in/email',{email,password,callbackURL});await refresh();setOpen(false);}
      if(view==='register'){
        await api('auth/sign-up/email',{name:String(form.get('name')),email,password,callbackURL});
        setMessage('確認メールを送信しました。メール内のリンクを開いてからログインしてください。');setView('login');
      }
      if(view==='forgot') {await api('auth/request-password-reset',{email,redirectTo:`${window.location.origin}/?view=reset#account`});setMessage('登録されている場合は、パスワード再設定メールが届きます。');}
      if(view==='verify') {await api('auth/send-verification-email',{email,callbackURL});setMessage('対象のアカウントに確認メールを送信しました。受信箱をご確認ください。');}
      if(view==='reset') {
        const token=new URLSearchParams(window.location.search).get('token');if(!token)throw new Error('再設定リンクが無効です。再度メールを申請してください。');
        await api('auth/reset-password',{newPassword:password,token});setView('login');setMessage('パスワードを更新しました。ログインしてください。');
        window.history.replaceState(null,'','/#account');
      }
    });
  }
  async function checkout(plan:string) {
    if(!user) {setView('login');setMessage('購入するにはログインしてください。');setOpen(true);return;}
    await action(async()=>{const result=await api('billing/checkout',{plan,agreed});secureNavigate(result.url);});
  }
  return <>
    <dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onCancel={e=>{e.preventDefault();setOpen(false);}} onClick={e=>{if(e.target===e.currentTarget){const rect=e.currentTarget.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)setOpen(false);}}}>
    <section className="account-section" id="account" aria-busy={loading}>
      <button className="icon-button account-close" onClick={()=>setOpen(false)} aria-label="アカウント画面を閉じる"><X size={20}/></button>
      <span className="section-index">YOUR ACCOUNT</span><h2 id="account-title">{user?'アカウント':({login:'ログイン',register:'新規登録',forgot:'パスワードの再設定',reset:'新しいパスワードを設定',verify:'確認メールを再送'})[view]}</h2>
      <p>無料チェックは登録不要。Basic・Proでは、原文を引用した詳しい説明と改善案を確認できます。</p>
      {loading ? <p role="status">アカウントを確認しています…</p> : user ? <div className="account-signed-in">
        <strong>{user.name}</strong><span>{user.email}</span>
        {status && <p>{status.plan==='free'?'無料プラン':status.plan.toUpperCase()} {status.fullReport && <> · 残り <b>{status.remainingWords.toLocaleString('ja-JP')}</b> / {status.words.toLocaleString('ja-JP')} 語<br/>更新日：{new Date(status.periodEnd).toLocaleString('ja-JP')}</>}</p>}
        <div className="account-buttons">{status?.hasSubscription && <button disabled={busy} onClick={()=>void action(async()=>{const result=await api('billing/manage',{});secureNavigate(result.url);})}><CreditCard size={16}/>契約・解約を管理</button>}
        <button disabled={busy} onClick={()=>void action(async()=>{await api('auth/sign-out',{});setUser(null);setStatus(null);window.dispatchEvent(new Event('aibunsho:signed-out'));})}><LogOut size={16}/>ログアウト</button>
        <button disabled={busy} onClick={()=>void action(refresh)}>契約情報を再確認</button></div>
      </div> : <div className="account-box">
        {['login','register'].includes(view) && <div className="account-tabs" aria-label="ログイン・新規登録"><button type="button" aria-pressed={view==='login'} disabled={busy} onClick={()=>{setView('login');setMessage('');}}>ログイン</button><button type="button" aria-pressed={view==='register'} disabled={busy} onClick={()=>{setView('register');setMessage('');}}>新規登録</button></div>}
        {!config?.configured && <p role="status">ログインサービスは準備中です。無料チェックは引き続き利用できます。</p>}
        {['login','register'].includes(view) && <><button className="google-signin" disabled={busy||!config?.google} onClick={()=>void action(async()=>{
          const result=await api('auth/sign-in/social',{provider:'google',callbackURL:`${window.location.origin}/#account`,errorCallbackURL:`${window.location.origin}/?error=auth#account`});secureNavigate(result.url,true);
        })}><LogIn size={17}/>Googleで続ける</button><div className="account-divider">またはメールアドレスで</div></>}
        <form onSubmit={e=>void submit(e)}><fieldset disabled={busy||!config?.configured}>
          {view==='register' && <label>お名前<input name="name" required autoComplete="name" maxLength={100}/></label>}
          {view!=='reset' && <label>メールアドレス<input name="email" type="email" required autoComplete="email" maxLength={254}/></label>}
          {['login','register','reset'].includes(view) && <label>パスワード<input name="password" type="password" required minLength={8} maxLength={128} autoComplete={view==='login'?'current-password':'new-password'}/><small>8文字以上</small></label>}
          {view==='register' && <p className="account-policy">登録前に<a href="/privacy/">プライバシーポリシー・利用条件</a>をご確認ください。</p>}
          <button type="submit" className="primary-button" disabled={busy||!config?.configured||(view!=='login'&&!config?.emailRegistration)}>{busy?'処理中…':({login:'ログイン',register:'登録して確認メールを送信',forgot:'再設定メールを送信',reset:'パスワードを更新',verify:'確認メールを再送'})[view]}</button>
        </fieldset></form>
        <div className="account-links">{(['login','register','forgot','verify'] as View[]).filter(v=>v!==view).map(v=><button key={v} disabled={busy} onClick={()=>{setView(v);setMessage('');}}>{({login:'ログイン',register:'新規登録',forgot:'パスワードを忘れた方',verify:'確認メールを再送',reset:''})[v]}</button>)}</div>
      </div>}
      {message && <p className="account-message" role="status">{message}</p>}
    </section>
    </dialog>
    <section className="section pricing-section" id="pricing">
      <span className="section-index">PLANS & PRICING</span><h2>文章を、もっと深く理解する。</h2><p>無料の基本分析から、原文の根拠・解説・改善案をまとめた詳細レポートへ。</p>
      {status && !config?.checkoutEnabled && <p className="account-message">購入受付は準備中です。無料チェックをご利用いただけます。</p>}
      <div className="pricing-grid">
        <article className="pricing-card"><h3>Free</h3><p className="price">$0</p><p>文章の特徴を手軽に確認</p><ul><li><Check size={15}/>AIレビューの総合スコア</li><li><Check size={15}/>構成・表現・具体性・一貫性の4項目</li><li><Check size={15}/>登録不要（回数制限あり）</li></ul><a className="text-link" href="#checker">無料でチェック →</a></article>
        {([{id:'basic',name:'Basic',price:'9.99',first:'4.99',words:'60,000'},{id:'pro',name:'Pro',price:'29.99',first:'14.99',words:'260,000'}]).map(plan=><article key={plan.id} className={`pricing-card ${plan.id==='pro'?'featured':''}`}>
          <h3>{plan.name}</h3><p className="price">${plan.price}<small> / 月</small></p><p className="intro-price">初月（30日間） ${plan.first}<br/><small>初回の有料契約のみ。以降 ${plan.price}/月</small></p>
          <ul><li><Check size={15}/><strong>{plan.words} 語 / 月</strong></li><li><Check size={15}/>完全な詳細レポート</li><li><Check size={15}/>原文を引用した詳しい説明</li><li><Check size={15}/>改善案・書き換え例</li><li><Check size={15}/>TXT保存・印刷 / PDF保存</li></ul>
          <button className="primary-button" disabled={busy||loading||!config?.checkoutEnabled||Boolean(user&&!status)||Boolean(status?.hasSubscription)||!agreed} onClick={()=>void checkout(plan.id)}>{status?.plan===plan.id?'ご利用中':!config?.checkoutEnabled?'購入受付準備中':`${plan.name}を申し込む`}</button>
        </article>)}
      </div>
      <label className="purchase-consent"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span><a href="/privacy/#billing">購入条件</a>を確認し、初月終了後は選択プランの通常月額で自動更新されることに同意します。</span></label>
      <p className="pricing-note">表示価格は米ドルです。税額・最終支払額は決済画面で確認できます。年払いはありません。解約は「契約・解約を管理」から行え、支払済み期間の終了まで利用できます。未使用の語数は繰り越されません。</p>
      <details className="pricing-note"><summary>語数・利用枠について</summary><p>日本語に対応した単語分割（Intl.Segmenter）で計算します。空白・句読点は数えません。文字数とは異なります。詳細レポートの作成ごとに全文の語数を消費し、失敗時は利用枠を返します。作成済みレポートを再表示しても追加消費はありません。1回100〜10,000文字。初回は30日間、以降は決済サービスの月次契約期間ごとに枠が更新されます。</p></details>
    </section>
  </>;
}
