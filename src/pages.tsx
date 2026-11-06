import FooterBadges from './components/FooterBadges';
import { policies } from './App';
import PricingDetails from './components/PricingDetails';

export const pages = [
  { path: '/pricing/', title: '料金プラン・月額詳細レポート｜AIチェッカー', description: 'Basicは月額9.99米ドル・初月4.99米ドル・月6万語。Proは月額29.99米ドル・初月14.99米ドル・月26万語。自動更新、解約、利用語数の条件をご確認ください。' },
  { path: '/ai-checker/guide/', title: 'AIチェッカーの使い方・スコアの読み方｜日本語文章ガイド', description: 'AIチェッカーの入力方法、無料チェックと詳細レポートの違い、スコアの限界を解説。日本語のレポートや記事を見直す具体例と参考資料を確認できます。' },
  { path: '/privacy/', title: 'プライバシーポリシー・利用条件｜AIチェッカー', description: 'AIチェッカーの入力文章の扱い、外部サービスへの送信、保存方針と利用条件を説明します。文章の送信先と利用条件をご確認ください。' },
];

export function InformationPage({ path }: { path: string }) {
  const page = pages.find(page => page.path === path)!;
  return <>
    <header className="site-header"><a href="/">AIチェッカー</a><nav className="information-nav" aria-label="ページナビゲーション"><a href="/ai-checker/guide/">使い方ガイド</a><a href="/privacy/">プライバシー</a></nav></header>
    <main className="main-container information-page"><article className="section guide-section">
      <p><a href="/">AIチェッカー ホーム</a> / {path === '/pricing/' ? '料金プラン' : path === '/privacy/' ? 'プライバシーと利用条件' : '使い方ガイド'}</p>
      <h1>{page.title.split('｜')[0]}</h1>
      {path === '/pricing/' ? <PricingDetails /> : path === '/privacy/' ? <>
        <p>無料チェックと詳細レポートは、表示中の外部サービスへ文章を送信して処理します。</p>
        {Object.entries(policies).map(([key, value]) => <section key={key} id={key}><h2>{value.title}</h2><p>{value.content}</p></section>)}
        <section id="operator"><h2>運営者・お問い合わせ</h2><p>運営：支浩松（個人事業者）。所在地の国・地域：中国・江西省。サポート、解約、返金、プライバシーや不適切な生成内容の報告は <a href="mailto:zhihaosong168+aibunsho@gmail.com">zhihaosong168+aibunsho@gmail.com</a> へご連絡ください。パスワード、認証用リンク、カード番号は送らないでください。</p></section>
        <section id="data-rights"><h2>データ処理・保持・利用者の権利</h2><p>アカウントと利用枠はNeonのPostgreSQLに保存し、Vercel上のサーバーで処理します。Googleはログイン時の基本プロフィールとメールアドレス、Resendは確認・再設定メールの宛先と本文、Waffoは決済・契約管理に必要な購入者識別子とメールアドレスを処理します。パスワードはハッシュ化し、決済カード情報は保存しません。契約中のサービス提供、セキュリティ、会計などに必要な間、関連記録を保持します。データの確認、訂正、削除、利用制限などは上記窓口へ申請できます。法令上必要な記録は申請後も保持することがあります。</p><p>モデル機能では入力と生成された解説をWaffo Prompt Siftで確認し、許可された内容だけを処理・表示します。Waffoの仕様では原文はこの検査後に保持されません。当サイトには原文を保存せず、内容のハッシュ、判定、理由コード、検査IDを30日間保持します。DeepSeekでの処理・保持は同社の方針に従います。</p></section>
        <section id="acceptable-use"><h2>禁止用途・コンテンツの扱い</h2><p>違法な内容、性的・露骨な内容、児童の性的搾取、不当な暴力・残虐表現、憎悪・差別、他者へのなりすましや深度偽造、著作権・商標の侵害を助長する内容の生成は禁止します。試験の不正や代筆、検出回避を目的とする使用も禁止します。入力文に対する文体の参考レビューを提供し、他者を処分するための証拠としては使用できません。</p><p>モデル処理の前後に自動の内容確認を行い、拒否・要確認・確認サービス障害時は生成または表示を停止します。失敗した詳細レポートの語数は返します。重大な悪用や権利侵害が確認された場合、適用法令と支払済み契約上の権利に従いサービスを制限できます。誤った制限の申立てや違反報告は上記窓口で受け付けます。</p></section>
        <section id="billing"><h2>購入条件・月額プラン</h2><p>Basicは毎月60,000語、月額US$9.99、初月（30日間）はUS$4.99。Proは毎月260,000語、月額US$29.99、初月（30日間）はUS$14.99です。初回の有料契約のみ初月価格が適用され、以後は解約するまで通常月額で自動更新します。年払いは提供しません。税額・最終請求額は決済画面で確認してください。</p><p>両プランで原文を引用した説明、改善案、TXT保存とブラウザ印刷によるPDF保存を含む詳細レポートを利用できます。プランの違いは月度の語数です。日本語対応の単語分割で全文の語数を数え、成功した作成ごとに消費します。空白・句読点は含めません。再作成は再度消費します。失敗時は利用枠を返します。未使用枠の繰り越しはありません。1回100〜10,000文字です。</p><p>「契約・解約を管理」から更新を停止できます。解約後も支払済みの有効期間終了までは利用できます。新規契約の重複購入はできません。Basic・Proの変更を希望する場合は既存契約の更新を停止し、終了後に新しいプランを購入してください。初月割引は再適用されません。返金は決済画面のサポート窓口から申請できます。適用法令・決済サービスの条件に従い処理され、自動的な返金保証はありません。</p></section><h2>外部サービスのデータ処理方針</h2><p>モデル機能の利用前に、ツールに表示される提供元を確認してください。</p><ul className="source-links"><li><a href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html">DeepSeekのプライバシーポリシー</a></li><li><a href="https://copyleaks.com/legal/privacypolicy">Copyleaksのプライバシーポリシー</a></li></ul>
      </> : <>
        <p>AIチェッカーは、日本語の文章に見られる文体の規則性や反復を確認するツールです。チェックはホームの入力欄で行えます。</p>
        <h2>無料でチェックする</h2><ol className="source-links"><li>100〜10,000文字の文章を貼り付けるか、TXT・Word（.docx）ファイルを読み込みます。</li><li>送信先を確認し、「無料でチェックする」を押します。</li><li>総合スコアと、構成・表現・具体性・一貫性の4項目を確認します。</li></ol><p>無料チェックは登録不要で、回数制限があります。本文をDeepSeekへ送り、入力と生成結果をWaffoで内容確認します。材料が足りない場合は総合スコアを保留します。送信前に<a href="/privacy/">プライバシーポリシー</a>をご確認ください。</p>
        <h2>詳細レポートを読む</h2><p>Basic・Proでは、全体の評価、気になる一文、その理由と改善案を確認できます。問題のない箇所は「そのまま残してよいところ」にまとめています。改善が必要な場合に書き換え例を提案します。すべての文章に修正を勧めるわけではありません。</p><p>作成時は無料チェックとは別に全文を送信し、成功した全文の語数を月間枠から消費します。確認できなかった箇所はその旨を表示します。書き換え例は自動適用されません。「TXT保存」または「印刷 / PDF保存」で保存できます。入力変更・再読み込みで結果は消えます。</p>
        <h2>スコアを読むときの確認ポイント</h2><p>AIレビューはモデルによる参考評価です。スコアはAI生成確率や、ChatGPTを使用した証拠ではありません。人が書いた定型文にも規則性があり、翻訳や書き直しによって特徴は変わります。</p><h3>レポート・作文の例</h3><p>同じ文末が続いていても、それだけでAI使用とは判断できません。引用元、事実関係、下書きや修正履歴を併せて確認してください。</p><h3>ブログ・記事の例</h3><p>「重要な役割を果たしています」と指摘された場合は、前後の文脈と具体例を確認します。必要な表現は残し、スコアを下げることだけを目的に書き換えないでください。</p>
        <h2>分析方法と参考資料</h2><p>既知の正解データに対する検出精度は検証していません。DeepSeekレビューは文章生成APIによる補助評価で、専用のAI検出器ではありません。ウェブ上の文章との照合や盗作判定も行いません。</p><ul className="source-links"><li><a href="https://api-docs.deepseek.com/api/create-chat-completion">DeepSeek API公式ドキュメント</a>：レビューに使う文章生成APIの仕様。</li><li><a href="https://github.com/eric-mitchell/detect-gpt">DetectGPTの研究実装</a>：モデルの確率を利用した研究。当サイトではこの手法は実装していません。</li></ul>
      </>}
      <p><a className="text-link" href="/#checker">無料のAIチェッカーで文章をチェックする →</a></p>
    </article></main>
    <footer className="site-footer"><a href="/">AIチェッカー</a><div className="footer-links"><a href="/ai-checker/guide/">使い方ガイド</a><a href="/privacy/">プライバシー・利用条件</a></div><FooterBadges /></footer>
  </>;
}
