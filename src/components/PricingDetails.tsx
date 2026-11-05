import { plans } from '../../billing/plans.mjs';

export default function PricingDetails() {
  return <>
    <p>無料の文章分析に加え、Basic・ProではDeepSeekによる詳細レポートを作成できます。両プランの違いは月間の利用語数です。</p>
    <div className="pricing-grid">
      <article className="pricing-card"><h2>Free</h2><p className="price">$0</p><p>ブラウザ内の文章分析、8つの統計指標、文ごとの特徴。登録不要で利用できます。基本AIレビューは回数制限があります。</p><a href="/#checker">無料でチェック →</a></article>
      {Object.entries(plans).map(([id,value]) => { const plan=value as {name:string;amount:string;firstAmount:string;words:number}; return <article key={id} className={`pricing-card ${id==='pro'?'featured':''}`}>
        <h2>{plan.name}</h2><p className="price">${plan.amount}<small> / 月</small></p><p className="intro-price">初月（30日間） ${plan.firstAmount}<br/><small>初回有料契約のみ。以降 ${plan.amount}/月</small></p>
        <ul><li>{plan.words.toLocaleString('ja-JP')}語 / 月</li><li>区分別の原文引用・解説・改善案</li><li>引用部分の書き換え例（未適用）</li><li>TXT保存・印刷 / PDF保存</li></ul><a className="text-link" href="/#account">ログイン・購入へ →</a>
      </article>; })}
    </div>
    <h2>請求・解約と利用枠</h2><p>米ドルの月額定期購入です。初回30日間の終了後、解約するまで通常月額で自動更新します。年払いはありません。税額と最終支払額は決済画面に表示されます。初回の割引は再契約やプラン変更で再適用されません。</p>
    <p>ログイン後の「契約・解約を管理」で次回更新を停止できます。支払済み期間の終了までは利用可能です。即時のプラン変更や重複購入は提供しません。変更する場合は現在の契約終了後に新規契約してください。</p>
    <p>日本語対応の単語分割で、空白・句読点を除く全文の語数を計算します。1回100〜10,000文字。作成成功ごとに語数を消費し、失敗時は利用枠を返します。再作成は再度消費します。未使用語数は繰り越されず、決済の各月次期間に更新されます。</p>
    <p>モデルの解説や書き換え例はAI生成の参考情報です。AI使用や執筆者の証明、盗作検査、事実確認ではありません。<a href="/privacy/#billing">購入・返金条件</a>、<a href="/privacy/#terms">利用条件</a>、<a href="/privacy/">プライバシー</a>をご確認ください。</p>
    <p>運営：支浩松（個人事業者、中国・江西省）。サポート・返金・解約のお問い合わせ：<a href="mailto:zhihaosong168+aibunsho@gmail.com">zhihaosong168+aibunsho@gmail.com</a></p>
  </>;
}
