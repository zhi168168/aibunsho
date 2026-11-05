import { policies } from './App';

export const pages = [
  { path: '/ai-checker/guide/', title: 'AIチェッカーの使い方・スコアの読み方｜日本語文章ガイド', description: 'AIチェッカーの入力方法、文章分析とAIレビューの違い、スコアの限界を解説。日本語のレポートや記事を見直す具体例と参考資料を確認できます。' },
  { path: '/privacy/', title: 'プライバシーポリシー・利用条件｜AIチェッカー', description: 'AIチェッカーの入力文章の扱い、外部サービスへの送信、保存方針と利用条件を説明します。文章分析とモデル機能の違いをご確認ください。' },
];

export function InformationPage({ path }: { path: string }) {
  const page = pages.find(page => page.path === path)!;
  return <>
    <header className="site-header"><a href="/">AIチェッカー</a><nav className="information-nav" aria-label="ページナビゲーション"><a href="/ai-checker/guide/">使い方ガイド</a><a href="/privacy/">プライバシー</a></nav></header>
    <main className="main-container information-page"><article className="section guide-section">
      <p><a href="/">AIチェッカー ホーム</a> / {path === '/privacy/' ? 'プライバシーと利用条件' : '使い方ガイド'}</p>
      <h1>{page.title.split('｜')[0]}</h1>
      {path === '/privacy/' ? <>
        <p>無料の文章分析と、外部サービスを利用するモデル機能では、入力文章の処理場所が異なります。</p>
        {Object.entries(policies).map(([key, value]) => <section key={key} id={key}><h2>{value.title}</h2><p>{value.content}</p></section>)}
        <h2>外部サービスのデータ処理方針</h2><p>モデル機能の利用前に、ツールに表示される提供元を確認してください。</p><ul className="source-links"><li><a href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html">DeepSeekのプライバシーポリシー</a></li><li><a href="https://copyleaks.com/legal/privacypolicy">Copyleaksのプライバシーポリシー</a></li></ul>
      </> : <>
        <p>AIチェッカーは、日本語の文章に見られる文体の規則性や反復を確認するツールです。チェックはホームの入力欄で行えます。</p>
        <h2>文章を入力して分析する</h2><ol className="source-links"><li>100〜10,000文字の文章を貼り付けるか、TXTファイルを読み込みます。統計分析には300文字以上・3文以上をおすすめします。</li><li>「文章分析」を選んでチェックします。文の長さ、定型表現、文末、文頭、語句の偏り、段落や隣接文の反復など8指標をブラウザ内で分析します。</li><li>全体の傾向と文ごとの根拠を確認し、必要に応じてレポートを保存します。</li></ol>
        <h2>文章分析とAIレビューの違い</h2><p>文章分析は無料・登録不要で、入力文章を外部送信しません。AIレビューは文章をサーバー経由でDeepSeekへ送り、構成・表現・具体性・一貫性の4項目について、原文の根拠と別の解釈を比較します。材料不足では総合スコアを保留します。モデル機能の提供状況と回数制限はツール内に表示されます。</p><p>送信前に<a href="/privacy/">プライバシーポリシーと利用条件</a>を確認し、機密情報や個人情報を含む文章の送信は避けてください。</p>
        <h2>詳細レポートを作成・保存する</h2><p>ホームの「詳細レポートを作成」から、区分別の原文引用・解説・改善案と8つの観測指標をまとめたレポートを作れます。通常レビューとは別に全文をDeepSeekへ送り、1回の利用として数えます。現在は無料提供で回数制限があります。長い段落は分割し、多数の短い段落はまとめて最大16区分にします。</p><p>原文と一致する引用を取得できない区分は未取得と表示します。書き換え例は引用部分だけの提案で、自動適用されません。事実や意味を確認してください。「TXT保存」で全文を保存でき、「印刷 / PDF保存」からブラウザの印刷画面でPDFに保存できます。レポートはこのページのメモリ内のみで保持し、入力変更・モード切替・再読み込みで消えるため、必要な結果は保存してください。</p>
        <h2>スコアを読むときの確認ポイント</h2><p>統計スコアは文章の規則性、AIレビューはモデルによる参考評価です。いずれもAI生成確率や、ChatGPTを使用した証拠ではありません。人が書いた定型文にも規則性があり、翻訳や書き直しによって特徴は変わります。</p><h3>レポート・作文の例</h3><p>同じ文末が続いていても、それだけでAI使用とは判断できません。引用元、事実関係、下書きや修正履歴を併せて確認してください。</p><h3>ブログ・記事の例</h3><p>「重要な役割を果たしています」と指摘された場合は、前後の文脈と具体例を確認します。必要な表現は残し、スコアを下げることだけを目的に書き換えないでください。</p>
        <h2>分析方法と参考資料</h2><p>文章分析は当サイト独自の統計ルールです。既知の正解データに対する検出精度は検証していません。DeepSeekレビューは文章生成APIによる補助評価で、専用のAI検出器ではありません。ウェブ上の文章との照合や盗作判定も行いません。</p><ul className="source-links"><li><a href="https://api-docs.deepseek.com/api/create-chat-completion">DeepSeek API公式ドキュメント</a>：レビューに使う文章生成APIの仕様。</li><li><a href="https://github.com/eric-mitchell/detect-gpt">DetectGPTの研究実装</a>：モデルの確率を利用した研究。当サイトの統計分析とは異なり、この手法は実装していません。</li></ul>
      </>}
      <p><a className="text-link" href="/#checker">無料のAIチェッカーで文章をチェックする →</a></p>
    </article></main>
    <footer className="site-footer"><a href="/">AIチェッカー</a><div className="footer-links"><a href="/ai-checker/guide/">使い方ガイド</a><a href="/privacy/">プライバシー・利用条件</a></div></footer>
  </>;
}
